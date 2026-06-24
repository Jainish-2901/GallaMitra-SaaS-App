import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { Package, Trash2, Edit2, Plus, X, IndianRupee, Check, AlertTriangle } from 'lucide-react';

const UQC_OPTIONS = [
  { value: 'NOS', label: 'NOS (Numbers)' },
  { value: 'PCS', label: 'PCS (Pieces)' },
  { value: 'KGS', label: 'KGS (Kilograms)' },
  { value: 'LTR', label: 'LTR (Liters)' },
  { value: 'BOX', label: 'BOX (Boxes)' },
  { value: 'MTR', label: 'MTR (Meters)' },
  { value: 'BAG', label: 'BAG (Bags)' },
  { value: 'CUSTOM', label: 'Other / Custom' }
];

export default function ProductManagement() {
  const { products, addProductRecord, updateProductRecord, removeProductRecord, loading } = useContext(AppContext);
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Add product form state
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [productType, setProductType] = useState('goods'); // 'goods' or 'service'
  const [pHsnCode, setPHsnCode] = useState('');
  const [pSacCode, setPSacCode] = useState('');
  const [pUqc, setPUqc] = useState('NOS');
  const [pCustomUqc, setPCustomUqc] = useState('');
  const [pCurrentStock, setPCurrentStock] = useState('');
  const [pMinStockLevel, setPMinStockLevel] = useState('');
  const [pAverageCostPrice, setPAverageCostPrice] = useState('');

  // Inline Stock adjustment state
  const [adjustments, setAdjustments] = useState({});

  // Modals visibility states
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.sacCode && p.sacCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pName.trim()) {
      toast.warning('Product name is required');
      return;
    }

    const uqcValue = pUqc === 'CUSTOM' ? pCustomUqc.trim().toUpperCase() : pUqc;

    const extraDetails = {
      hsnCode: productType === 'goods' ? (pHsnCode.trim() || null) : null,
      sacCode: productType === 'service' ? (pSacCode.trim() || null) : null,
      uqc: productType === 'goods' ? (uqcValue || 'NOS') : 'NOS',
      currentStock: productType === 'goods' ? parseFloat(pCurrentStock || 0) : 0,
      minStockLevel: productType === 'goods' ? parseFloat(pMinStockLevel || 0) : 0,
      averageCostPrice: productType === 'goods' ? parseFloat(pAverageCostPrice || 0) : 0
    };

    const res = await addProductRecord(pName.trim(), parseFloat(pPrice || 0), pDescription.trim(), extraDetails);
    if (res?.success) {
      toast.success(`Product "${pName}" added successfully!`);
      setPName('');
      setPPrice('');
      setPDescription('');
      setPHsnCode('');
      setPSacCode('');
      setPUqc('NOS');
      setPCustomUqc('');
      setPCurrentStock('');
      setPMinStockLevel('');
      setPAverageCostPrice('');
    } else {
      toast.error(res?.error || 'Failed to add product. Please retry.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct.name.trim()) {
      toast.warning('Product name is required');
      return;
    }

    const type = editingProduct.productType || 'goods';
    const uqcValue = editingProduct.uqc === 'CUSTOM' ? editingProduct.customUqc?.trim().toUpperCase() : editingProduct.uqc;

    const extraDetails = {
      hsnCode: type === 'goods' ? (editingProduct.hsnCode?.trim() || null) : null,
      sacCode: type === 'service' ? (editingProduct.sacCode?.trim() || null) : null,
      uqc: type === 'goods' ? (uqcValue || 'NOS') : 'NOS',
      currentStock: type === 'goods' ? parseFloat(editingProduct.currentStock || 0) : 0,
      minStockLevel: type === 'goods' ? parseFloat(editingProduct.minStockLevel || 0) : 0,
      averageCostPrice: type === 'goods' ? parseFloat(editingProduct.averageCostPrice || 0) : 0
    };

    const res = await updateProductRecord(
      editingProduct.id,
      editingProduct.name.trim(),
      parseFloat(editingProduct.price || 0),
      editingProduct.description?.trim() || '',
      extraDetails
    );
    if (res?.success) {
      toast.success('Product updated successfully!');
      setEditingProduct(null);
    } else {
      toast.error(res?.error || 'Failed to update product. Please retry.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"? Existing invoices and bills containing this item will keep their copies, but it will be removed from your autocomplete list.`)) return;
    const res = await removeProductRecord(id);
    if (res?.success) {
      toast.success(`Product "${name}" deleted.`);
    } else {
      toast.error(res?.error || 'Failed to delete product.');
    }
  };

  const handleStockAdjustment = async (id, name) => {
    const adj = adjustments[id];
    if (!adj || isNaN(parseFloat(adj))) {
      toast.warning('Enter a valid stock adjustment quantity');
      return;
    }
    const val = parseFloat(adj);
    const res = await updateProductRecord(id, undefined, undefined, undefined, { stockAdjustment: val });
    if (res?.success) {
      toast.success(`Stock for "${name}" adjusted by ${val > 0 ? '+' : ''}${val}`);
      setAdjustments(prev => ({ ...prev, [id]: '' }));
    } else {
      toast.error(res?.error || 'Failed to adjust stock');
    }
  };

  const openEditModal = (product) => {
    const isService = !!product.sacCode;
    const isCustomUqc = product.uqc && !['NOS', 'PCS', 'KGS', 'LTR', 'BOX', 'MTR', 'BAG'].includes(product.uqc);
    
    setEditingProduct({
      ...product,
      productType: isService ? 'service' : 'goods',
      uqc: isCustomUqc ? 'CUSTOM' : (product.uqc || 'NOS'),
      customUqc: isCustomUqc ? product.uqc : '',
      hsnCode: product.hsnCode || '',
      sacCode: product.sacCode || '',
      currentStock: parseFloat(product.currentStock || 0),
      minStockLevel: parseFloat(product.minStockLevel || 0),
      averageCostPrice: parseFloat(product.averageCostPrice || 0)
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm h-fit">
        <h3 className="text-xs font-black text-slate-900 uppercase border-b pb-2 tracking-wider mb-4">Add Item to Catalog</h3>
        
        {/* Product Type Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setProductType('goods')}
            className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
              productType === 'goods' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Physical Goods (HSN)
          </button>
          <button
            type="button"
            onClick={() => setProductType('service')}
            className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
              productType === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Services (SAC)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name *</label>
            <input
              type="text"
              value={pName}
              onChange={e => setPName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
              placeholder={productType === 'goods' ? "e.g. Parle-G 100g, Face Mask" : "e.g. Consulting Fee, Haircut"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Selling Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={pPrice}
                onChange={e => setPPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                placeholder="0.00"
              />
            </div>
            
            {productType === 'goods' ? (
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">HSN Code</label>
                <input
                  type="text"
                  value={pHsnCode}
                  onChange={e => setPHsnCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                  placeholder="e.g. 1905"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">SAC Code</label>
                <input
                  type="text"
                  value={pSacCode}
                  onChange={e => setPSacCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                  placeholder="e.g. 9983"
                />
              </div>
            )}
          </div>

          {productType === 'goods' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">UQC (Unit)</label>
                  <select
                    value={pUqc}
                    onChange={e => setPUqc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                  >
                    {UQC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                {pUqc === 'CUSTOM' && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Custom Unit Label</label>
                    <input
                      type="text"
                      value={pCustomUqc}
                      onChange={e => setPCustomUqc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                      placeholder="e.g. KANTA"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pCurrentStock}
                    onChange={e => setPCurrentStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pMinStockLevel}
                    onChange={e => setPMinStockLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pAverageCostPrice}
                    onChange={e => setPAverageCostPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={pDescription}
              onChange={e => setPDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold resize-none"
              placeholder="Specifications, unit notes, etc."
            />
          </div>

          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md mt-1 flex items-center justify-center gap-1.5 transition-colors">
            <Plus size={14} /> Save Product
          </button>
        </form>
      </div>

      {/* Product List */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search by name, description, HSN or SAC code..." />
        
        <div className="space-y-3 mt-4 max-h-[580px] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-200" />
                    <div className="space-y-1">
                      <div className="h-3 bg-slate-200 rounded w-24" />
                      <div className="h-2 bg-slate-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-slate-200 rounded w-12" />
                    <div className="h-6 bg-slate-200 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <Package className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-xs font-semibold text-slate-400">No catalog items found.</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const isLowStock = !product.sacCode && (parseFloat(product.currentStock || 0) <= parseFloat(product.minStockLevel || 0));
              return (
                <div key={product.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl gap-3 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 ${
                      product.sacCode ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                      <Package size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{product.name}</h4>
                        {product.hsnCode && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                            HSN: {product.hsnCode}
                          </span>
                        )}
                        {product.sacCode && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded">
                            SAC: {product.sacCode}
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          {product.description}
                        </p>
                      )}
                      
                      {!product.sacCode && (
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-medium">
                          <span>Avg Cost: <b className="text-slate-700">₹{parseFloat(product.averageCostPrice || 0).toFixed(2)}</b></span>
                          <span>Min Stock: <b className="text-slate-700">{parseFloat(product.minStockLevel || 0)} {product.uqc || 'NOS'}</b></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 flex-wrap md:flex-nowrap border-t md:border-t-0 pt-2.5 md:pt-0">
                    {/* Stock status indicator (for Goods only) */}
                    {!product.sacCode && (
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Stock</span>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full mt-0.5 flex items-center gap-1 ${
                            isLowStock
                              ? 'bg-rose-50 text-rose-600 border border-rose-100/50'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                          }`}>
                            {isLowStock && <AlertTriangle size={10} className="animate-bounce text-rose-500" />}
                            {parseFloat(product.currentStock || 0)} {product.uqc || 'NOS'}
                          </span>
                        </div>

                        {/* Inline Stock Adjustment widget */}
                        <div className="flex items-center gap-1 bg-slate-200/50 rounded-lg p-0.5 border border-slate-300/40">
                          <input
                            type="number"
                            step="any"
                            className="w-11 bg-white text-slate-800 text-[10px] font-bold text-center border border-slate-200 rounded py-0.5 px-0.5 focus:outline-none"
                            placeholder="+/-"
                            value={adjustments[product.id] || ''}
                            onChange={(e) => setAdjustments({ ...adjustments, [product.id]: e.target.value })}
                          />
                          <button
                            onClick={() => handleStockAdjustment(product.id, product.name)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold transition-colors"
                            title="Apply Stock Adjustment"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3.5 ml-auto md:ml-0">
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Selling Price</span>
                        <span className="text-xs font-black text-slate-800 font-mono flex items-center justify-end mt-0.5">
                          <IndianRupee size={11} className="mr-0.5" />
                          {parseFloat(product.price || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg text-blue-600 transition-colors"
                          title="Edit Catalog Item"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-rose-600 transition-colors"
                          title="Delete Catalog Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Modify Item Details</h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                {/* Product Type Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, productType: 'goods' })}
                    className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                      editingProduct.productType === 'goods' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Physical Goods (HSN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, productType: 'service' })}
                    className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                      editingProduct.productType === 'service' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Services (SAC)
                  </button>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Selling Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.price}
                      onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                    />
                  </div>
                  
                  {editingProduct.productType === 'goods' ? (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">HSN Code</label>
                      <input
                        type="text"
                        value={editingProduct.hsnCode}
                        onChange={e => setEditingProduct({ ...editingProduct, hsnCode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                        placeholder="e.g. 1905"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">SAC Code</label>
                      <input
                        type="text"
                        value={editingProduct.sacCode}
                        onChange={e => setEditingProduct({ ...editingProduct, sacCode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                        placeholder="e.g. 9983"
                      />
                    </div>
                  )}
                </div>

                {editingProduct.productType === 'goods' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">UQC (Unit)</label>
                        <select
                          value={editingProduct.uqc}
                          onChange={e => setEditingProduct({ ...editingProduct, uqc: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                        >
                          {UQC_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      {editingProduct.uqc === 'CUSTOM' && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Custom Unit Label</label>
                          <input
                            type="text"
                            value={editingProduct.customUqc || ''}
                            onChange={e => setEditingProduct({ ...editingProduct, customUqc: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                            placeholder="e.g. KANTA"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stock Level</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingProduct.currentStock}
                          onChange={e => setEditingProduct({ ...editingProduct, currentStock: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reorder Level</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingProduct.minStockLevel}
                          onChange={e => setEditingProduct({ ...editingProduct, minStockLevel: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Cost (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingProduct.averageCostPrice}
                          onChange={e => setEditingProduct({ ...editingProduct, averageCostPrice: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
