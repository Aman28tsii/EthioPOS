/**
 * ═══════════════════════════════════════════════════════════════
 * EthioPOS Main Application
 * Production-Ready Authentication & Routing
 * Version: 2.1.0
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import API from './config/axios';
import Layout from './components/Layout';
import AuthPage from './pages/Login';
import Signup from './pages/Signup';
import POS from './pages/POS';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import { Loader2 } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  /**
   * Validate token on app initialization
   * This prevents the "redirect loop" issue by checking token validity
   * before rendering protected routes
   */
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');

      // No token = not authenticated
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        // Verify token with backend
        const response = await API.get('/auth/verify');

        if (response.data.success && response.data.valid) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          throw new Error('Invalid token response');
        }
      } catch (error) {
        console.error('❌ Token validation failed:', error.message);
        
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  /**
   * Listen for authentication state changes from other components
   * (e.g., logout, token cleared by interceptor, etc.)
   */
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      
      if (!token) {
        setUser(null);
      }
    };

    window.addEventListener('loginStateChange', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('loginStateChange', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  /**
   * Show loading screen while validating token
   */
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <div className="absolute inset-0 animate-pulse text-indigo-400/30" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">EthioPOS</h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Verifying your session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ═══════════════════════════════════════════════════════════════
            PUBLIC ROUTES (No Authentication Required)
            ═══════════════════════════════════════════════════════════════ */}
        
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <AuthPage />
            ) : (
              <Navigate to="/pos" replace />
            )
          }
        />

        <Route
          path="/signup"
          element={
            !isAuthenticated ? (
              <Signup />
            ) : (
              <Navigate to="/pos" replace />
            )
          }
        />

        {/* ═══════════════════════════════════════════════════════════════
            PROTECTED ROUTES (Authentication Required)
            ═══════════════════════════════════════════════════════════════ */}

        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout user={user}>
                <Routes>
                  <Route path="/pos" element={<POS />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/" element={<Navigate to="/pos" replace />} />
                  <Route path="*" element={<Navigate to="/pos" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;