/**
 * Register Component
 * Standalone registration page - Dark Theme
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import API from '../api/axios';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateField = (field, value) => {
    const errors = { ...fieldErrors };
    
    switch (field) {
      case 'name':
        if (value.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else {
          delete errors.name;
        }
        break;
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required';
        } else if (!isValidEmail(value)) {
          errors.email = 'Please enter a valid email';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else {
          delete errors.password;
        }
        break;
      default:
        break;
    }
    
    setFieldErrors(errors);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email.trim() || !isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      await API.post('/auth/signup', formData);
      setSuccess('Registration successful! Redirecting to login...');
      setFormData({ name: '', email: '', password: '' });

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br 
                    from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 
                          rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 
                          shadow-lg shadow-blue-500/20 mb-4 md:mb-6">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            EthioPOS <span className="text-blue-500">PRO</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Create your account to get started
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800 border border-gray-700 p-6 md:p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl 
                              text-green-400 text-sm flex items-start gap-2">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl 
                              text-red-400 text-sm flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  className={`w-full bg-gray-900 border px-3 py-2.5 pl-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:border-transparent 
                             transition duration-200 ${
                               fieldErrors.name 
                                 ? 'border-red-500 focus:ring-red-500' 
                                 : 'border-gray-700 focus:ring-blue-500'
                             }`}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onBlur={(e) => validateField('name', e.target.value)}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  className={`w-full bg-gray-900 border px-3 py-2.5 pl-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:border-transparent 
                             transition duration-200 ${
                               fieldErrors.email 
                                 ? 'border-red-500 focus:ring-red-500' 
                                 : 'border-gray-700 focus:ring-blue-500'
                             }`}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={(e) => validateField('email', e.target.value)}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  className={`w-full bg-gray-900 border px-3 py-2.5 pl-10 pr-10 
                             rounded-xl text-white placeholder-gray-500 
                             focus:outline-none focus:ring-2 focus:border-transparent 
                             transition duration-200 ${
                               fieldErrors.password 
                                 ? 'border-red-500 focus:ring-red-500' 
                                 : 'border-gray-700 focus:ring-blue-500'
                             }`}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={(e) => validateField('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 
                             hover:text-gray-300 transition duration-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Info Note */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-400 text-xs">
                Note: Your account will need approval from the owner before you can access all features.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 
                         hover:from-blue-700 hover:to-blue-800 
                         px-4 py-3 rounded-xl text-white font-semibold 
                         transition-all duration-200 flex items-center justify-center gap-2 
                         shadow-lg shadow-blue-500/20 active:scale-95 
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle to Login */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 transition duration-200 
                           font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;