
import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle, User as UserIcon, Loader2, ShieldCheck, ArrowLeft, X, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onAuth: (email: string, password: string, role: UserRole, isSignUp: boolean, name?: string) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onAuth }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  useEffect(() => {
    let effect: any = null;
    const initVanta = () => {
      if (!vantaEffect.current && vantaRef.current && (window as any).VANTA) {
        effect = (window as any).VANTA.NET({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x8b5cf6,
          backgroundColor: 0xf8fafc,
          points: 12.00,
          maxDistance: 22.00,
          spacing: 16.00
        });
        vantaEffect.current = effect;
      }
    };

    // Minor delay helps ensure the DOM element is fully ready when returning from another route
    const timeoutId = setTimeout(initVanta, 50);

    return () => {
      clearTimeout(timeoutId);
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  const roleOptions = [
    { value: UserRole.STUDENT, label: 'Student', icon: '👨‍🎓' },
    { value: UserRole.FACULTY, label: 'Faculty', icon: '👨‍🏫' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (isSignUp && !name) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      await onAuth(email, password, role, isSignUp, name);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password handler using Supabase password reset
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotMsg('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotMsg('');
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
        if (error) throw error;
        setForgotMsg('Password reset link sent! Check your email inbox.');
      } else {
        setForgotMsg('Password reset is not available in local mode. Please configure Supabase.');
      }
    } catch (err: any) {
      setForgotMsg(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Vanta 3D Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div ref={vantaRef} className="absolute inset-0 w-full h-full"></div>
      </div>

      {/* Animated Background Orbs (kept as subtle accents) */}
      <div className="blob bg-brand-200 w-96 h-96 rounded-full top-[-10%] left-[-10%] mix-blend-multiply opacity-40"></div>
      <div className="blob bg-fuchsia-200 w-96 h-96 rounded-full bottom-[-10%] right-[-10%] mix-blend-multiply opacity-40" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-md w-full relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-slate-200/50 rounded-full transition-colors backdrop-blur-sm"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="text-center mb-10 fade-in-up">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl shadow-xl shadow-brand-500/30 mb-6 hover:scale-110 transition-transform duration-500 cursor-default">
            <GraduationCap className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back!'}
          </h1>
          <p className="text-slate-600 mt-2 font-medium">EduPulse College Management System</p>
          <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/60 backdrop-blur-md text-emerald-700 rounded-full border border-emerald-200 shadow-sm text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Login
          </div>
        </div>

        <div className="glass-panel p-10 rounded-[2.5rem] shadow-glass relative overflow-hidden fade-in-up stagger-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Role Selector - Disabled if user is detected in database */}
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap justify-center opacity-transition">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    disabled={false}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${role === opt.value
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-50 ring-opacity-50'
                      : 'bg-white/50 text-slate-600 hover:bg-white/80 border border-slate-200/50 hover:shadow-sm'
                      }`}
                  >
                    <span className="mr-2">{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50/90 backdrop-blur border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium animate-in fade-in zoom-in duration-300 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                    placeholder="John Doe"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="name@college.edu"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative group flex items-center">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 focus:ring-offset-1 transition-all"
                  />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Stay logged in</span>
                </label>
                <button type="button" onClick={() => { setShowForgotPassword(true); setForgotMsg(''); setForgotEmail(email); }} className="text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline transition-all">Forgot?</button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] hover:shadow-brand-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-200/50 text-center relative z-10">
            <p className="text-sm text-slate-600 font-medium">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"} {' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-brand-600 font-bold hover:text-brand-700 hover:underline transition-all"
              >
                {isSignUp ? 'Sign In instead' : 'Request access'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900">Reset Password</h3>
              <button onClick={() => setShowForgotPassword(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6">Enter your email and we'll send you a link to reset your password.</p>
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="name@college.edu"
                />
              </div>
              {forgotMsg && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium ${forgotMsg.includes('sent') ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-600'}`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{forgotMsg}</span>
                </div>
              )}
              <button
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              >
                {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

