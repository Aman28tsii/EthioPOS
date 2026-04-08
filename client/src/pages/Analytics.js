/**
 * Analytics Dashboard Component
 * Business intelligence and reporting - Fully Responsive
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading state
  if (loading && stats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-gray-500 font-medium text-sm">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <div className="h-1 w-6 bg-blue-600 rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Executive Summary
                </span>
              </div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                Business Intelligence
              </h1>
              <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
                <Calendar size={14} />
                <span>Today, {lastUpdated.toLocaleDateString()}</span>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
              <div className="px-3 py-1 border-r border-gray-100 hidden sm:block">
                <p className="text-xs text-gray-400 font-medium">Last Sync</p>
                <p className="text-sm font-semibold text-gray-700">
                  {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                           transition duration-200 shadow-sm active:scale-95 
                           disabled:opacity-70 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw
                  size={18}
                  className={refreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((item, index) => {
            const Icon = item.title.includes('Revenue') ? DollarSign :
                         item.title.includes('Orders') ? Package :
                         item.title.includes('Staff') ? Users : TrendingUp;

            return (
              <div
                key={index}
                className="group bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 
                           hover:shadow-md hover:border-blue-200 transition-all duration-200 
                           hover:scale-[1.02] relative overflow-hidden"
              >
                {/* Background Icon */}
                <div className="absolute -right-4 -bottom-4 text-gray-50 group-hover:text-blue-50 transition-colors">
                  <Icon size={80} strokeWidth={1} />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-gray-100 text-gray-600 group-hover:bg-blue-600 
                                    group-hover:text-white rounded-xl transition-all duration-200">
                      <Icon size={20} />
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      item.upbeat
                        ? 'bg-green-50 text-green-600 border border-green-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {item.change}
                      {item.upbeat ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    {item.title}
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row 
                          justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                Top Selling Products
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Best performers for today
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                Live Data
              </span>
            </div>
          </div>

          {/* Responsive Table Wrapper */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 md:px-6 py-3">Rank</th>
                  <th className="px-4 md:px-6 py-3">Product Name</th>
                  <th className="px-4 md:px-6 py-3 text-center">Units Sold</th>
                  <th className="px-4 md:px-6 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.length > 0 ? topProducts.map((product, i) => (
                  <tr 
                    key={i} 
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-4 md:px-6 py-4">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center 
                                       text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="font-medium text-sm md:text-base text-gray-800 
                                       hover:text-blue-600 transition-colors">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 
                                       rounded-xl text-xs md:text-sm font-semibold">
                        {product.sales} units
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <span className="text-sm md:text-base text-gray-900 font-bold">
                        {product.revenue}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center text-gray-400">
                        <Package size={40} strokeWidth={1.5} className="mb-3" />
                        <p className="font-medium text-sm">No sales recorded today</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View for Products (Alternative for very small screens) */}
        <div className="mt-6 space-y-4 sm:hidden">
          {topProducts.length > 0 && topProducts.map((product, i) => (
            <div 
              key={i} 
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center 
                                 text-xs font-bold ${
                  i === 0 ? 'bg-yellow-100 text-yellow-700' :
                  i === 1 ? 'bg-gray-100 text-gray-600' :
                  i === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-50 text-gray-400'
                }`}>
                  #{i + 1}
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                  {product.sales} units
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-lg font-bold text-blue-600">{product.revenue}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;