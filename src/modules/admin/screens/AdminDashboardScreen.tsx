import { useEffect, useState, useCallback } from 'react';
import {
  getAllAssessors,
  preRegisterAssessor,
  toggleAssessorActive,
  type PreRegisteredAssessor,
} from '../../../services/supabaseService';

// Standalone admin portal — NOT part of the client/trainer/assessment modules.
// Simple hardcoded-credential MVP gate (no Supabase Auth). Production should
// move this to real admin auth backed by the admin_users table.
const ADMIN_EMAIL = 'admin@wellnessconnect.in';
const ADMIN_PASSWORD = 'WellnessAdmin@2026';

const TEAL = '#00897B';
const GREEN = '#16A34A';
const RED = '#DC2626';
const GRAY = '#6B7280';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// E.164 "+919876543210" -> "+91 98765 43210"
function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return e164;
}

export default function AdminDashboardScreen() {
  const [view, setView] = useState<'login' | 'dashboard'>('login');

  // ── Login state ──
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // ── Add-assessor form state ──
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Assessor list state ──
  const [assessors, setAssessors] = useState<PreRegisteredAssessor[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadAssessors = useCallback(async () => {
    setIsLoadingList(true);
    const data = await getAllAssessors();
    setAssessors(data);
    setIsLoadingList(false);
  }, []);

  useEffect(() => {
    if (view === 'dashboard') {
      loadAssessors();
    }
  }, [view, loadAssessors]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setLoginError('');
      setPassword('');
      setView('dashboard');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleSignOut = () => {
    setView('login');
    setPassword('');
    setFullName('');
    setPhone('');
    setFormError('');
    setFormSuccess('');
  };

  const handleAddAssessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const name = fullName.trim();
    const digits = phone.replace(/\D/g, '');

    if (!name) {
      setFormError('Please enter the assessor’s full name.');
      return;
    }
    if (digits.length !== 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    const result = await preRegisterAssessor(name, digits);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess('✓ Assessor added successfully');
      setFullName('');
      setPhone('');
      loadAssessors();
    } else {
      setFormError(result.error ?? 'Could not add assessor. Please try again.');
    }
  };

  const handleToggle = async (assessor: PreRegisteredAssessor) => {
    setTogglingId(assessor.id);
    const ok = await toggleAssessorActive(assessor.id, !assessor.is_active);
    setTogglingId(null);
    if (ok) loadAssessors();
  };

  // ── Login view ──
  if (view === 'login') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#F3F4F6' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' }}
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: TEAL }}>
              WellnessConnect
            </h1>
            <p className="mt-1 text-sm" style={{ color: GRAY }}>Admin Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-gray-400"
                placeholder="admin@wellnessconnect.in"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-gray-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <p className="text-sm font-medium" style={{ color: RED }}>{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard view ──
  const activeCount = assessors.length;

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#F3F4F6' }}>
      {/* max-w-[600px] matches the previous inline maxWidth below lg; lg:+ widens the card */}
      <div className="mx-auto max-w-[600px] lg:max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>WellnessConnect Admin</h1>
            <p className="text-sm" style={{ color: GRAY }}>Assessment Team Management</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
            style={{ color: '#374151' }}
          >
            Sign Out
          </button>
        </div>

        {/* Add assessor card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: '#111827' }}>Add Assessor</h2>
          <form onSubmit={handleAddAssessor} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-gray-400"
                placeholder="e.g. Priya Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Phone Number</label>
              <div className="flex items-stretch">
                <span
                  className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 text-sm font-medium"
                  style={{ backgroundColor: '#F9FAFB', color: GRAY }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-r-lg border border-gray-300 outline-none focus:border-gray-400"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>
            </div>

            {formError && <p className="text-sm font-medium" style={{ color: RED }}>{formError}</p>}
            {formSuccess && <p className="text-sm font-medium" style={{ color: GREEN }}>{formSuccess}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {isSubmitting ? 'Adding…' : 'Add Assessor'}
            </button>
          </form>
        </div>

        {/* Assessors list */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: '#111827' }}>
            Registered Assessors ({activeCount})
          </h2>

          {isLoadingList ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-1/3" style={{ backgroundColor: '#E5E7EB' }} />
                    <div className="h-3 rounded w-1/2" style={{ backgroundColor: '#F3F4F6' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : assessors.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: GRAY }}>No assessors registered yet</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
              {assessors.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                    style={{ backgroundColor: TEAL }}
                  >
                    {initials(a.full_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate" style={{ color: '#111827' }}>{a.full_name}</span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={
                          a.is_active
                            ? { backgroundColor: '#DCFCE7', color: GREEN }
                            : { backgroundColor: '#FEE2E2', color: RED }
                        }
                      >
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {!a.linked_user_id && (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#F3F4F6', color: GRAY }}
                        >
                          Not yet signed in
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: GRAY }}>{formatPhone(a.phone)}</p>
                  </div>

                  <button
                    onClick={() => handleToggle(a)}
                    disabled={togglingId === a.id}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-60 shrink-0"
                    style={a.is_active ? { borderColor: '#FCA5A5', color: RED } : { borderColor: '#86EFAC', color: GREEN }}
                  >
                    {togglingId === a.id ? '…' : a.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
