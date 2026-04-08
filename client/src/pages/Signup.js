/**
 * Signup Page Component
 * Premium Design - Fully Responsive
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import API from '../api/axios';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.name.trim()) {
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

    try {
      await API.post('/auth/signup', formData);
      
      // Auto-login after signup
      try {
        const loginRes = await API.post('/auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        localStorage.setItem('token', loginRes.data.token);
        localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        window.dispatchEvent(new Event('loginStateChange'));
        navigate('/pos');
      } catch (loginErr) {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative overflow-hidden">
      
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gray-500/5 blur-3xl rounded-full" />
      
      <div className="relative z-10 w-full max-w-md space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 
                          rounded-2xl bg-blue-600 shadow-lg mb-4 md:mb-6 
                          hover:rotate-6 transition-transform duration-300">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Join EthioPOS and start managing your business
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700 
                        p-6 md:p-8 rounded-2xl shadow-2xl">
          
          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl 
                              text-red-400 text-sm text-center font-medium animate-shake">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" 
                      size={18} />
                <input 
                  type="text"
                  required 
                  placeholder="Enter your full name"
                  value={formData.name}
                  className="w-full bg-gray-900 border border-gray-700 px-3 py-2 pl-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent transition duration-200"
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" 
                      size={18} />
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  value={formData.email}
                  className="w-full bg-gray-900 border border-gray-700 px-3 py-2 pl-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 
                             focus:border-transparent transition duration-200"
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" 
                      size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="Minimum 6 characters"
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
                         active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed 
                         group"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ChevronRight size={18} 
                                className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
            <p className="text-center text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-blue-400 hover:text-blue-300 transition duration-200 
                           font-semibold"
              >
                Sign In
              </Link>
            </p>
            
            <div className="flex items-center justify-center gap-2 text-gray-500 
                            bg-gray-900/50 px-3 py-2 rounded-xl border border-gray-700/50">
              <ShieldCheck size={14} className="text-green-500" />
              <span className="text-xs font-medium">256-bit Encrypted</span>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <p className="text-center text-gray-600 text-xs">
          © 2024 EthioPOS. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Signup;