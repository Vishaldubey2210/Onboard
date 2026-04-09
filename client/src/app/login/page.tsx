'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Zap, Mail, Lock, User, Phone, Truck, Shield, ArrowRight, Eye, EyeOff, X, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('DRIVER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const redirectByRole = (user: any) => {
    if (user.role === 'DRIVER') router.push('/driver');
    else router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        redirectByRole(res.user);
      } else {
        const res = await api.register({ name, email, password, role, phone, orgName });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        redirectByRole(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Simulate Google login with a demo admin user
    const demoUser = { id: 'demo-google', name: 'Demo User', email: 'demo@onboardai.com', role: 'ADMIN' };
    localStorage.setItem('token', 'demo-google-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify(demoUser));
    router.push('/dashboard');
  };

  // ── Forgot Password Modal ──
  if (showForgot) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 animate-fade-in-up">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
                <p className="text-sm text-slate-500">We've sent password reset instructions to <span className="font-semibold text-slate-700">{forgotEmail}</span></p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="btn-primary w-full">
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Forgot Password?</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter your email and we'll send you a reset link</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <button onClick={() => setForgotSent(true)} className="btn-primary w-full">
                    Send Reset Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Card */}
        <div className="glass-card p-8 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-slate-900">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isLogin ? 'Sign in to continue to OnboardAI' : 'Get started with your onboarding journey'}
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400 font-medium">or continue with email</span></div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm animate-fade-in">
              <X className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className="input pl-10" placeholder="Rajesh Kumar" />
                  </div>
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="input pl-10" placeholder="9876543210" />
                  </div>
                </div>
                {role === 'ADMIN' && (
                  <div>
                    <label className="label">Company Name</label>
                    <div className="relative">
                      <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" required={role === 'ADMIN'} value={orgName} onChange={(e) => setOrgName(e.target.value)}
                        className="input pl-10" placeholder="Acme Logistics" />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                {isLogin && (
                  <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role selector for signup */}
            {!isLogin && (
              <div>
                <label className="label">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole('DRIVER')}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      role === 'DRIVER' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <Truck className={`w-6 h-6 mx-auto mb-2 ${role === 'DRIVER' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className={`text-sm font-bold ${role === 'DRIVER' ? 'text-indigo-700' : 'text-slate-600'}`}>Driver</div>
                    <div className="text-xs text-slate-400 mt-0.5">Self onboard</div>
                  </button>
                  <button type="button" onClick={() => setRole('ADMIN')}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      role === 'ADMIN' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <Shield className={`w-6 h-6 mx-auto mb-2 ${role === 'ADMIN' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className={`text-sm font-bold ${role === 'ADMIN' ? 'text-indigo-700' : 'text-slate-600'}`}>Admin</div>
                    <div className="text-xs text-slate-400 mt-0.5">Manage platform</div>
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full h-12 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-semibold text-indigo-600 hover:text-indigo-500">{isLogin ? 'Sign up' : 'Sign in'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
