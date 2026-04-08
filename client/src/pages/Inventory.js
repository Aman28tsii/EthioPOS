/**
 * Inventory Management Component
 * Manage products, stock levels, and pricing
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { 
  Plus, Search, Trash2, Package, AlertCircle, 
  CheckCircle, Loader2, Filter, Download, X, Edit2
} from 'lucide-react';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    stock: '', 
    category: 'General' 
  });
  
  const navigate = useNavigate();

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch all products from backend
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get('/products');
      setProducts(res.data || []);
      localStorage.setItem('ultra_inventory', JSON.stringify(res.data || []));
    } catch (err) {
      console.error("Fetch products error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      // Try cached data
      try {
        const cached = JSON.parse(localStorage.getItem('ultra_inventory'));
        if (cached) setProducts(cached);
      } catch (e) {
        console.error("Cache error:", e);
      }
      showNotification('Failed to load products', 'error');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchProducts(); 
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', price: '', stock: '', category: 'General' });
    setEditingProduct(null);
  };

  // Open modal for adding
  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for editing
  const openEditModal = (product) => {
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category || 'General'
    });
    setEditingProduct(product);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Handle form submission (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      showNotification('Product name is required', 'error');
      return;
    }
    if (!formData.price || Number(formData.price) < 0) {
      showNotification('Valid price is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock) || 0,
        category: formData.category || 'General'
      };

      if (editingProduct) {
        // Update existing product
        await API.put(`/products/${editingProduct.id}`, payload);
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? { ...p, ...payload } : p
        ));
        showNotification('Product updated successfully');
      } else {
        // Add new product
        const res = await API.post('/products', payload);
        setProducts(prev => [res.data, ...prev]);
        showNotification('Product added successfully');
      }

      closeModal();
    } catch (err) {
      console.error("Save product error:", err);
      showNotification(err.response?.data?.error || 'Failed to save product', 'error');
    } finally { 
      setSaving(false); 
    }
  };

  // Handle deleting a product
  const deleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    
    const previousState = [...products];
    setProducts(products.filter(p => p.id !== id));
    
    try {
      await API.delete(`/products/${id}`);
      showNotification('Product deleted successfully');
    } catch (err) {
      console.error("Delete error:", err);
      setProducts(previousState);
      showNotification('Failed to delete product', 'error');
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < 10).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;
  const healthyCount = products.filter(p => p.stock >= 10).length;

  return (
    <div className="min-h-screen bg-[#FDFDFE] p-6 md:p-10 lg:p-16 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn ${
            notification.type === 'success' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-12 bg-indigo-600 rounded-full" />
              <span className="text-xs font-bold tracking-[0.3em] uppercase text-indigo-600/80">Enterprise Resource</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Inventory <span className="font-light text-slate-400">System</span>
            </h1>
          </div>
          
          <button 
            onClick={openAddModal}
            className="group flex items-center gap-3 bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-2xl active:scale-95"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
            Add New Asset
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard 
            icon={<Package size={22}/>} 
            label="Total Products" 
            value={totalProducts} 
            color="indigo" 
          />
          <StatCard 
            icon={<CheckCircle size={22}/>} 
            label="Healthy Stock" 
            value={healthyCount} 
            color="emerald" 
          />
          <StatCard 
            icon={<AlertCircle size={22}/>} 
            label="Low Stock" 
            value={lowStockCount} 
            color="amber" 
          />
          <StatCard 
            icon={<X size={22}/>} 
            label="Out of Stock" 
            value={outOfStockCount} 
            color="rose" 
          />
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          {/* Search & Filters */}
          <div className="p-6 flex flex-col md:flex-row justify-between gap-4 items-center bg-slate-50/50 border-b border-slate-100">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchTerm}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm font-medium transition-colors"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-white transition-all flex items-center gap-2">
                <Filter size={16}/> Filter
              </button>
              <button className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-white transition-all flex items-center gap-2">
                <Download size={16}/> Export
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <span className="text-sm font-medium text-slate-400">Loading inventory...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-300">
              <Package size={64} strokeWidth={1} />
              <p className="text-sm font-medium">
                {searchTerm ? 'No products match your search' : 'No products in inventory'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[11px] uppercase tracking-widest font-bold border-b border-slate-100">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Stock Level</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-semibold text-slate-800">{product.name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                          {product.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                product.stock <= 0 ? 'bg-red-500' :
                                product.stock < 10 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} 
                              style={{width: `${Math.min(product.stock, 100)}%`}}
                            />
                          </div>
                          <span className={`text-xs font-bold ${
                            product.stock <= 0 ? 'text-red-500' :
                            product.stock < 10 ? 'text-amber-500' : 'text-slate-500'
                          }`}>
                            {product.stock} units
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-semibold text-slate-700">
                          {Number(product.price).toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">ETB</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(product)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteProduct(product.id, product.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-slideIn">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Product Name</label>
                <input 
                  required 
                  placeholder="Enter product name"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Price (ETB)</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Stock Quantity</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Category</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="General">General</option>
                  <option value="Food">Food</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 py-4 text-slate-500 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    editingProduct ? 'Update Product' : 'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Stat Card Component
 */
const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600"
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div className={`inline-flex p-3 rounded-xl ${colors[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
};

export default Inventory;