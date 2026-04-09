'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { 
  Zap, LayoutDashboard, Users, Upload, FlaskConical, Truck, 
  ChevronDown, LogOut, User, Settings 
} from 'lucide-react';
import { Avatar } from './ui';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; email?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!token || !u) {
      if (pathname !== '/login' && pathname !== '/') {
        router.push('/login');
      }
    } else {
      setUser(JSON.parse(u));
    }
  }, [pathname, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  if (pathname === '/login' || pathname === '/') return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navLinkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(href)
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-lg">OnboardAI</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {user?.role === 'DRIVER' ? (
                <Link href="/driver" className={navLinkClass('/driver')}>
                  <Truck className="w-4 h-4" />
                  My Onboarding
                </Link>
              ) : (
                <>
                  <Link href="/dashboard" className={navLinkClass('/dashboard')}>
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link href="/leads" className={navLinkClass('/leads')}>
                    <Users className="w-4 h-4" />
                    Applications
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link href="/upload" className={navLinkClass('/upload')}>
                      <Upload className="w-4 h-4" />
                      Import
                    </Link>
                  )}
                  <Link href="/simulate" className={navLinkClass('/simulate')}>
                    <FlaskConical className="w-4 h-4" />
                    Sandbox
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Avatar name={user.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{user.role}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-2 animate-fade-in z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email || user.role}</div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    View Profile
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
