import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export function ResetPassword() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing from the URL.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token,
        password
      });
      setSuccess(data.message || 'Password has been reset successfully!');
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#06070B] font-sans relative overflow-y-auto items-center justify-center p-6">
      
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />

      {/* Center Elevating Glass Card Container */}
      <div className="w-full max-w-[450px] bg-[#0E1017]/40 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-10 sm:p-12 lg:p-14 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col gap-8">
        
        {/* Form Header */}
        <div className="text-center flex flex-col gap-4 pt-10 pb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Reset Password
            </h2>
            <p className="text-xs text-[#8E939E] mt-2 leading-relaxed">
              Please enter your new password below.
            </p>
          </div>
        </div>

        {/* Reset Password Form */}
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
              <span className="text-[10px] text-gray-400 mt-1">Redirecting to login page...</span>
            </div>
          )}

          {/* New Password Input */}
          <div className="relative flex items-center group">
            <Lock size={16} className="absolute left-4 text-gray-500 z-10 pointer-events-none group-focus-within:text-purple-400 transition-colors duration-200" />
            <input 
              type={showPassword ? 'text' : 'password'} 
              name="password" 
              placeholder="New Password" 
              style={{ paddingLeft: '46px', paddingRight: '46px', height: '52px' }}
              className="w-full bg-[#0A0B0F]/90 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              disabled={loading || !!success}
            />
            <button 
              type="button" 
              className="absolute right-4 text-gray-500 hover:text-white transition-colors duration-200 z-10"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Confirm Password Input */}
          <div className="relative flex items-center group">
            <Lock size={16} className="absolute left-4 text-gray-500 z-10 pointer-events-none group-focus-within:text-purple-400 transition-colors duration-200" />
            <input 
              type={showConfirmPassword ? 'text' : 'password'} 
              name="confirmPassword" 
              placeholder="Confirm New Password" 
              style={{ paddingLeft: '46px', paddingRight: '46px', height: '52px' }}
              className="w-full bg-[#0A0B0F]/90 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all duration-200"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
              disabled={loading || !!success}
            />
            <button 
              type="button" 
              className="absolute right-4 text-gray-500 hover:text-white transition-colors duration-200 z-10"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{ height: '52px' }}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/20 rounded-xl text-sm font-semibold text-white tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_25px_rgba(124,58,237,0.45)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50" 
            disabled={loading || !!success}
          >
            {loading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD'}
          </button>
        </form>

        {/* Back to Login Footer Link */}
        <div className="text-center text-xs text-[#8E939E]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer bg-transparent border-0 outline-none"
          >
            Go to Sign In
          </button>
        </div>

      </div>

      {/* Blueprint Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.002)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.002)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />
    </div>
  );
}

export default ResetPassword;
