/**
 * POS Terminal Component
 * Fully responsive point-of-sale interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Search, Package, Plus, Minus, X, 
  CreditCard, Zap, Archive, Loader2, CheckCircle, AlertCircle
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
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => { 
    localStorage.setItem('ultra_cart', JSON.stringify(cart)); 
  }, [cart]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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

    if (window.innerWidth < 1024) {
      setCartOpen(true);
    }
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQty = item.qty + delta;
        
        if (newQty <= 0) return null;
        if (newQty > (product?.stock || 999)) {
          showNotification('Maximum stock reached!', 'error');
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from cart?')) {
      setCart([]);
      localStorage.removeItem('ultra_cart');
    }
  };

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
      
      setCart([]);
      localStorage.removeItem('ultra_cart');
      showNotification(`Sale completed! Receipt: ${response.data.receiptNumber}`);
      
      await fetchData();
      setCartOpen(false);
      
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err.response?.data?.error || "Payment failed. Please try again.";
      showNotification(errorMessage, 'error');
    } finally { 
      setIsPaying(false); 
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    // ✅ FIXED: bg-gray-50 → bg-gray-900
    <div className="flex flex-col lg:flex-row h-full w-full bg-gray-900 overflow-hidden">
      
      {/* Notification Toast - unchanged */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg 
                        flex items-center gap-2 animate-slideIn ${
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

      {/* Product Section */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        {/* ✅ FIXED: bg-white → bg-gray-800, border-gray-200 → border-gray-700 */}
        <header className="px-4 md:px-6 py-4 bg-gray-800 border-b border-gray-700 
                           flex flex-col sm:flex-row justify-between items-stretch 
                           sm:items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
              <Zap size={18} className="fill-current" />
            </div>
            <div>
              {/* ✅ FIXED: text-gray-900 → text-white */}
              <h1 className="text-lg md:text-xl font-bold text-white">POS Terminal</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Quick checkout system</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                      size={16} />
              {/* ✅ FIXED: bg-gray-100 → bg-gray-700, focus:bg-white → focus:bg-gray-600 */}
              <input 
                className="w-full bg-gray-700 rounded-xl py-2 pl-9 pr-3 text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 border border-gray-600
                           focus:border-blue-500 transition duration-200 text-sm"
                placeholder="Search products..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                             hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            {/* Mobile Cart Button - unchanged */}
            <button 
              onClick={() => setCartOpen(true)}
              className="lg:hidden relative p-2 bg-blue-600 text-white rounded-xl 
                         shadow-sm active:scale-95 transition duration-200"
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                                 font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Products Grid */}
        {/* ✅ FIXED: implicit bg → bg-gray-900 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-900">
          {loading ? (
            // ✅ FIXED: text-gray-400 stays, looks good on dark
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-3" size={40} />
              <p className="font-semibold text-sm">Loading Products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Package size={48} strokeWidth={1.5} className="mb-3" />
              <p className="font-semibold text-sm">
                {search ? 'No products found' : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 
                            xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
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

      {/* Desktop Cart Sidebar */}
      {/* ✅ FIXED: bg-white → bg-gray-800, border-gray-200 → border-gray-700 */}
      <aside className="hidden lg:flex w-96 bg-gray-800 border-l border-gray-700 
                        flex-col shadow-lg flex-shrink-0">
        <CartContent 
          cart={cart}
          totalItems={totalItems}
          total={total}
          isPaying={isPaying}
          onClearCart={clearCart}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onPayment={handlePayment}
          products={products}
        />
      </aside>

      {/* Mobile Cart Drawer */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          {/* ✅ FIXED: bg-white → bg-gray-800 */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-gray-800 
                          shadow-2xl flex flex-col animate-slideInRight">
            {/* ✅ FIXED: border-gray-200 → border-gray-700, text-gray-900 → text-white */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Cart</h2>
              <button 
                onClick={() => setCartOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 
                           rounded-xl transition duration-200"
              >
                <X size={20} />
              </button>
            </div>
            <CartContent 
              cart={cart}
              totalItems={totalItems}
              total={total}
              isPaying={isPaying}
              onClearCart={clearCart}
              onUpdateQty={updateQty}
              onRemove={removeFromCart}
              onPayment={handlePayment}
              products={products}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Cart Content Component (Reusable for desktop & mobile)
 */
const CartContent = ({ 
  cart, totalItems, total, isPaying, 
  onClearCart, onUpdateQty, onRemove, onPayment, products 
}) => (
  <>
    {/* Cart Header */}
    {/* ✅ FIXED: border-gray-100 → border-gray-700, text-gray-900 → text-white */}
    <div className="p-4 md:p-6 border-b border-gray-700 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <ShoppingCart className="text-blue-400" size={20} />
        <h2 className="text-base md:text-lg font-bold text-white">Active Cart</h2>
      </div>
      <div className="flex items-center gap-2">
        {/* ✅ FIXED: bg-blue-50 → bg-blue-500/20 */}
        <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 
                         rounded-full">
          {totalItems} Items
        </span>
        {cart.length > 0 && (
          <button 
            onClick={onClearCart}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 
                       rounded-lg transition duration-200"
            title="Clear cart"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>

    {/* Cart Items */}
    {/* ✅ FIXED: no bg change needed - inherits gray-800 from parent */}
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
      {cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-500">
          <Archive size={48} strokeWidth={1.5} className="mb-3" />
          <p className="font-semibold text-sm text-gray-400">Empty Cart</p>
          <p className="text-gray-500 text-xs mt-1">Add products to get started</p>
        </div>
      ) : (
        cart.map(item => (
          <CartItem 
            key={item.id}
            item={item}
            maxStock={products.find(p => p.id === item.id)?.stock || 999}
            onUpdateQty={(delta) => onUpdateQty(item.id, delta)}
            onRemove={() => onRemove(item.id)}
          />
        ))
      )}
    </div>

    {/* Checkout Section - unchanged (already dark bg-gray-900) */}
    <div className="p-4 md:p-6 bg-gray-900 text-white rounded-t-2xl shadow-xl">
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-gray-400 text-sm">
          <span>Subtotal ({totalItems} items)</span>
          <span>{total.toLocaleString()} ETB</span>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-gray-400 text-xs uppercase tracking-wide">Grand Total</span>
          <div className="text-right">
            <span className="text-2xl md:text-3xl font-bold">
              {total.toLocaleString()}
            </span>
            <span className="ml-1 text-blue-400 text-sm font-semibold">ETB</span>
          </div>
        </div>
      </div>

      <button 
        onClick={onPayment}
        disabled={cart.length === 0 || isPaying}
        className={`w-full py-3 md:py-4 rounded-xl text-base md:text-lg font-semibold 
                   flex items-center justify-center gap-2 transition-all duration-200 
                   active:scale-95 ${
          cart.length === 0 || isPaying
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
        }`}
      >
        {isPaying ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Processing...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Complete Payment
          </>
        )}
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5 opacity-50">
        <CheckCircle size={10} className="text-green-400" />
        <span className="text-[10px] font-medium uppercase tracking-wider">
          Secure Transaction
        </span>
      </div>
    </div>
  </>
);

/**
 * Product Card Component
 */
const ProductCard = ({ product, onAdd, inCart }) => {
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock < 10;

  return (
    // ✅ FIXED: bg-white → bg-gray-800, border-gray-100 → border-gray-700
    <div 
      onClick={() => !outOfStock && onAdd()}
      className={`relative bg-gray-800 p-3 md:p-4 rounded-2xl border border-gray-700 
                 shadow-sm transition-all duration-200 cursor-pointer ${
        outOfStock 
          ? 'opacity-50 grayscale cursor-not-allowed' 
          : 'hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 hover:border-blue-500/50 active:scale-95'
      }`}
    >
      {outOfStock && (
        // ✅ FIXED: bg-red-100 → bg-red-500/20
        <span className="absolute top-2 right-2 bg-red-500/20 text-red-400 text-[10px] 
                         font-bold px-2 py-0.5 rounded-full border border-red-500/30">
          Out
        </span>
      )}
      {lowStock && !outOfStock && (
        // ✅ FIXED: bg-yellow-100 → bg-yellow-500/20
        <span className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 text-[10px] 
                         font-bold px-2 py-0.5 rounded-full border border-yellow-500/30">
          Low
        </span>
      )}
      {inCart > 0 && (
        <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold 
                         w-5 h-5 rounded-full flex items-center justify-center">
          {inCart}
        </span>
      )}

      {/* ✅ FIXED: bg-gray-50 → bg-gray-700/50 */}
      <div className="aspect-square bg-gray-700/50 rounded-xl mb-3 flex items-center 
                      justify-center text-gray-500 transition-colors">
        <Package size={32} strokeWidth={1.5} />
      </div>

      {/* ✅ FIXED: text-gray-800 → text-white */}
      <h3 className="font-semibold text-white text-sm md:text-base leading-tight mb-2 
                     truncate">
        {product.name}
      </h3>
      
      <div className="flex justify-between items-end">
        <div>
          <span className="text-blue-400 font-bold text-base md:text-lg">
            {product.price}
          </span>
          <span className="text-gray-500 text-xs ml-0.5">ETB</span>
        </div>
        {/* ✅ FIXED: bg-gray-50 → bg-gray-700, text-gray-500 → text-gray-400 */}
        <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-700 text-gray-400 
                         rounded-lg uppercase border border-gray-600">
          {product.stock}
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
    // ✅ FIXED: bg-gray-50 → bg-gray-700/50, border-gray-100 → border-gray-600
    <div className="p-3 md:p-4 bg-gray-700/50 border border-gray-600 rounded-xl 
                    hover:border-blue-500/50 transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 mr-2">
          {/* ✅ FIXED: text-gray-800 → text-white */}
          <p className="font-semibold text-white text-sm truncate">{item.name}</p>
          <p className="text-xs text-gray-400">{item.price} ETB each</p>
        </div>
        <button 
          onClick={onRemove}
          className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 
                     rounded-lg transition duration-200"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex justify-between items-center">
        {/* ✅ FIXED: bg-white → bg-gray-700, border-gray-200 → border-gray-600 */}
        <div className="flex items-center gap-1.5 bg-gray-700 p-0.5 rounded-lg border 
                        border-gray-600">
          <button 
            onClick={() => onUpdateQty(-1)}
            className="p-1.5 hover:bg-gray-600 rounded text-gray-300 transition duration-200 
                       disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={item.qty <= 1}
          >
            <Minus size={12} />
          </button>
          <span className="font-bold text-sm w-6 text-center text-white">{item.qty}</span>
          <button 
            onClick={() => onUpdateQty(1)}
            className="p-1.5 hover:bg-gray-600 rounded text-gray-300 transition duration-200 
                       disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={item.qty >= maxStock}
          >
            <Plus size={12} />
          </button>
        </div>
        {/* ✅ FIXED: text-gray-900 → text-white */}
        <p className="font-bold text-white text-sm">
          {(item.price * item.qty).toLocaleString()} ETB
        </p>
      </div>
    </div>
  );
};

export default POS;