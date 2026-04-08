/**
 * Authentication Page Component
 * Handles both Login and Signup functionality
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';
import API from '../api/axios';

const AuthPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Automatically switch to Signup mode if URL is /signup
  useEffect(() => {
    if (location.pathname === '/signup') {
      setIsSignup(true);
    } else {
      setIsSignup(false);
    }
  }, [location.pathname]);

  // Clear error when switching modes
  useEffect(() => {
    setError('');
  }, [isSignup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (isSignup && !formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    
    try {
      const res = await API.post(endpoint, formData);
      
      if (isSignup) {
        // Auto-login after successful signup
        try {
          const loginRes = await API.post('/auth/login', { 
            email: formData.email, 
            password: formData.password 
          });
          localStorage.setItem('token', loginRes.data.token);
          localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        } catch (loginErr) {
          // If auto-login fails, redirect to login page
          setIsSignup(false);
          setError('Account created! Please log in.');
          setLoading(false);
          return;
        }
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      
      // Notify app of auth state change
      window.dispatchEvent(new Event('loginStateChange'));
      
      // Navigate to POS
      navigate('/pos');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          "Authentication failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 font-sans">
      <div className="w-full max-w-[400px] space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tighter">
            EthioPOS <span className="text-indigo-500">ULTRA</span>
          </h1>
          <p className="text-gray-400 mt-2 font-medium">
            {isSignup ? "Create your admin terminal" : "Welcome back, Commander"}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-900/50 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold animate-shake">
                {error}
              </div>
            )}

            {/* Name Field (Signup only) */}
            {isSignup && (
              <div className="relative">
                <User className="absolute left-4 top-4 text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required
                  value={formData.name}
                  className="w-full bg-black/40 border border-gray-800 p-4 pl-12 rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
            )}

            {/* Email Field */}
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-gray-500" size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                required
                value={formData.email}
                className="w-full bg-black/40 border border-gray-800 p-4 pl-12 rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-gray-500" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                required
                value={formData.password}
                className="w-full bg-black/40 border border-gray-800 p-4 pl-12 pr-12 rounded-2xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isSignup ? "Register Now" : "Authorize Access"} 
                  <ChevronRight size={18}/>
                </>
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsSignup(!isSignup)}
              className="text-gray-400 text-sm hover:text-indigo-400 transition-colors font-medium"
            >
              {isSignup ? "Already have an account? Log In" : "Need a new terminal? Sign Up"}
            </button>
          </div>
        </div>

        {/* Footer Hint */}
        <p className="text-center text-gray-600 text-xs">
          Default credentials: owner@ethiopos.com / owner123
        </p>
      </div>
    </div>
  );
};

export default AuthPage;