import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import API from './api/axios';
import Layout from './components/Layout';
import AuthPage from './pages/Login';
import Signup from './pages/Signup';
import POS from './pages/POS';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import { Loader2 } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
  const validateToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const response = await API.get('/auth/verify'); // ✅ Uses our axios
      if (response.data.success && response.data.valid) {
        setIsAuthenticated(true);
        setUser(response.data.user);
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
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

  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      if (!token) setUser(null);
    };

    window.addEventListener('loginStateChange', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('loginStateChange', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">EthioPOS</h2>
            <p className="text-gray-400 text-sm mt-1">Verifying session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={!isAuthenticated ? <AuthPage /> : <Navigate to="/pos" replace />}
        />
        <Route
          path="/signup"
          element={!isAuthenticated ? <Signup /> : <Navigate to="/pos" replace />}
        />

        {/* Protected Routes */}
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