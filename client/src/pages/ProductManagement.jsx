import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { Package, Trash2, Edit2, Plus, X, IndianRupee } from 'lucide-react';

export default function ProductManagement() {
  const { products, addProductRecord, updateProductRecord, removeProductRecord, loading } = useContext(AppContext);
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDescription, setPDescription] = useState('');

  // Modals visibility states
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pName.trim()) {
      toast.warning('Product name is required');
      return;
    }
    const res = await addProductRecord(pName.trim(), parseFloat(pPrice || 0), pDescription.trim());
    if (res?.success) {
      toast.success(`Product "${pName}" added successfully!`);
      setPName('');
      setPPrice('');
      setPDescription('');
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
    const res = await updateProductRecord(
      editingProduct.id,
      editingProduct.name.trim(),
      parseFloat(editingProduct.price || 0),
      editingProduct.description?.trim() || ''
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm h-fit">
        <h3 className="text-xs font-black text-slate-900 uppercase border-b pb-2 tracking-wider mb-4">Add Product / Service</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name *</label>
            <input
              type="text"
              value={pName}
              onChange={e => setPName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
              placeholder="e.g. Parle-G 100g, Consulting Fee"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Standard Rate / Price (₹)</label>
            <input
              type="number"
              step="0.01"
              value={pPrice}
              onChange={e => setPPrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
              placeholder="e.g. 10.00, 1500.00"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={pDescription}
              onChange={e => setPDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold resize-none"
              placeholder="Product details, specifications, etc."
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md mt-1 flex items-center justify-center gap-1.5 transition-colors">
            <Plus size={14} /> Save Product
          </button>
        </form>
      </div>

      {/* Product List */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search by product name or description..." />
        <div className="space-y-2 mt-4 max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
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
              <p className="text-xs font-semibold text-slate-400">No products or services found.</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 flex-shrink-0">
                    <Package size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 max-w-[280px]">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-700 font-mono whitespace-nowrap flex items-center">
                    <IndianRupee size={11} className="mr-0.5" />
                    {parseFloat(product.price || 0).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-1.5 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg text-blue-600 transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-rose-600 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
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
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Modify Product Details</h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Standard Rate / Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                  />
                </div>
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
