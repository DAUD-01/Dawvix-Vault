import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { Shield, Lock, User, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await authService.login(username.trim(), password);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Authentication failed. Please verify credentials or backend connection.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-xl shadow-teal-900/40">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            University Vault
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Bypass campus network blocklists with authenticated proxy streaming
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {errorMessage && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider"
              >
                Username
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/50 transition-all hover:from-teal-400 hover:to-emerald-500 hover:shadow-teal-900/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Enter Vault</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Preset Credentials Hint */}
          <div className="mt-6 border-t border-slate-800/80 pt-4">
            <div className="flex items-start gap-2 rounded-xl bg-slate-950/50 p-3 text-xs text-slate-400 border border-slate-800/50">
              <KeyRound className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300">Initial Setup Credentials:</span>
                <p className="mt-0.5 text-slate-400">
                  Username: <code className="text-teal-300">admin</code> | Password: <code className="text-teal-300">admin123</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
