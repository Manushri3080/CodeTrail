import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Activity, Cpu, Terminal, ArrowLeft, User, Users, Globe, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(location.state?.signUp || false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp 
      ? { name: formData.name, email: formData.email, password: formData.password }
      : { email: formData.email, password: formData.password };

    try {
      const { data } = await axios.post(`http://localhost:5000${endpoint}`, payload);
      onLoginSuccess(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/google', {
        token: credentialResponse.credential
      });
      onLoginSuccess(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#06070B] font-sans relative overflow-y-auto lg:overflow-hidden">
      
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />

      {/* LEFT PANEL: System Status & Telemetry Dashboard */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-16 bg-[#090A0F] border-r border-white/[0.03] relative">
        <div className="max-w-[540px] z-10 flex flex-col gap-6">
          
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8" style={{ padding: '8px 20px', marginBottom: '12px' }}>
              <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-pulse"></span>
              <span className="font-mono text-[10px] font-bold text-purple-400 uppercase tracking-widest">Engine telemetry</span>
            </div>
            
            <h1 className="text-4xl font-extrabold text-white tracking-tight leading-[1.2]" style={{ marginBottom: '24px' }}>
              Collaborative Editing <br />
              <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                & Real-time Sandbox
              </span>
            </h1>
            
            <p className="text-[#8E939E] text-sm leading-relaxed font-normal">
              An integrated web platform designed for simultaneous multi-user code development. 
              CodeTrail handles live editor syncing, runs compiles in secure remote sandboxes, 
              and tracks contribution changes with cryptographic SHA-256 signatures.
            </p>
          </div>

          {/* System Telemetry Status Dashboard (Elevated Glass Card) */}
          <div className="bg-[#0E1017]/80 backdrop-blur-md rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-8" style={{ padding: '28px 32px' }}>
            <div className="flex justify-between items-center pb-6">
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-200 tracking-wider relative">
                <span className="w-2 h-2 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981] animate-ping"></span>
                <span className="w-2 h-2 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981] absolute"></span>
                <span className="ml-6">SYSTEM STATUS</span>
              </div>
              <span className="font-mono text-[10px] text-[#10B981] bg-[#10B981]/10 rounded-full border border-[#10B981]/20 font-bold tracking-wider" style={{ padding: '8px 18px', display: 'inline-block' }}>ACTIVE</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              
              <div className="bg-[#131520] border border-white/[0.03] hover:border-purple-500/20 rounded-2xl flex flex-col gap-2 transition-all duration-300" style={{ padding: '20px 24px 20px 32px' }}>
                <Users size={16} className="text-[#a855f7] mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Users</span>
                <span className="text-xl font-bold text-white tracking-tight">10,000+</span>
                <span className="font-mono text-[9px] text-[#8E939E] mt-0.5">Active Creators</span>
              </div>

              <div className="bg-[#131520] border border-white/[0.03] hover:border-purple-500/20 rounded-2xl flex flex-col gap-2 transition-all duration-300" style={{ padding: '20px 24px 20px 32px' }}>
                <Globe size={16} className="text-[#a855f7] mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Projects Synced</span>
                <span className="text-xl font-bold text-white tracking-tight">48K+</span>
                <span className="font-mono text-[9px] text-[#8E939E] mt-0.5">Cloud Backed</span>
              </div>

              <div className="bg-[#131520] border border-white/[0.03] hover:border-purple-500/20 rounded-2xl flex flex-col gap-2 transition-all duration-300" style={{ padding: '20px 24px 20px 32px' }}>
                <ShieldCheck size={16} className="text-[#a855f7] mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Uptime SLA</span>
                <span className="text-xl font-bold text-white tracking-tight">99.99%</span>
                <span className="font-mono text-[9px] text-[#8E939E] mt-0.5">Guaranteed Online</span>
              </div>

              <div className="bg-[#131520] border border-white/[0.03] hover:border-purple-500/20 rounded-2xl flex flex-col gap-2 transition-all duration-300" style={{ padding: '20px 24px 20px 32px' }}>
                <MessageSquare size={16} className="text-[#a855f7] mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Support Status</span>
                <span className="text-xl font-bold text-white tracking-tight">24/7/365</span>
                <span className="font-mono text-[9px] text-[#8E939E] mt-0.5">Dedicated Help</span>
              </div>

            </div>
          </div>
        </div>

        {/* Blueprint Grid Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      </div>

      {/* RIGHT PANEL: Premium Glass-styled Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#06070B] relative min-h-screen lg:min-h-0 overflow-y-auto">
        
        {/* Back to Home Button (Stylized Navigation Link) */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-3 bg-transparent border-none text-gray-400 hover:text-white font-mono text-sm sm:text-base font-extrabold cursor-pointer transition-all duration-200"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        {/* Center Elevating Glass Card Container */}
        <div className="w-full max-w-[450px] bg-[#0E1017]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 sm:p-10 lg:p-12 my-16 lg:my-0 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col gap-8">
          
          {/* Form Header */}
          <div className="text-center flex flex-col gap-4 pt-8 pb-2">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {isSignUp ? 'Create Account' : 'Access CodeTrail'}
              </h2>
              <p className="text-xs text-[#8E939E] mt-2 leading-relaxed">
                {isSignUp 
                  ? 'Sign up to configure your workspace and start compiling.' 
                  : 'Authenticate to synchronize your project configurations and start compiling.'}
              </p>
            </div>
          </div>

          {/* Traditional Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl font-mono text-center">
                {error}
              </div>
            )}

            {/* Name Input wrapper (Sign Up Only) */}
            {isSignUp && (
              <div className="relative flex items-center group">
                <User size={16} className="absolute left-4 text-gray-500 z-10 pointer-events-none group-focus-within:text-purple-400 transition-colors duration-200" />
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Full Name" 
                  style={{ paddingLeft: '46px', paddingRight: '16px', height: '52px' }}
                  className="w-full bg-[#0A0B0F]/90 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all duration-200"
                  value={formData.name}
                  onChange={handleChange}
                  required 
                />
              </div>
            )}

            {/* Email Input wrapper */}
            <div className="relative flex items-center group">
              <Mail size={16} className="absolute left-4 text-gray-500 z-10 pointer-events-none group-focus-within:text-purple-400 transition-colors duration-200" />
              <input 
                type="email" 
                name="email" 
                placeholder="Email Address" 
                style={{ paddingLeft: '46px', paddingRight: '16px', height: '52px' }}
                className="w-full bg-[#0A0B0F]/90 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all duration-200"
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>

            {/* Password Input wrapper */}
            <div className="relative flex items-center group">
              <Lock size={16} className="absolute left-4 text-gray-500 z-10 pointer-events-none group-focus-within:text-purple-400 transition-colors duration-200" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                placeholder="Password" 
                style={{ paddingLeft: '46px', paddingRight: '46px', height: '52px' }}
                className="w-full bg-[#0A0B0F]/90 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all duration-200"
                value={formData.password}
                onChange={handleChange}
                required 
              />
              <button 
                type="button" 
                className="absolute right-4 text-gray-500 hover:text-white transition-colors duration-200 z-10"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Forgot Password Link (Sign In Only) */}
            {!isSignUp && (
              <div className="flex justify-end text-xs" style={{ marginTop: '-8px' }}>
                <button 
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-purple-400 hover:text-purple-300 transition-colors bg-transparent border-0 outline-none cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button (Gradient Glowing) */}
            <button 
              type="submit" 
              style={{ height: '52px' }}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/20 rounded-xl text-sm font-semibold text-white tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_25px_rgba(124,58,237,0.45)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50" 
              disabled={loading}
            >
              {loading 
                ? (isSignUp ? 'CREATING ACCOUNT...' : 'AUTHENTICATING...') 
                : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
            </button>
          </form>

          {/* Styled Border Divider */}
          <div className="flex items-center text-[10px] font-mono font-bold text-gray-500 tracking-wider before:flex-1 before:border-b before:border-white/[0.05] before:mr-4 after:flex-1 after:border-b after:border-white/[0.05] after:ml-4">
            OR {isSignUp ? 'SIGN UP' : 'SIGN IN'} WITH
          </div>

          {/* Google OAuth Button centering wrapper */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign-In Failed')}
              theme="filled_dark"
              shape="pill"
              width="350"
              size="large"
            />
          </div>

          {/* Bottom Switch Link */}
          <div className="text-center text-xs text-[#8E939E]">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer bg-transparent border-0 outline-none"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer bg-transparent border-0 outline-none"
                >
                  Sign Up
                </button>
              </span>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default LoginPage;
