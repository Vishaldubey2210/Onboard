import Link from 'next/link';
import { 
  Zap, Shield, BarChart3, MessageSquare, Upload, Brain, CheckCircle, 
  ArrowRight, Sparkles, Clock, Users, FileCheck
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div>
      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/10 rounded-full text-sm font-medium text-indigo-300 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              AI-Powered Fleet Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
              Driver Onboarding,{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Reimagined
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Automate your entire driver onboarding pipeline with AI agents that process documents, 
              verify identities, and manage communications — all in real-time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-200">
                Sign In
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>5min Avg Onboarding</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Platform Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything you need to onboard at scale</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">From document verification to AI-powered communications, our platform handles the complete onboarding lifecycle.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <MessageSquare className="w-6 h-6" />, title: 'Multi-Channel AI', desc: 'Process WhatsApp, Email, Call inputs through intelligent AI agents that understand context.', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
            { icon: <FileCheck className="w-6 h-6" />, title: 'Document Verification', desc: 'Automated Aadhaar, RC, and bank detail verification with AI-powered fraud detection.', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            { icon: <BarChart3 className="w-6 h-6" />, title: 'Real-Time Analytics', desc: 'Track funnel conversions, city-wise performance, and SLA compliance in real-time.', color: 'bg-amber-50 text-amber-600 border-amber-100' },
            { icon: <Brain className="w-6 h-6" />, title: 'AI Assistant', desc: 'Conversational AI that answers driver queries, suggests next steps, and provides status updates.', color: 'bg-purple-50 text-purple-600 border-purple-100' },
          ].map(f => (
            <div key={f.title} className="group p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className={`w-12 h-12 ${f.color} rounded-xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Four steps to fully onboarded</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Our AI-powered pipeline takes drivers from application to approved in minutes, not days.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Driver Registers', desc: 'Self-service signup with basic details and phone verification.', icon: <Users className="w-6 h-6" /> },
              { step: '02', title: 'Upload Documents', desc: 'Aadhaar, Vehicle RC, and bank details uploaded through our secure portal.', icon: <Upload className="w-6 h-6" /> },
              { step: '03', title: 'AI Verification', desc: 'Multi-agent pipeline processes, validates, and scores the application.', icon: <Brain className="w-6 h-6" /> },
              { step: '04', title: 'Fully Onboarded', desc: 'Admin approves and driver is ready to start operating on the platform.', icon: <CheckCircle className="w-6 h-6" /> },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-700 to-transparent" />}
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6">
                    {s.icon}
                  </div>
                  <div className="text-xs font-bold text-indigo-400 tracking-widest mb-2">STEP {s.step}</div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Why OnboardAI</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Built for speed, designed for scale</h2>
            <div className="space-y-6">
              {[
                { title: '10x Faster Onboarding', desc: 'Reduce average onboarding time from days to under 5 minutes with automated AI verification.' },
                { title: '90% Less Manual Work', desc: 'AI agents handle document processing, communication, and status tracking automatically.' },
                { title: 'Complete Transparency', desc: 'Real-time dashboards, audit trails, and AI explainability give you full visibility into every decision.' },
              ].map(b => (
                <div key={b.title} className="flex gap-4">
                  <div className="shrink-0 mt-1">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{b.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100">
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">Live Metrics</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Real-time
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-black text-indigo-600">2,847</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Drivers Onboarded</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-black text-emerald-600">94.2%</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Approval Rate</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-black text-amber-600">4.2m</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Avg Processing</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-black text-purple-600">12</div>
                  <div className="text-xs text-slate-500 font-medium mt-1">Active Cities</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500"><span>Funnel Progress</span><span className="font-bold text-slate-900">78%</span></div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-[78%] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to transform your onboarding?</h2>
          <p className="text-indigo-200 mb-8 max-w-xl mx-auto">Join hundreds of fleet operators who have already automated their driver onboarding with AI.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5">
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">OnboardAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/login" className="hover:text-white transition">Login</Link>
              <Link href="/login" className="hover:text-white transition">Sign Up</Link>
              <span className="text-slate-600">•</span>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
            <p className="text-xs text-slate-600">© 2026 OnboardAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
