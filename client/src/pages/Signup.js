import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, Loader2, ShieldCheck, ChevronRight, Globe } from 'lucide-react';
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

    try {
      await API.post('/auth/signup', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] font-sans relative overflow-hidden p-6 selection:bg-indigo-500/30">
      
      {/* --- AMBIENT LIGHTING (Luxury Depth) --- */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-slate-500/5 blur-[100px] rounded-full" />
      
      <div className="relative z-10 w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* --- BRANDING HEADER --- */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mb-6 group hover:border-indigo-500/50 transition-colors duration-500">
            <Globe className="text-indigo-400 group-hover:rotate-12 transition-transform duration-500" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-slate-200 font-serif italic">Executive</span> Account
          </h1>
          <p className="text-slate-400 text-sm mt-3 font-medium tracking-wide">Enter your professional credentials to begin</p>
        </div>

        {/* --- MAIN FORM CONTAINER (Glassmorphism) --- */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
          
          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-semibold text-center animate-shake">
                {error}
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  required 
                  className="w-full bg-slate-950/40 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-300"
                  placeholder="Full name as it appears on ID"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Work Email Address</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="email" required 
                  className="w-full bg-slate-950/40 border border-slate-800 p-4 pl-12 rounded-2xl text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-300"
                  placeholder="name@organization.com"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Security Access Pin</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} required 
                  className="w-full bg-slate-950/40 border border-slate-800 p-4 pl-12 pr-12 rounded-2xl text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-300"
                  placeholder="Minimum 8 characters"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              disabled={loading} 
              className="group w-full relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-bold text-base transition-all duration-300 active:scale-[0.98] shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Initialize System Access</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-slate-500 text-sm font-medium">
              Existing administrator? <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors underline-offset-4 hover:underline">Sign In</Link>
            </p>
            
            <div className="flex items-center gap-2 text-slate-600 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Secure 256-bit Encrypted Setup</span>
            </div>
          </div>
        </div>
        
        {/* Subtle Bottom Footer */}
        <p className="text-center mt-8 text-slate-600 text-xs font-medium tracking-wide">
          © 2026 EthioPOS Systems. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Signup;