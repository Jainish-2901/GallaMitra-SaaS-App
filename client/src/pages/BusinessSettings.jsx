import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';
import { 
  User, 
  Image as ImageIcon, 
  Phone, 
  PenTool, 
  Settings, 
  Check, 
  AlertTriangle,
  Building2,
  Mail,
  ShieldCheck,
  Globe
} from 'lucide-react';

export default function BusinessSettings() {
  const { activeShop, updateShopSettings, deleteBusinessWorkspace } = useContext(AppContext);
  const toast = useToast();
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  const [editBusinessName, setEditBusinessName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBusinessPhone, setEditBusinessPhone] = useState('');
  const [editBusinessEmail, setEditBusinessEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editState, setEditState] = useState('');
  const [editVpa, setEditVpa] = useState('');
  const [editBankDetails, setEditBankDetails] = useState('');
  const [editInvoiceTerms, setEditInvoiceTerms] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null); // 'logo' | 'signature' | null
  const canvasRef = useRef(null);

  const uploadToCloudinary = async (fileOrBase64) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dopmlnvyg';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    
    const formData = new FormData();
    formData.append('file', fileOrBase64);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Upload failed');
    }
    
    const data = await res.json();
    return data.secure_url;
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(type);
    toast.info(`Uploading ${type} to Cloudinary...`);
    try {
      const url = await uploadToCloudinary(file);
      if (type === 'logo') {
        setEditLogo(url);
        toast.success('Logo uploaded successfully!');
      } else if (type === 'signature') {
        const res = await updateShopSettings({ signatureUrl: url });
        if (res?.success !== false) {
          toast.success('Signature uploaded and saved to workspace!');
        } else {
          toast.error('Failed to save signature URL.');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  useEffect(() => {
    if (activeShop) {
      setEditBusinessName(activeShop.businessName || '');
      setEditOwnerName(activeShop.ownerName || '');
      setEditLogo(activeShop.logoUrl || '');
      setEditAddress(activeShop.address || '');
      setEditBusinessPhone(activeShop.businessPhone || activeShop.phone || '');
      setEditBusinessEmail(activeShop.businessEmail || activeShop.email || '');
      setEditGstin(activeShop.gstin || '');
      setEditState(activeShop.state || '');
      setEditVpa(activeShop.vpa || '');
      setEditBankDetails(activeShop.bankDetails || '');
      setEditInvoiceTerms(activeShop.invoiceTerms || '');
    }
  }, [activeShop]);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [activeShop?.signatureUrl]);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches?.[0]) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    setUploadingImage('signature');
    toast.info('Uploading canvas signature to Cloudinary...');
    try {
      const url = await uploadToCloudinary(dataUrl);
      const res = await updateShopSettings({ signatureUrl: url });
      if (res?.success !== false) toast.success('Signature saved to workspace!');
      else toast.error('Failed to save signature.');
    } catch (err) {
      console.error(err);
      toast.error(`Cloudinary upload failed: ${err.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  const resetForm = () => {
    if (activeShop) {
      setEditBusinessName(activeShop.businessName || '');
      setEditOwnerName(activeShop.ownerName || '');
      setEditLogo(activeShop.logoUrl || '');
      setEditAddress(activeShop.address || '');
      setEditBusinessPhone(activeShop.businessPhone || activeShop.phone || '');
      setEditBusinessEmail(activeShop.businessEmail || activeShop.email || '');
      setEditGstin(activeShop.gstin || '');
      setEditState(activeShop.state || '');
      setEditVpa(activeShop.vpa || '');
      setEditBankDetails(activeShop.bankDetails || '');
      setEditInvoiceTerms(activeShop.invoiceTerms || '');
      toast.info('Form details reset.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await updateShopSettings({
      businessName: editBusinessName,
      ownerName: editOwnerName,
      logoUrl: editLogo,
      address: editAddress,
      businessPhone: editBusinessPhone,
      businessEmail: editBusinessEmail,
      gstin: editGstin,
      state: editState,
      vpa: editVpa,
      bankDetails: editBankDetails,
      invoiceTerms: editInvoiceTerms,
    });
    if (res?.success !== false) toast.success('Business settings updated successfully! 💾');
    else toast.error('Failed to update settings. Please retry.');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-6xl mx-auto space-y-6 pb-12"
    >
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.bizSettingsTitle || 'Business Meta Settings'}</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">
            Configure workspace branding, localization labels, contact profiles, signatures, and UPI invoicing metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl self-start sm:self-center">
          <ShieldCheck size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
            Workspace Configuration
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Business Profile & Signatures */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Card 1: Business Identity */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 size={16} className="text-slate-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Business Identity
                </h3>
              </div>

              {/* Logo Upload Center */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                <div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                  {editLogo ? (
                    <img src={editLogo} alt="Logo" className="w-full h-full object-contain p-1 bg-white" />
                  ) : (
                    <div className="text-xl font-black text-blue-600 font-mono">
                      {editBusinessName ? editBusinessName.charAt(0).toUpperCase() : 'GM'}
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    Workspace Logo
                  </p>
                  {editLogo ? (
                    <button
                      type="button"
                      onClick={() => setEditLogo('')}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer"
                    >
                      Remove Logo
                    </button>
                  ) : (
                    <label className="inline-block bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
                      {uploadingImage === 'logo' ? 'Uploading...' : 'Upload Logo'}
                      <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, 'logo')} disabled={!!uploadingImage} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Name</label>
                  <input 
                    required 
                    value={editBusinessName} 
                    onChange={e => setEditBusinessName(e.target.value)} 
                    placeholder={t.bizNameInput}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Owner Name</label>
                  <input 
                    required 
                    value={editOwnerName} 
                    onChange={e => setEditOwnerName(e.target.value)} 
                    placeholder={t.ownerNameInput}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Phone</label>
                    <input 
                      type="text" 
                      value={editBusinessPhone} 
                      onChange={e => setEditBusinessPhone(e.target.value)} 
                      placeholder="Phone" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business Email</label>
                    <input 
                      type="email" 
                      value={editBusinessEmail} 
                      onChange={e => setEditBusinessEmail(e.target.value)} 
                      placeholder="Email" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Billing Address</label>
                  <textarea 
                    value={editAddress} 
                    onChange={e => setEditAddress(e.target.value)} 
                    rows={3} 
                    placeholder="Business Address / Billing location..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white resize-y transition-all" 
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Canvas Signatures */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <PenTool size={16} className="text-slate-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Signature Center
                </h3>
              </div>

              {activeShop?.signatureUrl && (
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full">
                  <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shrink-0">
                    <img src={activeShop.signatureUrl} alt="Signature" className="h-10 object-contain" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Signature Active</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to delete your signature?")) {
                          const res = await updateShopSettings({ signatureUrl: null });
                          if (res?.success !== false) {
                            toast.success("Signature deleted successfully!");
                          } else {
                            toast.error("Failed to delete signature.");
                          }
                        }
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer"
                    >
                      Delete Signature
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.drawSig || 'Draw Signature Canvas'}
                  </label>
                  <div className="border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      width={350} height={120}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                      className="w-full cursor-crosshair bg-white font-mono text-[10px]"
                    />
                    <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-t border-slate-200">
                      <button 
                        type="button" 
                        onClick={clearCanvas} 
                        className="text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest font-mono cursor-pointer"
                      >
                        {t.clearCanvas}
                      </button>
                      <button 
                        type="button" 
                        onClick={saveSignature} 
                        disabled={!!uploadingImage} 
                        className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest font-mono disabled:opacity-50 cursor-pointer"
                      >
                        {t.saveSig}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Or Upload PNG Copy</span>
                  <label className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors shadow-xs shrink-0 font-mono">
                    {uploadingImage === 'signature' ? 'Uploading...' : 'Upload File'}
                    <input type="file" accept="image/png" onChange={(e) => handleImageUpload(e, 'signature')} disabled={!!uploadingImage} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Billing, Financials & Actions */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card 1: Billing & Invoicing Details */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Settings size={16} className="text-slate-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Tax & Financial Configuration
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN Number</label>
                    <input 
                      type="text" 
                      value={editGstin} 
                      onChange={e => setEditGstin(e.target.value)} 
                      placeholder="GSTIN (e.g. 24AAAAB1111C1Z0)" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Business State</label>
                    <input 
                      type="text" 
                      value={editState} 
                      onChange={e => setEditState(e.target.value)} 
                      placeholder="State (e.g. Gujarat)" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">UPI VPA Address</label>
                  <input 
                    type="text" 
                    value={editVpa} 
                    onChange={e => setEditVpa(e.target.value)} 
                    placeholder="UPI VPA (merchant@upi)" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-950 focus:bg-white transition-all" 
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5 leading-relaxed">
                    Used to generate print-ready dynamic payment QR codes on sale bills and payment vouchers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bank Account Details</label>
                    <textarea 
                      value={editBankDetails} 
                      onChange={e => setEditBankDetails(e.target.value)} 
                      rows={4} 
                      placeholder="Bank Details..." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-mono focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white resize-y transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invoice Terms & Conditions</label>
                    <textarea 
                      value={editInvoiceTerms} 
                      onChange={e => setEditInvoiceTerms(e.target.value)} 
                      rows={4} 
                      placeholder="Invoice Terms..." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white resize-y transition-all" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Form Action Triggers */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={resetForm}
                className="bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold px-6 py-3 rounded-2xl text-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {t.cancelBtn || 'Cancel'}
              </button>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3 rounded-2xl text-xs shadow-md shadow-blue-500/10 transition-all active:scale-[0.98] cursor-pointer"
              >
                Submit Changes
              </button>
            </div>

            {/* Card 3: Danger Zone */}
            <div className="bg-rose-50/40 border border-rose-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex gap-3">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider font-mono">Danger Zone: Delete Workspace</h4>
                  <p className="text-rose-600/80 text-[10px] font-semibold mt-1 leading-relaxed max-w-md">
                    Delete <strong>{activeShop?.businessName}</strong> and all transaction ledgers permanently. This action is irreversible.
                  </p>
                </div>
              </div>
              <div className="border-t border-rose-100 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const confirm1 = window.confirm(`⚠️ WARNING: Are you sure you want to permanently delete the business "${activeShop?.businessName}"? This will erase all ledger logs, invoices, and contact data forever.`);
                    if (!confirm1) return;
                    
                    const typedName = window.prompt(`🚨 FINAL CONFIRMATION: Type the business name "${activeShop?.businessName}" to confirm deletion:`);
                    if (typedName !== activeShop?.businessName) {
                      toast.error("Business name did not match. Deletion cancelled.");
                      return;
                    }

                    const res = await deleteBusinessWorkspace(activeShop.id);
                    if (res.success) {
                      toast.success(res.message);
                    } else {
                      toast.error(res.error);
                    }
                  }}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-3 rounded-2xl text-[10px] uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer active:scale-95 text-center"
                >
                  Delete Workspace
                </button>
              </div>
            </div>

          </div>

        </div>
      </form>
    </motion.div>
  );
}
