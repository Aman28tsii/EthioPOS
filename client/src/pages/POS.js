/**
 * POS Terminal Component
 * Main point-of-sale interface for transactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Search, Package, Plus, Minus, X, 
  CreditCard, Zap, Archive, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import API from '../api/axios';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ultra_cart')) || [];
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  // Fetch products from backend
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/products');
      setProducts(res.data || []);
      localStorage.setItem('ultra_inventory', JSON.stringify(res.data || []));
    } catch (err) {
      console.error("Fetch products error:", err);
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      // Try to use cached data
      try {
        const cached = JSON.parse(localStorage.getItem('ultra_inventory'));
        if (cached) setProducts(cached);
      } catch (e) {
        console.error("Cache parse error:", e);
      }
    } finally { 
      setLoading(false); 
    }
  }, [navigate]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  // Persist cart to localStorage
  useEffect(() => { 
    localStorage.setItem('ultra_cart', JSON.stringify(cart)); 
  }, [cart]);

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Add product to cart
  const addToCart = (product) => {
    if (product.stock <= 0) {
      showNotification('Product out of stock!', 'error');
      return;
    }
    
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      if (existing.qty >= product.stock) {
        showNotification('Maximum stock reached!', 'error');
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, qty: item.qty + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  // Update item quantity in cart
  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQty = item.qty + delta;
        
        if (newQty <= 0) {
          return null; // Will be filtered out
        }
        if (newQty > (product?.stock || 999)) {
          showNotification('Maximum stock reached!', 'error');
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  // Remove item from cart
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Clear entire cart
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from cart?')) {
      setCart([]);
      localStorage.removeItem('ultra_cart');
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (cart.length === 0) return;
    
    setIsPaying(true);
    
    try {
      const payload = {
        total_amount: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        items_count: cart.reduce((sum, item) => sum + item.qty, 0),
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.qty,
          price: item.price
        }))
      };

      const response = await API.post('/sales', payload);
      
      // Success
      setCart([]);
      localStorage.removeItem('ultra_cart');
      showNotification(`Sale completed! Receipt: ${response.data.receiptNumber}`);
      
      // Refresh products to update stock
      await fetchData();
      
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err.response?.data?.error || "Payment failed. Please try again.";
      showNotification(errorMessage, 'error');
    } finally { 
      setIsPaying(false); 
    }
  };

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e) => {
    // F9 - Process payment
    if (e.key === 'F9' && cart.length > 0 && !isPaying) {
      e.preventDefault();
      handlePayment();
    }
    // F2 - Clear cart
    if (e.key === 'F2' && cart.length > 0) {
      e.preventDefault();
      clearCart();
    }
    // Escape - Clear search
    if (e.key === 'Escape') {
      setSearch('');
    }
  }, [cart, isPaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideIn ${
          notification.type === 'success' 
            ? 'bg-emerald-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Product Feed Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="px-10 py-7 bg-white border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Zap size={20} className="fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">EthioPOS Terminal</h1>
              <p className="text-xs text-slate-400">Press F9 to pay • F2 to clear</p>
            </div>
          </div>
          
          <div className="relative w-1/3 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full bg-slate-100/80 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 border border-transparent focus:border-indigo-500 transition-all text-sm"
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Products Grid */}
        <main className="flex-1 overflow-y-auto p-8 custom-scroll">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4" size={48} />
              <p className="font-bold uppercase tracking-widest text-xs">Loading Products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Package size={64} strokeWidth={1} className="mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">
                {search ? 'No products found' : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAdd={() => addToCart(product)}
                  inCart={cart.find(item => item.id === product.id)?.qty || 0}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Cart Sidebar */}
      <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-2xl flex-shrink-0">
        {/* Cart Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-indigo-600" size={24} />
            <h2 className="text-lg font-bold text-slate-900">Active Cart</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-full">
              {totalItems} Items
            </span>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear cart (F2)"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scroll">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
              <Archive size={64} strokeWidth={1} className="mb-4" />
              <p className="uppercase tracking-widest font-bold text-xs">Empty Cart</p>
              <p className="text-slate-400 text-xs mt-2">Click products to add them</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem 
                key={item.id}
                item={item}
                maxStock={products.find(p => p.id === item.id)?.stock || 999}
                onUpdateQty={(delta) => updateQty(item.id, delta)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-8 bg-slate-900 text-white rounded-t-[2.5rem] shadow-2xl">
          {/* Totals */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>Subtotal ({totalItems} items)</span>
              <span>{total.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-400 text-xs uppercase tracking-widest">Grand Total</span>
              <div className="text-right">
                <span className="text-4xl font-bold tracking-tighter">{total.toLocaleString()}</span>
                <span className="ml-2 text-indigo-400 text-sm font-bold uppercase">ETB</span>
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <button 
            onClick={handlePayment}
            disabled={cart.length === 0 || isPaying}
            className={`w-full py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
              cart.length === 0 || isPaying
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20'
            }`}
          >
            {isPaying ? (
              <>
                <Loader2 className="animate-spin" size={22} />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={22} />
                Finalize Transaction (F9)
              </>
            )}
          </button>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 opacity-40">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Terminal Session</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

/**
 * Product Card Component
 */
const ProductCard = ({ product, onAdd, inCart }) => {
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock < 10;

  return (
    <div 
      onClick={() => !outOfStock && onAdd()}
      className={`relative bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all cursor-pointer group ${
        outOfStock 
          ? 'opacity-50 grayscale cursor-not-allowed' 
          : 'hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 active:scale-95'
      }`}
    >
      {/* Stock Badges */}
      {outOfStock && (
        <span className="absolute top-4 right-4 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full">
          Out of Stock
        </span>
      )}
      {lowStock && (
        <span className="absolute top-4 right-4 bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
          Low Stock
        </span>
      )}
      {inCart > 0 && (
        <span className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
          {inCart}
        </span>
      )}

      {/* Product Image Placeholder */}
      <div className="aspect-square bg-slate-50 rounded-[1.5rem] mb-5 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
        <Package size={48} strokeWidth={1.5} />
      </div>

      {/* Product Info */}
      <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 truncate">{product.name}</h3>
      
      <div className="flex justify-between items-end">
        <div>
          <span className="text-indigo-600 font-bold text-xl">{product.price}</span>
          <span className="text-slate-400 text-xs ml-1">ETB</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-400 rounded-lg uppercase tracking-wider">
          {product.stock} Qty
        </span>
      </div>
    </div>
  );
};

/**
 * Cart Item Component
 */
const CartItem = ({ item, maxStock, onUpdateQty, onRemove }) => {
  return (
    <div className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group">
      {/* Item Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-bold text-slate-800 truncate">{item.name}</p>
          <p className="text-xs text-slate-400">{item.price} ETB each</p>
        </div>
        <button 
          onClick={onRemove}
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quantity Controls & Total */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
          <button 
            onClick={() => onUpdateQty(-1)}
            className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all disabled:opacity-30"
            disabled={item.qty <= 1}
          >
            <Minus size={14} />
          </button>
          <span className="font-bold text-sm w-8 text-center">{item.qty}</span>
          <button 
            onClick={() => onUpdateQty(1)}
            className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all disabled:opacity-30"
            disabled={item.qty >= maxStock}
          >
            <Plus size={14} />
          </button>
        </div>
        <p className="font-bold text-slate-900">{(item.price * item.qty).toLocaleString()} ETB</p>
      </div>
    </div>
  );
};

export default POS;