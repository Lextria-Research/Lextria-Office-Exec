// src/features/auth/LoginView.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { SEEDED_TEST_USERS, setStoredUser, UserProfile, TEST_PASSWORDS } from '../../lib/auth';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('oe@lextria-demo.test');
  const [password, setPassword] = useState(TEST_PASSWORDS['oe@lextria-demo.test'] || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = async (user: UserProfile) => {
    setEmail(user.email);
    const pwd = TEST_PASSWORDS[user.email.toLowerCase()] || '';
    setPassword(pwd);
    setError(null);

    // If test password exists and client configured, perform immediate sign-in for seamless 1-click test login
    if (pwd && isSupabaseConfigured) {
      setLoading(true);
      try {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: user.email.toLowerCase(),
          password: pwd,
        });

        if (authErr) {
          throw new Error(authErr.message);
        }

        if (data?.user) {
          setStoredUser(user);
          navigate('/');
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const matchedProfile = SEEDED_TEST_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    const pwd = password.trim() || TEST_PASSWORDS[normalizedEmail] || '';
    if (!pwd) {
      setError('Please provide a password.');
      setLoading(false);
      return;
    }

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase client is not configured.');
      }

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pwd,
      });

      if (authErr) {
        throw new Error(authErr.message);
      }

      if (data?.user) {
        const profile: UserProfile = matchedProfile || {
          id: data.user.id,
          email: data.user.email || normalizedEmail,
          display_name: data.user.user_metadata?.display_name || normalizedEmail.split('@')[0],
          role: data.user.user_metadata?.role || 'OFFICE_EXEC',
          department: data.user.user_metadata?.department || 'OFFICE',
          is_finance_lead: false,
          active: true,
        };
        setStoredUser(profile);
        navigate('/');
        return;
      }

      throw new Error('No user returned from authentication.');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl tracking-tight shadow-md">
            LX
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Lextria Office Executive
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Employee Portal & Operations Dashboard (AUTH_MODE=test)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employee Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    const p = TEST_PASSWORDS[e.target.value.trim().toLowerCase()];
                    if (p) setPassword(p);
                  }}
                  placeholder="employee@lextria-demo.test"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-hidden disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <span>Authenticating with Supabase...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick employee role picker */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>1-Click Test Logins (Auto-Sign In)</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SEEDED_TEST_USERS.map((u) => {
                const isSelected = email.toLowerCase() === u.email.toLowerCase();
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={loading}
                    onClick={() => handleRoleSelect(u)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{u.display_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium hover:underline">
                        Sign In →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
