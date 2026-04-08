/**
 * Analytics Dashboard Component
 * Business intelligence and reporting
 */

import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import { 
  TrendingUp, Users, DollarSign, Package, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Calendar 
} from 'lucide-react';

const Analytics = () => {
  const [stats, setStats] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    try {
      if (stats.length > 0) setRefreshing(true);
      setError(null);
      
      const [statsRes, productsRes] = await Promise.all([
        API.get('/analytics/daily-stats'),
        API.get('/analytics/top-products')
      ]);
      
      setStats(statsRes.data || []);
      setTopProducts(productsRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats.length]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading state
  if (loading && stats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-indigo-600 mb-6" size={48} />
          <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 md:p-10 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <div className="h-1 w-8 bg-indigo-600 rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Executive Summary</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Business Intelligence</h1>
            <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm font-medium">
              <Calendar size={14} />
              <span>Today, {lastUpdated.toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="px-4 py-2 border-r border-slate-100 hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Last Sync</p>
              <p className="text-xs font-bold text-slate-700">
                {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
            <button 
              onClick={fetchData}
              disabled={refreshing}
              className="group p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-70"
              title="Refresh data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            </button>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((item, index) => {
            const Icon = item.title.includes('Revenue') ? DollarSign : 
                         item.title.includes('Orders') ? Package :
                         item.title.includes('Staff') ? Users : TrendingUp;
            
            return (
              <div 
                key={index} 
                className="group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                {/* Background Icon */}
                <div className="absolute -right-4 -bottom-4 text-slate-50 group-hover:text-indigo-50/80 transition-colors">
                  <Icon size={100} strokeWidth={1} />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-5">
                    <div className="p-3 bg-slate-50 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white rounded-xl transition-all duration-300">
                      <Icon size={20} />
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.upbeat 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {item.change} 
                      {item.upbeat ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{item.title}</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Top Selling Products</h2>
              <p className="text-sm text-slate-500 mt-1">Best performers for today</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full">
              <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Live Data</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 md:px-8 py-4">Rank</th>
                  <th className="px-6 md:px-8 py-4">Product Name</th>
                  <th className="px-6 md:px-8 py-4 text-center">Units Sold</th>
                  <th className="px-6 md:px-8 py-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.length > 0 ? topProducts.map((product, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 md:px-8 py-5">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-600' :
                        i === 1 ? 'bg-slate-100 text-slate-600' :
                        i === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-5">
                      <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center">
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        {product.sales} units
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-right">
                      <span className="text-slate-900 font-bold">{product.revenue}</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center text-slate-300">
                        <Package size={48} strokeWidth={1} className="mb-4" />
                        <p className="font-medium">No sales recorded today</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;