'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Shield, Camera, Save, ArrowLeft, Calendar } from 'lucide-react';
import { Avatar, showToast } from '@/components/ui';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      setForm({ name: parsed.name || '', email: parsed.email || '', phone: parsed.phone || '' });
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleSave = () => {
    // Save to localStorage (in production, would call API)
    const updatedUser = { ...user, ...form };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setEditing(false);
    showToast('Profile updated successfully', 'success');
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Back button */}
      <button onClick={() => router.back()} className="btn-ghost -ml-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Header Card */}
      <div className="card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-500 to-purple-600" />
        <div className="relative z-10 flex flex-col items-center pt-12">
          <div className="relative group">
            <Avatar name={user.name} size="lg" />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-4">{user.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Shield className="w-3 h-3" />
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Profile Information</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-sm">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <ProfileField
            icon={<User className="w-4 h-4" />}
            label="Full Name"
            value={form.name}
            editing={editing}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <ProfileField
            icon={<Mail className="w-4 h-4" />}
            label="Email Address"
            value={form.email}
            editing={editing}
            onChange={(v) => setForm({ ...form, email: v })}
            type="email"
          />
          <ProfileField
            icon={<Phone className="w-4 h-4" />}
            label="Phone Number"
            value={form.phone}
            editing={editing}
            onChange={(v) => setForm({ ...form, phone: v })}
            type="tel"
            placeholder="Not provided"
          />
          <div className="flex items-center gap-4 py-3 border-t border-slate-100">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 font-medium">Role</div>
              <div className="text-sm font-semibold text-slate-900">{user.role}</div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">Read-only</span>
          </div>
          <div className="flex items-center gap-4 py-3 border-t border-slate-100">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 font-medium">Member Since</div>
              <div className="text-sm font-semibold text-slate-900">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-red-200">
        <h3 className="text-sm font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all associated data.</p>
        <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value, editing, onChange, type = 'text', placeholder = '' }: {
  icon: React.ReactNode; label: string; value: string; editing: boolean;
  onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-t border-slate-100">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        {editing ? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input mt-1 text-sm"
            placeholder={placeholder || label}
          />
        ) : (
          <div className="text-sm font-semibold text-slate-900">{value || <span className="text-slate-400 font-normal">{placeholder || 'Not set'}</span>}</div>
        )}
      </div>
    </div>
  );
}
