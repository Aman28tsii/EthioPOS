import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import Analytics from './pages/Analytics';
import Comments from './pages/Comments';
import Layout from './components/Layout';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const onAuthChange = () => checkAuth();
    window.addEventListener('loginStateChange', onAuthChange);

    return () => window.removeEventListener('loginStateChange', onAuthChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading EthioPOS...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Protected */}
        <Route
          path="/"
          element={user ? <Layout user={user} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard user={user} />} />
          <Route path="pos" element={<POS />} />
<Route path="/comments" element={<Comments />} />
          {/* Admin + Owner */}
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <>
              <Route path="inventory" element={<Inventory />} />
              <Route path="analytics" element={<Analytics />} />
            </>
          )}

          {/* Owner only */}
          {user?.role === 'owner' && (
            <Route path="staff" element={<Staff />} />
          )}
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;