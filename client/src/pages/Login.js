/**
 * Authentication Page Component
 * Handles both Login and Signup - Fully Responsive
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, User, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import API from '../api/axios';

const AuthPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect signup mode from URL
  useEffect(() => {
    setIsSignup(location.pathname === '/signup');
  }, [location.pathname]);

  // Clear error when switching modes
  useEffect(() => {
    setError('');
    setFormData({ name: '', email: '', password: '' });
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
        // Auto-login after signup
        try {
          const loginRes = await API.post('/auth/login', { 
            email: formData.email, 
            password: formData.password 
          });
          localStorage.setItem('token', loginRes.data.token);
          localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        } catch (loginErr) {
          setIsSignup(false);
          setError('Account created! Please log in.');
          setLoading(false);
          return;
        }
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      
      window.dispatchEvent(new Event('loginStateChange'));
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
    if (error) setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 
                          rounded-2xl bg-blue-600 shadow-lg mb-4 md:mb-6">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            EthioPOS <span className="text-blue-500">PRO</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            {isSignup ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800 border border-gray-700 p-6 md:p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl 
                              text-red-400 text-sm text-center font-medium">
                {error}
              </div>
            )}

            {/* Name Field (Signup only) */}
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" 
                        size={18} />
                  <input 
                    type="text" 
                    placeholder="Enter your name" 
                    required
                    value={formData.name}
                    className="w-full bg-gray-900 border border-gray-700 px-3 py-2 pl-10 
                               rounded-xl text-white placeholder-gray-500 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 
                               focus:border-transparent transition duration-200"
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" 
                      size={18} />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  required
                  value={formData.email}
                  className="w-full bg-gray-900 border border-gray-700 px-3 py-2 pl-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent transition duration-200"
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" 
                      size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  required
                  value={formData.password}
                  className="w-full bg-gray-900 border border-gray-700 px-3 py-2 pl-10 pr-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent transition duration-200"
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 
                             hover:text-gray-300 transition duration-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl 
                         text-white font-semibold transition-all duration-200 
                         flex items-center justify-center gap-2 shadow-sm 
                         active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {isSignup ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignup ? "Create Account" : "Sign In"
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <Link 
                to={isSignup ? "/login" : "/signup"}
                className="text-blue-400 hover:text-blue-300 transition duration-200 
                           font-semibold"
              >
                {isSignup ? "Sign In" : "Sign Up"}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Hint */}
        <p className="text-center text-gray-500 text-xs">
          Default: owner@ethiopos.com / owner123
        </p>
      </div>
    </div>
  );
};

export default AuthPage;