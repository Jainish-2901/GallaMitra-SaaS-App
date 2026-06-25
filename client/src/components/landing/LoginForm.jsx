import React, { useState, useContext, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Eye, EyeOff, ArrowRight, Key, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { AppContext } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function LoginForm({ onSwitchToRegister, onClose }) {
  const { loginShopOwner, requestForgotPasswordOtp, submitResetPassword, loading } = useContext(AppContext);
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [availShops, setAvailShops] = useState([]);
  const [error, setError] = useState('');

  // Password reset flow states: 'login' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Advanced Visuals States
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes dynamic countdown

  // Countdown timer clock engine
  useEffect(() => {
    if (mode !== 'reset' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, timeLeft]);

  // Dynamic Password Strength Meter
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-slate-200', text: 'text-slate-400' };

    let score = 0;
    if (newPassword.length >= 6) score++;
    if (/[A-Z]/.test(newPassword) || /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) return { score, label: 'Weak Password', color: 'bg-rose-500 w-1/3', text: 'text-rose-600' };
    if (score === 3) return { score, label: 'Medium Strength', color: 'bg-amber-500 w-2/3', text: 'text-amber-600' };
    return { score, label: 'Strong Security', color: 'bg-emerald-500 w-full', text: 'text-emerald-600' };
  }, [newPassword]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await loginShopOwner(email.trim(), password);
    if (res.success) {
      // Auto-select first shop if multiple
      if (res.shops && res.shops.length > 0) {
        const firstShop = res.shops[0];
        const shopRes = await loginShopOwner(email.trim(), password, firstShop.businessName);
        if (shopRes.success && shopRes.shop) {
          toast.success(`Welcome back! Logged into ${shopRes.shop.businessName}`);
          onClose?.();
          navigate('/', { replace: true });
          return;
        }
      }
      if (res.shop) {
        toast.success(`Welcome back! Logged into ${res.shop.businessName}`);
        onClose?.();
        navigate('/', { replace: true });
        return;
      }
      setError('Workspace not found.');
    } else if (res.pending) {
      toast.info('Your workspace registration is under review.');
      onClose?.();
    } else {
      setError(res.error || 'Login failed.');
      toast.error(res.error || 'Login failed.');
    }
  };

  const handleSelectShop = async (shop) => {
    setError('');
    const res = await loginShopOwner(email.trim(), password, shop.businessName);
    if (res.success && res.shop) {
      toast.success(`Welcome back! Logged into ${res.shop.businessName}`);
      onClose?.();
      navigate('/', { replace: true });
    } else if (res.pending) {
      toast.info('Your workspace registration is under review.');
      onClose?.();
    } else {
      setError(res.error || 'Failed to load workspace.');
      toast.error(res.error || 'Failed to load workspace.');
    }
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email.');

    setResetLoading(true);
    const res = await requestForgotPasswordOtp(email.trim());
    setResetLoading(false);

    if (res.success) {
      toast.success('Verification OTP code sent to your email.');
      setTimeLeft(120); // Reset clock to 2 mins cleanly
      setMode('reset');
    } else {
      setError(res.error || 'Failed to send OTP code.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || !newPassword.trim()) return setError('All fields are required.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');

    setResetLoading(true);
    const res = await submitResetPassword(email.trim(), otp.trim(), newPassword);
    setResetLoading(false);

    if (res.success) {
      toast.success('Password reset successfully! Please sign in with your new password.');
      setMode('login');
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2"
        >
          <span>⚠️</span> {error}
        </motion.div>
      )}

      {/* ── FLOW 1: Select workspace ── */}
      {availShops.length > 0 && mode === 'login' ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-600 text-center">Select a workspace to continue:</p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {availShops.map(s => (
              <button
                key={s.id}
                id={`workspace-select-${s.id}`}
                onClick={() => handleSelectShop(s)}
                disabled={loading}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left cursor-pointer"
              >
                <div>
                  <p className="font-bold text-slate-900 text-sm">{s.businessName}</p>
                  <p className="text-slate-400 text-[10px] font-mono">{s.ownerName}</p>
                </div>
                <ArrowRight size={14} className="text-slate-400" />
              </button>
            ))}
          </div>
          <button onClick={() => setAvailShops([])} className="w-full text-xs text-slate-500 hover:text-slate-700 font-bold py-1 transition-colors cursor-pointer">
            ← Back
          </button>
        </div>
      ) : mode === 'forgot' ? (
        /* ── FLOW 2: Forgot Password OTP Request ── */
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-3 leading-relaxed">
              Enter your registered email address below. We will send you a 6-digit OTP code to safely reset your workspace password.
            </p>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Registered Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-req-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@example.com"
                autoComplete="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            {resetLoading ? 'Requesting OTP...' : 'Send Password OTP'}
          </button>

          <button
            type="button"
            onClick={() => setMode('login')}
            className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mt-2 cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Sign In
          </button>
        </form>
      ) : mode === 'reset' ? (
        /* ── FLOW 3: Verify OTP & Reset Password with Real-Time Clocks & Meters ── */
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
            <p className="text-[10.5px] font-bold text-blue-700 flex items-center gap-1.5">
              <CheckCircle size={13} /> Code dispatched to {email}
            </p>
            {/* Dynamic 1-Minute Visual Clock Node */}
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200/60">
              <Clock size={11} className={timeLeft > 0 ? "animate-spin" : ""} style={{ animationDuration: '3s' }} />
              <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              6-Digit Verification OTP
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-otp-code"
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 123456"
                autoComplete="one-time-code"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono tracking-widest text-center"
              />
            </div>
          </div>

          {/* Secure Passwords Configuration Pack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* New Password field with Indicator Links */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showNewPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>

              {/* Strength Display Track */}
              {newPassword && (
                <div className="mt-1.5 space-y-1">
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} />
                  </div>
                  <span className={`text-[9px] font-black tracking-wide uppercase ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm New Password field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter"
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showConfirmPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            {resetLoading ? 'Resetting Password...' : 'Verify & Reset Password'}
          </button>

          {/* Dynamic Resend Loop Control */}
          <button
            type="button"
            disabled={timeLeft > 0 || resetLoading}
            onClick={() => handleRequestOtp(null)}
            className={`w-full text-center text-xs font-black tracking-wide uppercase ${timeLeft > 0 ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-blue-600 hover:text-blue-700 cursor-pointer'
              }`}
          >
            {timeLeft > 0 ? `Resend Code in ${timeLeft}s` : '← Resend OTP Code'}
          </button>
        </form>
      ) : (
        /* ── FLOW 4: Standard Login Form ── */
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Registered Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@example.com"
                autoComplete="username"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-12 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            {loading ? <span className="animate-pulse">Verifying...</span> : <><LogIn size={15} /> Sign In to Workspace</>}
          </button>

          <p className="text-center text-xs text-slate-500 font-medium">
            No account?{' '}
            <button type="button" onClick={onSwitchToRegister} className="text-blue-600 font-bold hover:underline cursor-pointer">
              Create workspace →
            </button>
          </p>
        </form>
      )}
    </div>
  );
}