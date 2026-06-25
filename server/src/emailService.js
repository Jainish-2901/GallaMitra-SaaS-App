import nodemailer from 'nodemailer';
import dns from 'dns';
import { prisma } from './utils/prisma.js';

// Force Node to prefer IPv4 DNS resolution over IPv6 in email worker contexts
dns.setDefaultResultOrder('ipv4first');

const ipv4Lookup = (hostname, options, callback) => {
  return dns.lookup(hostname, { ...options, family: 4 }, callback);
};

// Helper to ensure display name is correctly quoted if it has spaces/dots and is not already quoted
const formatEmailFromField = (fromStr) => {
  if (!fromStr) return fromStr;
  const match = fromStr.match(/^([^<]+)<([^>]+)>$/);
  if (match) {
    let displayName = match[1].trim();
    const email = match[2].trim();
    if (displayName && (displayName.includes(' ') || displayName.includes('.')) && !displayName.startsWith('"') && !displayName.endsWith('"')) {
      displayName = `"${displayName}"`;
    }
    return `${displayName} <${email}>`;
  }
  return fromStr;
};

let cachedTransporter = null;
let cachedConfigKey = null;

// Helper to construct SMTP transporter dynamically from environment configuration
const getSmtpTransporter = async () => {
  try {
    const host = process.env.SMTP_HOST || '';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const rawFrom = process.env.SMTP_FROM || '"GallaMitra Support" <support.gallamitra@gmail.com>';
    const from = formatEmailFromField(rawFrom);

    if (!host || !user || !pass) {
      if (cachedTransporter) {
        try {
          console.log('🧹 Clearing cached SMTP transporter pool (config empty/removed)');
          cachedTransporter.close();
        } catch (e) {
          console.error('Error closing cached SMTP transporter:', e);
        }
        cachedTransporter = null;
        cachedConfigKey = null;
      }
      return null;
    }

    // Generate unique signature for caching
    const configKey = JSON.stringify({ host, port, secure, user, pass, from });

    if (cachedTransporter && cachedConfigKey === configKey) {
      return { transporter: cachedTransporter, from };
    }

    if (cachedTransporter) {
      try {
        console.log('🔄 SMTP Configuration changed. Closing old dynamic SMTP connection pool.');
        cachedTransporter.close();
      } catch (e) {
        console.error('Error closing old SMTP transporter pool:', e);
      }
    }

    // Perform manual DNS resolution forcing IPv4 to bypass Nodemailer internal IPv6 resolve attempts
    let resolvedHost = host;
    try {
      const ip = await new Promise((resolve, reject) => {
        dns.lookup(host, { family: 4 }, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      console.log(`🔍 DNS Lookup: Resolved SMTP host ${host} to IPv4 address: ${ip}`);
      resolvedHost = ip;
    } catch (dnsErr) {
      console.warn(`⚠️ DNS Lookup failed for SMTP host ${host}, falling back to hostname:`, dnsErr.message);
    }

    console.log(`📦 Initializing new dynamic SMTP transporter pool for ${user}@${resolvedHost}:${port} (secure: ${secure})`);

    const transporter = nodemailer.createTransport({
      host: resolvedHost,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 10000, // 10s
      greetingTimeout: 10000,    // 10s
      socketTimeout: 15000,      // 15s
      family: 4,
      lookup: ipv4Lookup,
      tls: {
        servername: host, // Ensure TLS SNI is matching the original domain
        rejectUnauthorized: true
      }
    });

    cachedTransporter = transporter;
    cachedConfigKey = configKey;

    return { transporter, from };
  } catch (err) {
    console.error('Error fetching SMTP config for transporter:', err);
    return null;
  }
};

export const processEmailQueue = async () => {
  try {
    // 1. Try to reserve one email atomically first to avoid spamming logs when queue is empty
    let reservedEmails = await prisma.$queryRaw`
      UPDATE "EmailQueue"
      SET "status" = 'processing', "attempts" = "attempts" + 1
      WHERE id = (
          SELECT id FROM "EmailQueue"
          WHERE "status" = 'pending' AND "attempts" < 3
          ORDER BY "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (!reservedEmails || reservedEmails.length === 0) {
      return; // Exit silently when there are no pending emails
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    let transporter = null;
    let from = formatEmailFromField(process.env.RESEND_FROM || 'onboarding@resend.dev');

    if (!resendApiKey) {
      const smtpConfig = await getSmtpTransporter();
      if (!smtpConfig) {
        console.log('⚠️ Neither SMTP credentials nor RESEND_API_KEY are configured. Reverting reserved email.');
        await prisma.emailQueue.update({
          where: { id: reservedEmails[0].id },
          data: { status: 'pending', attempts: { decrement: 1 } }
        });
        return;
      }
      transporter = smtpConfig.transporter;
      from = smtpConfig.from;
    } else {
      console.log('📬 RESEND_API_KEY detected. Routing email queue processing via Resend HTTP API.');
    }

    while (true) {
      const email = reservedEmails[0];
      const nextAttempts = email.attempts;
      let success = false;
      let errorMsg = null;

      // Send execution branch (Resend API vs standard Nodemailer SMTP)
      try {
        const isHtml = email.body.trim().startsWith('<');
        if (resendApiKey) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: from,
              to: email.toEmail,
              subject: email.subject,
              text: isHtml ? 'Please view this email in an HTML-compatible client.' : email.body,
              html: isHtml ? email.body : email.body.replace(/\n/g, '<br>')
            })
          });
          const resJson = await res.json();
          if (res.ok && resJson.id) {
            success = true;
          } else {
            throw new Error(resJson.message || `Resend API returned status ${res.status}`);
          }
        } else {
          await transporter.sendMail({
            from,
            to: email.toEmail,
            subject: email.subject,
            text: isHtml ? 'Please view this email in an HTML-compatible client.' : email.body,
            html: isHtml ? email.body : email.body.replace(/\n/g, '<br>')
          });
          success = true;
        }
      } catch (err) {
        errorMsg = err.message || 'Email dispatch failed';
        console.error(`❌ Email dispatch failed for queue item ${email.id}:`, err);
      }

      // Update queue status
      if (success) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            processedAt: new Date(),
            error: null
          }
        });
      } else {
        const statusVal = nextAttempts >= 3 ? 'failed' : 'pending';
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: statusVal,
            error: errorMsg,
            processedAt: new Date()
          }
        });
      }

      // Reserve next email
      reservedEmails = await prisma.$queryRaw`
        UPDATE "EmailQueue"
        SET "status" = 'processing', "attempts" = "attempts" + 1
        WHERE id = (
            SELECT id FROM "EmailQueue"
            WHERE "status" = 'pending' AND "attempts" < 3
            ORDER BY "createdAt" ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `;

      if (!reservedEmails || reservedEmails.length === 0) {
        break; // No more pending emails in queue
      }
    }
  } catch (err) {
    console.error('🚨 processEmailQueue crashed:', err);
  }
};

export const getSupportContacts = async () => {
  try {
    const adminSettings = await prisma.adminUser.findFirst({
      select: {
        supportPhone: true,
        supportEmail: true
      }
    });
    return {
      supportPhone: adminSettings?.supportPhone ? adminSettings.supportPhone : '+91 97732 72749',
      supportEmail: adminSettings?.supportEmail ? adminSettings.supportEmail : 'support.gallamitra@gmail.com',
      backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      adminUrl: process.env.ADMIN_URL || 'http://localhost:5001'
    };
  } catch (e) {
    console.error('Error fetching support settings:', e);
    return {
      supportPhone: '+91 97732 72749',
      supportEmail: 'support.gallamitra@gmail.com',
      backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      adminUrl: process.env.ADMIN_URL || 'http://localhost:5001'
    };
  }
};

export const sendNotificationEmail = async (to, subject, text, html) => {
  console.log(`📧 Queueing email to: ${to} | Subject: ${subject}`);

  const content = html || text;

  try {
    await prisma.emailQueue.create({
      data: {
        toEmail: to.toLowerCase().trim(),
        subject,
        body: content,
        status: 'pending'
      }
    });

    // Process queue asynchronously in background (don't block web request)
    processEmailQueue().catch(err => console.error('🚨 Error processing email queue:', err));
    return true;
  } catch (error) {
    console.error('🚨 Failed to queue notification email:', error);
    return false;
  }
};

export const generateHtmlEmail = ({ title, greeting, leadText, details, actionUrl, actionText, supportEmail, supportPhone }) => {
  const fUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const sEmail = supportEmail || 'support.gallamitra@gmail.com';
  const sPhone = supportPhone || '+91 97732 72749';
  const logoUrl = fUrl.includes('localhost')
    ? 'https://raw.githubusercontent.com/Jainish-2901/GallaMitra-SaaS-App/main/client/public/logo.png'
    : `${fUrl}/logo.png`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 32px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .logo span {
      color: #3b82f6;
    }
    .content {
      padding: 32px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .greeting {
      font-size: 16px;
      line-height: 24px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .lead-text {
      font-size: 15px;
      line-height: 24px;
      color: #475569;
      margin-bottom: 24px;
    }
    .details-box {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-right: 12px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 16px 0;
    }
    .btn {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      line-height: 18px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="GallaMitra Logo" style="height: 50px; margin-bottom: 12px; object-fit: contain; vertical-align: middle;" />
        <div class="logo">Galla<span>Mitra</span></div>
      </div>
      <div class="content">
        <h2 class="title">${title}</h2>
        <div class="greeting">${greeting}</div>
        <p class="lead-text">${leadText}</p>
        
        ${details && details.length > 0 ? `
          <div class="details-box">
            ${details.map(d => `
              <div class="detail-row">
                <span class="detail-label" style="display:inline-block; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-right:10px;">${d.label}</span>
                <span class="detail-value" style="display:inline-block; font-size:14px; font-weight:600; color:#0f172a; text-align:right;">${d.value}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${actionUrl ? `
          <div class="btn-container">
            <a href="${actionUrl}" class="btn" target="_blank" style="color: #ffffff !important;">${actionText || 'Click Here'}</a>
          </div>
        ` : ''}
      </div>
      <div class="footer">
        <p>If you have any questions, feel free to contact our support team at <a href="mailto:${sEmail}">${sEmail}</a> or call us at <a href="tel:${sPhone.replace(/\s+/g, '')}">${sPhone}</a>.</p>
        <p>&copy; 2026 GallaMitra ERP. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Periodically scan and clean/re-attempt the queue every 30 seconds
setInterval(() => {
  processEmailQueue().catch(err => console.error('🚨 Error in periodic email queue scanner:', err));
}, 30000);

export const verifySmtpConnection = async ({ host, port, secure, user, pass }) => {
  console.log(`📡 SMTP Connection Test requested for user: ${user} on host: ${host}:${port} (secure: ${secure})`);
  
  let resolvedHost = host;
  try {
    const ip = await new Promise((resolve, reject) => {
      dns.lookup(host, { family: 4 }, (err, address) => {
        if (err) reject(err);
        else resolve(address);
      });
    });
    console.log(`🔍 DNS Lookup (Test Conn): Resolved SMTP host ${host} to IPv4 address: ${ip}`);
    resolvedHost = ip;
  } catch (dnsErr) {
    console.warn(`⚠️ DNS Lookup (Test Conn) failed for SMTP host ${host}, falling back to hostname:`, dnsErr.message);
  }

  const transporter = nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,    // 10s
    socketTimeout: 10000,      // 10s
    family: 4,
    lookup: ipv4Lookup,
    tls: {
      servername: host, // Ensure TLS SNI matches original domain
      rejectUnauthorized: true
    }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection test succeeded');
    return { success: true };
  } catch (error) {
    console.error('❌ SMTP connection test failed:', error);
    return { success: false, error: error.message || 'SMTP Connection verification failed' };
  } finally {
    try {
      transporter.close();
    } catch (e) {
      // ignore
    }
  }
};
