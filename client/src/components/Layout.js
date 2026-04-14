/**
 * Layout Component
 * Main application layout with sidebar navigation - Dark Theme & Responsive
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  LogOut,
  BarChart3,
  Menu,
  X,
  Bell,
  ShieldCheck,
    MessageSquare 
} from 'lucide-react';

const Layout = ({ user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('loginStateChange'));
    navigate('/login');
  };

  // ✅ Safety check - if no user, redirect to login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <ShieldCheck className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-400 mb-4">Please login to continue</p>
          <Link 
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 
                       text-white rounded-lg transition-colors duration-200"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'admin', 'staff']
    },
    {
      name: 'POS Terminal',
      to: '/pos',
      icon: ShoppingCart,
      roles: ['owner', 'admin', 'staff']
    },
    {
      name: 'Inventory',
      to: '/inventory',
      icon: Package,
      roles: ['owner', 'admin']
    },
    {
      name: 'Staff Management',
      to: '/staff',
      icon: Users,
      roles: ['owner']
    },
    {
      name: 'Analytics',
      to: '/analytics',
      icon: BarChart3,
      roles: ['owner', 'admin']
    }
  ,
    {
      name: 'Comments',
      to: '/comments',
      icon: MessageSquare,
      roles: ['owner', 'admin', 'staff']
    }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || 'staff'));

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gray-800 border-r border-gray-700 
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 
                            flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white" size={18} />
            </div>
            <span className="text-xl font-bold text-white">
              Ethio<span className="text-blue-500">POS</span>
            </span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium
                transition-all duration-200
                ${isActive(item.to) 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 
                            text-white flex items-center justify-center text-sm font-bold 
                            shadow-lg shadow-blue-500/20">
              {/* ✅ FIXED - Safe access with optional chaining */}
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{user?.role || 'staff'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                       bg-red-500/10 text-red-400 hover:bg-red-500/20 
                       rounded-xl transition-all duration-200 font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center 
                          justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-white hidden sm:block">
              {filteredNavItems.find(item => isActive(item.to))?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white 
                               hover:bg-gray-700 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Info (Desktop) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white 
                              flex items-center justify-center text-xs font-bold">
                {/* ✅ FIXED - Safe access */}
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;