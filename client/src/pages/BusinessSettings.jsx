import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';

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
    console.log('☁️ Cloudinary Upload Config:', { cloudName, uploadPreset });
    
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-base font-black text-slate-900">{t.bizSettingsTitle}</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Configure logos, contact details and canvas signatures</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business & Owner Profile Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.bizNameInput} *</label>
              <input required value={editBusinessName} onChange={e => setEditBusinessName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.ownerNameInput} *</label>
              <input required value={editOwnerName} onChange={e => setEditOwnerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Phone</label>
              <input type="text" value={editBusinessPhone} onChange={e => setEditBusinessPhone(e.target.value)} placeholder="+91 9999999999" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Email</label>
              <input type="email" value={editBusinessEmail} onChange={e => setEditBusinessEmail(e.target.value)} placeholder="info@myshop.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shop Address</label>
            <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} rows={2} placeholder="Billing address for invoices..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white resize-none transition-all" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
              <input type="text" value={editGstin} onChange={e => setEditGstin(e.target.value)} placeholder="24AAAAB1111C1Z0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State / UT</label>
              <input type="text" value={editState} onChange={e => setEditState(e.target.value)} placeholder="Gujarat" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">UPI ID (VPA)</label>
              <input type="text" value={editVpa} onChange={e => setEditVpa(e.target.value)} placeholder="merchant@upi" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white transition-all" />
            </div>
          </div>

          {/* Invoicing Extras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Account Details (Invoicing)</label>
              <textarea value={editBankDetails} onChange={e => setEditBankDetails(e.target.value)} rows={2} placeholder="Bank Name: SBI&#10;A/C: 1234567890&#10;IFSC: SBIN0001234" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white resize-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Terms & Conditions</label>
              <textarea value={editInvoiceTerms} onChange={e => setEditInvoiceTerms(e.target.value)} rows={2} placeholder="1. Subject to local jurisdiction.&#10;2. Goods once sold cannot be returned." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white resize-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Logo</label>
            {editLogo ? (
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 w-full">
                <img 
                  src={editLogo} 
                  alt="Business Logo" 
                  className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Logo Active</p>
                  <button
                    type="button"
                    onClick={() => setEditLogo('')}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all flex items-center gap-1"
                  >
                    Remove Logo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50">
                <span className="text-xs text-slate-400 font-medium">No logo uploaded yet</span>
                <label className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {uploadingImage === 'logo' ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, 'logo')} disabled={!!uploadingImage} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Signature Canvas / Upload options */}
          <div className="border-t pt-5">
            {activeShop?.signatureUrl ? (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Saved Business Signature</label>
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 w-full max-w-sm">
                  <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center">
                    <img src={activeShop.signatureUrl} alt="Signature" className="h-12 object-contain" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 font-mono block mb-1">Signature Active</span>
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
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all"
                    >
                      Delete Signature
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.drawSig}</label>
                  <label className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-colors w-max">
                    {uploadingImage === 'signature' ? 'Uploading...' : 'Upload Signature PNG'}
                    <input type="file" accept="image/png" onChange={(e) => handleImageUpload(e, 'signature')} disabled={!!uploadingImage} className="hidden" />
                  </label>
                </div>
                <div className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden w-full max-w-full sm:max-w-sm">
                  <canvas
                    ref={canvasRef}
                    width={350} height={120}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                    className="w-full cursor-crosshair bg-white"
                  />
                  <div className="bg-slate-100 px-3 py-2 flex justify-between items-center border-t border-slate-200">
                    <button type="button" onClick={clearCanvas} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider">{t.clearCanvas}</button>
                    <button type="button" onClick={saveSignature} disabled={!!uploadingImage} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider disabled:opacity-50">{t.saveSig}</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md mt-4 transition-all">
            {t.saveSettings} 💾
          </button>
        </form>

        {/* Danger Zone: Delete Workspace */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mt-6 space-y-4">
          <div className="border-b border-rose-100 pb-3">
            <h3 className="text-sm font-black text-rose-900">Danger Zone: Delete Workspace</h3>
            <p className="text-rose-600 text-xs mt-0.5 font-medium">
              This will permanently delete the workspace <strong>{activeShop?.businessName}</strong> and all its associated data (ledgers, invoices, customers, suppliers). This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end">
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
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              Delete Business Permanently
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
