/**
 * EthioPOS Main Application
 * Handles routing and authentication state
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthPage from './pages/Login';
import POS from './pages/POS';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';

function App() {
  // Global authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    // Handler for authentication state changes
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    // Listen for custom auth events and storage changes
    window.addEventListener('loginStateChange', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    
    return () => {
      window.removeEventListener('loginStateChange', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <AuthPage /> : <Navigate to="/pos" replace />} 
        />
        <Route 
          path="/signup" 
          element={!isAuthenticated ? <AuthPage /> : <Navigate to="/pos" replace />} 
        />

        {/* Protected System Routes */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <Layout>
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