import React, { useState } from 'react';
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setSuccess(data.message || 'Password reset link sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#06070B] font-sans relative overflow-y-auto items-center justify-center p-6">
      
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />

      {/* Back to Login Button */}
      <button 
        onClick={() => navigate('/login')}
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-3 bg-transparent border-none text-gray-400 hover:text-white font-mono text-sm sm:text-base font-extrabold cursor-pointer transition-all duration-200"
      >
        <ArrowLeft size={20} />
        <span>Back to Login</span>
      </button>

      {/* Center Elevating Glass Card Container */}
      <div className="w-full max-w-[450px] bg-[#0E1017]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 sm:p-10 lg:p-12 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col gap-8">
        
        {/* Form Header */}
        <div className="text-center flex flex-col gap-4 pt-8 pb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Forgot Password
            </h2>
            <p className="text-xs text-[#8E939E] mt-2 leading-relaxed">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>

        {/* Forgot Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl font-mono text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl font-mono text-center flex flex-col items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="relative flex items-center group">
            <Mail size={16} className="absolute left-4 text-gray-500 z-10 pointer-events-none group-focus-within:text-purple-400 transition-colors duration-200" />
            <input 
              type="email" 
              name="email" 
              placeholder="Email Address" 
              style={{ paddingLeft: '46px', paddingRight: '16px', height: '52px' }}
              className="w-full bg-[#0A0B0F]/90 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              disabled={loading || !!success}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{ height: '52px' }}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/20 rounded-xl text-sm font-semibold text-white tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_25px_rgba(124,58,237,0.45)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50" 
            disabled={loading || !!success}
          >
            {loading ? 'SENDING RESET LINK...' : 'SEND RESET LINK'}
          </button>
        </form>

        {/* Back to Login Footer Link */}
        <div className="text-center text-xs text-[#8E939E]">
          <span>
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer bg-transparent border-0 outline-none"
            >
              Sign In
            </button>
          </span>
        </div>

      </div>

      {/* Blueprint Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.002)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.002)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />
    </div>
  );
}

export default ForgotPassword;
