import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Clock,
  ArrowRight,
  Activity
} from 'lucide-react';
import API from '../api/axios';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    todaySales: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  // Get user info safely
  const userName = user?.name || 'User';
  const userRole = user?.role || 'staff';
  const userStatus = user?.status || 'active';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/products');
        setStats({
          totalProducts: res.data?.length || 0,
          todaySales: 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // If no user, show login message
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <p className="text-gray-400">Please login to continue</p>
          <Link to="/login" className="text-blue-400 hover:underline mt-2 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'POS Terminal',
      description: 'Process sales',
      icon: ShoppingCart,
      to: '/pos',
      color: 'from-blue-600 to-blue-700',
      roles: ['owner', 'admin', 'staff']
    },
    {
      title: 'Inventory',
      description: 'Manage products',
      icon: Package,
      to: '/inventory',
      color: 'from-emerald-600 to-emerald-700',
      roles: ['owner', 'admin']
    },
    {
      title: 'Staff',
      description: 'Manage team',
      icon: Users,
      to: '/staff',
      color: 'from-purple-600 to-purple-700',
      roles: ['owner']
    },
    {
      title: 'Analytics',
      description: 'View reports',
      icon: BarChart3,
      to: '/analytics',
      color: 'from-orange-600 to-orange-700',
      roles: ['owner', 'admin']
    }
  ];

  const filteredActions = quickActions.filter(action => 
    action.roles.includes(userRole)
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      
      {/* Welcome Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Welcome back, {userName}! 👋
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm 
                              font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
                ${userStatus === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                <Clock size={14} />
                {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock size={16} />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards - Owner and Admin only */}
      {(userRole === 'owner' || userRole === 'admin') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="text-blue-400" size={20} />
              </div>
              <span className="flex items-center text-green-400 text-sm font-medium">
                <TrendingUp size={14} className="mr-1" />
                +12%
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Today's Sales</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : `ETB ${stats.todaySales.toLocaleString()}`}
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="text-emerald-400" size={20} />
              </div>
              <span className="flex items-center text-emerald-400 text-sm font-medium">
                <Activity size={14} className="mr-1" />
                Active
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Products</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : stats.totalProducts}
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="text-purple-400" size={20} />
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Active Staff</p>
            <p className="text-2xl font-bold text-white">5</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <BarChart3 className="text-orange-400" size={20} />
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Transactions</p>
            <p className="text-2xl font-bold text-white">24</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group bg-gray-800 border border-gray-700 rounded-xl p-5 
                         hover:border-gray-600 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} 
                              flex items-center justify-center mb-4 shadow-lg`}>
                <action.icon className="text-white" size={24} />
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 
                            transition-colors duration-200">
                {action.title}
              </h3>
              <p className="text-gray-400 text-sm mb-3">{action.description}</p>
              <div className="flex items-center text-blue-400 text-sm font-medium 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Open <ArrowRight size={14} className="ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Notice */}
      {userStatus === 'pending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Clock className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-1">Account Pending Approval</h3>
              <p className="text-gray-300 text-sm">
                Your account is waiting for approval from the owner.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;