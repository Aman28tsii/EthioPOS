/**
 * Layout Component
 * Main application shell with sidebar navigation
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, Shield } from 'lucide-react';
import API from '../api/axios';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        // Try to use cached user data
        const cached = localStorage.getItem('user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {
            console.error('Invalid cached user data');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    // Clear all stored credentials
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');
    localStorage.removeItem('ultra_cart');
    localStorage.removeItem('ultra_inventory');
    localStorage.removeItem('ultra_staff_directory');
    
    // Dispatch event to update auth state in App.js
    window.dispatchEvent(new Event('loginStateChange'));
    
    // Navigate to login
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-30 flex-shrink-0">
        {/* Logo */}
        <div className="p-8">
          <h1 className="text-2xl font-black text-indigo-400 tracking-tighter">
            EthioPOS <span className="text-white">PRO</span>
          </h1>
          <div className="h-1 w-12 bg-indigo-500 mt-2 rounded-full opacity-50" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <NavItem 
            to="/analytics" 
            icon={<LayoutDashboard size={20} />} 
            label="Analytics" 
            active={location.pathname === '/analytics'} 
          />
          <NavItem 
            to="/pos" 
            icon={<ShoppingCart size={20} />} 
            label="POS Terminal" 
            active={location.pathname === '/pos'} 
          />
          <NavItem 
            to="/inventory" 
            icon={<Package size={20} />} 
            label="Inventory" 
            active={location.pathname === '/inventory'} 
          />
          <NavItem 
            to="/staff" 
            icon={<Users size={20} />} 
            label="Staff Team" 
            active={location.pathname === '/staff'} 
          />
        </nav>

        {/* User Info Section */}
        {user && (
          <div className="px-4 mb-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  <div className="flex items-center gap-1">
                    <Shield size={10} className="text-indigo-400" />
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all font-black flex items-center justify-center gap-3 group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> 
            SYSTEM EXIT
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
        {children || <Outlet />}
      </main>
    </div>
  );
};

/**
 * Navigation Item Component
 */
const NavItem = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${
      active 
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 translate-x-2' 
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`}
  >
    <div className={`${active ? 'scale-110' : 'opacity-70'} transition-transform`}>
      {icon}
    </div>
    <span className="tracking-tight">{label}</span>
  </Link>
);

export default Layout;