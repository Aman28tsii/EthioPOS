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
  // ✅ FIXED: bg-gray-50 → bg-gray-900
  if (loading && stats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900 p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
          {/* ✅ FIXED: text-gray-500 → text-gray-400 */}
          <p className="text-gray-400 font-medium text-sm">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    // ✅ FIXED: bg-gray-50 → bg-gray-900
    <div className="min-h-full bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <div className="h-1 w-6 bg-blue-500 rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Executive Summary
                </span>
              </div>
              {/* ✅ FIXED: text-gray-900 → text-white */}
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">
                Business Intelligence
              </h1>
              {/* ✅ FIXED: text-gray-500 → text-gray-400 */}
              <div className="flex items-center gap-2 mt-2 text-gray-400 text-sm">
                <Calendar size={14} />
                <span>Today, {lastUpdated.toLocaleDateString()}</span>
              </div>
            </div>

            {/* Refresh Button */}
            {/* ✅ FIXED: bg-white → bg-gray-800, border-gray-200 → border-gray-700 */}
            <div className="flex items-center gap-3 bg-gray-800 p-2 rounded-xl 
                            shadow-sm border border-gray-700">
              {/* ✅ FIXED: border-gray-100 → border-gray-700 */}
              <div className="px-3 py-1 border-r border-gray-700 hidden sm:block">
                {/* ✅ FIXED: text-gray-400 stays, text-gray-700 → text-white */}
                <p className="text-xs text-gray-400 font-medium">Last Sync</p>
                <p className="text-sm font-semibold text-white">
                  {lastUpdated.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
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
        {/* ✅ FIXED: bg-red-50 → bg-red-500/10, border-red-200 → border-red-500/30 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl 
                          text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 
                        mb-6 md:mb-8">
          {stats.map((item, index) => {
            const Icon = item.title.includes('Revenue') ? DollarSign :
                         item.title.includes('Orders')  ? Package    :
                         item.title.includes('Staff')   ? Users      : TrendingUp;

            return (
              // ✅ FIXED: bg-white → bg-gray-800, border-gray-100 → border-gray-700
              <div
                key={index}
                className="group bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm 
                           border border-gray-700 hover:shadow-lg 
                           hover:shadow-black/20 hover:border-blue-500/50 
                           transition-all duration-200 hover:scale-[1.02] 
                           relative overflow-hidden"
              >
                {/* Background Icon */}
                {/* ✅ FIXED: text-gray-50 → text-gray-700/30 */}
                <div className="absolute -right-4 -bottom-4 text-gray-700/30 
                                group-hover:text-blue-500/10 transition-colors">
                  <Icon size={80} strokeWidth={1} />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    {/* ✅ FIXED: bg-gray-100 → bg-gray-700, text-gray-600 → text-gray-400 */}
                    <div className="p-2.5 bg-gray-700 text-gray-400 
                                    group-hover:bg-blue-600 group-hover:text-white 
                                    rounded-xl transition-all duration-200">
                      <Icon size={20} />
                    </div>

                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full 
                                     text-xs font-semibold ${
                      item.upbeat
                        // ✅ FIXED: bg-green-50 → bg-green-500/20, border-green-100 → border-green-500/30
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        // ✅ FIXED: bg-red-50 → bg-red-500/20, border-red-100 → border-red-500/30
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {item.change}
                      {item.upbeat 
                        ? <ArrowUpRight size={12} /> 
                        : <ArrowDownRight size={12} />
                      }
                    </div>
                  </div>

                  {/* ✅ FIXED: text-gray-500 → text-gray-400 */}
                  <p className="text-gray-400 text-xs font-semibold uppercase 
                                tracking-wider mb-1">
                    {item.title}
                  </p>
                  {/* ✅ FIXED: text-gray-900 → text-white */}
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Products Table */}
        {/* ✅ FIXED: bg-white → bg-gray-800, border-gray-100 → border-gray-700 */}
        <div className="bg-gray-800 rounded-2xl shadow-sm border border-gray-700 
                        overflow-hidden">
          {/* Table Header */}
          {/* ✅ FIXED: border-gray-100 → border-gray-700 */}
          <div className="p-4 md:p-6 border-b border-gray-700 flex flex-col sm:flex-row 
                          justify-between items-start sm:items-center gap-3">
            <div>
              {/* ✅ FIXED: text-gray-900 → text-white */}
              <h2 className="text-lg md:text-xl font-semibold text-white">
                Top Selling Products
              </h2>
              {/* ✅ FIXED: text-gray-500 → text-gray-400 */}
              <p className="text-sm text-gray-400 mt-0.5">
                Best performers for today
              </p>
            </div>
            {/* ✅ FIXED: bg-blue-50 → bg-blue-500/20 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 
                            rounded-full border border-blue-500/30">
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wide">
                Live Data
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                {/* ✅ FIXED: bg-gray-50 → bg-gray-700/50, text-gray-500 → text-gray-400 */}
                <tr className="bg-gray-700/50 text-gray-400 text-xs font-semibold 
                               uppercase tracking-wider">
                  <th className="px-4 md:px-6 py-3">Rank</th>
                  <th className="px-4 md:px-6 py-3">Product Name</th>
                  <th className="px-4 md:px-6 py-3 text-center">Units Sold</th>
                  <th className="px-4 md:px-6 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              {/* ✅ FIXED: divide-gray-50 → divide-gray-700 */}
              <tbody className="divide-y divide-gray-700">
                {topProducts.length > 0 ? topProducts.map((product, i) => (
                  // ✅ FIXED: hover:bg-gray-50 → hover:bg-gray-700/50
                  <tr
                    key={i}
                    className="hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <td className="px-4 md:px-6 py-4">
                      {/* ✅ FIXED: rank badge colors → dark opacity versions */}
                      <div className={`h-8 w-8 rounded-xl flex items-center 
                                       justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        i === 1 ? 'bg-gray-500/20 text-gray-400'    :
                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-gray-700 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {/* ✅ FIXED: text-gray-800 → text-white, hover:text-blue-600 → hover:text-blue-400 */}
                      <span className="font-medium text-sm md:text-base text-white 
                                       hover:text-blue-400 transition-colors cursor-default">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      {/* ✅ FIXED: bg-gray-100 → bg-gray-700, text-gray-700 → text-gray-300 */}
                      <span className="inline-block px-3 py-1 bg-gray-700 text-gray-300 
                                       rounded-xl text-xs md:text-sm font-semibold
                                       border border-gray-600">
                        {product.sales} units
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      {/* ✅ FIXED: text-gray-900 → text-white */}
                      <span className="text-sm md:text-base text-white font-bold">
                        {product.revenue}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center text-gray-500">
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

        {/* Mobile Cards View */}
        {/* ✅ FIXED: bg-white → bg-gray-800, border-gray-100 → border-gray-700 */}
        <div className="mt-6 space-y-4 sm:hidden">
          {topProducts.length > 0 && topProducts.map((product, i) => (
            <div
              key={i}
              className="bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-700
                         hover:border-gray-600 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                {/* ✅ FIXED: rank badge colors → dark opacity versions */}
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center 
                                 text-xs font-bold ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-gray-500/20 text-gray-400'    :
                  i === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-700 text-gray-500'
                }`}>
                  #{i + 1}
                </div>
                {/* ✅ FIXED: bg-gray-100 → bg-gray-700, text-gray-500 → text-gray-400 */}
                <span className="text-xs font-semibold text-gray-400 bg-gray-700 
                                 px-2 py-1 rounded-lg border border-gray-600">
                  {product.sales} units
                </span>
              </div>
              {/* ✅ FIXED: text-gray-900 → text-white */}
              <h3 className="font-semibold text-white mb-1">{product.name}</h3>
              {/* ✅ FIXED: text-blue-600 → text-blue-400 */}
              <p className="text-lg font-bold text-blue-400">{product.revenue}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Analytics;