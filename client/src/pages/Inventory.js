/**
 * Inventory Management Component
 * Fully responsive - NO WARNINGS
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Fetch all products from backend
  const fetchProducts = useCallback(async () => {
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
      const cached = localStorage.getItem('ultra_inventory');
      if (cached) {
        try {
          setProducts(JSON.parse(cached));
        } catch (e) {
          console.error("Cache error:", e);
        }
      }
      showNotification('Failed to load products', 'error');
    } finally { 
      setLoading(false); 
    }
  }, [navigate, showNotification]);

  // Initial fetch - fetchProducts included in dependencies
  useEffect(() => { 
    fetchProducts(); 
  }, [fetchProducts]);

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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
        await API.put(`/products/${editingProduct.id}`, payload);
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? { ...p, ...payload } : p
        ));
        showNotification('Product updated successfully');
      } else {
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
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg 
                          flex items-center gap-2 transition-all duration-200 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {notification.type === 'success' ? 
              <CheckCircle size={18} /> : 
              <AlertCircle size={18} />
            }
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <div className="h-1 w-8 bg-blue-600 rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Enterprise Resource
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Inventory Management
            </h1>
          </div>
          
          <button 
            onClick={openAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 
                       bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl 
                       font-semibold transition-all duration-200 shadow-sm 
                       active:scale-95"
          >
            <Plus size={18} /> 
            Add Product
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Package size={20}/>} label="Total Products" value={totalProducts} color="blue" />
          <StatCard icon={<CheckCircle size={20}/>} label="Healthy Stock" value={healthyCount} color="green" />
          <StatCard icon={<AlertCircle size={20}/>} label="Low Stock" value={lowStockCount} color="yellow" />
          <StatCard icon={<X size={20}/>} label="Out of Stock" value={outOfStockCount} color="red" />
        </div>

        {/* Inventory Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          
          {/* Search & Filters */}
          <div className="p-4 md:p-6 flex flex-col sm:flex-row justify-between gap-4 
                          items-stretch sm:items-center bg-gray-50 border-b border-gray-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchTerm}
                className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 
                           rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 
                           text-sm transition duration-200"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                             hover:text-gray-600 transition duration-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 
                                 rounded-xl text-sm font-medium text-gray-700 
                                 hover:bg-white transition duration-200 
                                 flex items-center justify-center gap-2">
                <Filter size={16}/> Filter
              </button>
              <button className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 
                                 rounded-xl text-sm font-medium text-gray-700 
                                 hover:bg-white transition duration-200 
                                 flex items-center justify-center gap-2">
                <Download size={16}/> Export
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 md:p-16 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={36} />
              <span className="text-sm font-medium text-gray-500">Loading inventory...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 md:p-16 flex flex-col items-center gap-3 text-gray-400">
              <Package size={48} strokeWidth={1.5} />
              <p className="text-sm font-medium">
                {searchTerm ? 'No products match your search' : 'No products in inventory'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm md:text-base">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                    <th className="px-4 md:px-6 py-3">Product</th>
                    <th className="px-4 md:px-6 py-3">Category</th>
                    <th className="px-4 md:px-6 py-3">Stock Level</th>
                    <th className="px-4 md:px-6 py-3">Price</th>
                    <th className="px-4 md:px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-semibold text-gray-800">{product.name}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-lg">
                          {product.category || 'General'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="w-20 md:w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-200 ${
                                product.stock <= 0 ? 'bg-red-500' :
                                product.stock < 10 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} 
                              style={{width: `${Math.min(product.stock, 100)}%`}}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${
                            product.stock <= 0 ? 'text-red-600' :
                            product.stock < 10 ? 'text-yellow-600' : 'text-gray-600'
                          }`}>
                            {product.stock} units
                          </span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="font-semibold text-gray-900">{Number(product.price).toLocaleString()}</span>
                        <span className="text-gray-500 text-xs ml-1">ETB</span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(product)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteProduct(product.id, product.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input 
                  required 
                  placeholder="Enter product name"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (ETB)</label>
                  <input 
                    required type="number" min="0" step="0.01" placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input 
                    required type="number" min="0" placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
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

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button type="button" onClick={closeModal}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 font-medium bg-gray-200 hover:bg-gray-300 rounded-xl transition duration-200 active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="w-full sm:flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition duration-200 flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95">
                  {saving ? <><Loader2 className="animate-spin" size={18} /> Saving...</> : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600"
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colorClasses[color]}`}>{icon}</div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default Inventory;