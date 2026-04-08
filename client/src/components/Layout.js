/**
 * Layout Component
 * Main application shell with responsive sidebar navigation - NO WARNINGS
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, 
  LogOut, Shield, Menu, X 
} from 'lucide-react';
import API from '../api/axios';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch current user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        const cached = localStorage.getItem('user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {
            console.error('Invalid cached user data');
          }
        }
      }
    };
    fetchUser();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('ultra_cart');
    localStorage.removeItem('ultra_inventory');
    localStorage.removeItem('ultra_staff_directory');
    window.dispatchEvent(new Event('loginStateChange'));
    navigate('/login');
  };

  const navItems = [
    { to: '/analytics', icon: LayoutDashboard, label: 'Analytics' },
    { to: '/pos', icon: ShoppingCart, label: 'POS Terminal' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/staff', icon: Users, label: 'Staff Team' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-gray-900 text-white flex flex-col shadow-xl
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo & Close Button */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-blue-400 tracking-tight">
              EthioPOS <span className="text-white">PRO</span>
            </h1>
            <div className="h-1 w-10 bg-blue-500 mt-2 rounded-full opacity-60" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition duration-200 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={<item.icon size={20} />}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        {/* User Info Section */}
        {user && (
          <div className="px-4 mb-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Shield size={10} className="text-blue-400" />
                    <span className="text-xs text-blue-400 uppercase font-medium tracking-wide">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 
                       text-gray-400 hover:text-red-400 transition-all duration-200 
                       font-semibold flex items-center justify-center gap-3 
                       active:scale-95"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 
                       transition duration-200 active:scale-95"
          >
            <Menu size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-blue-600">EthioPOS PRO</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

/**
 * Navigation Item Component
 */
const NavItem = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`
      flex items-center gap-4 px-4 py-3 rounded-xl font-medium 
      transition-all duration-200 active:scale-95
      ${active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }
    `}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
      {icon}
    </div>
    <span>{label}</span>
  </Link>
);

export default Layout;