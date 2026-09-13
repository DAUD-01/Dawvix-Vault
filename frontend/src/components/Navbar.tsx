import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, RefreshCw, LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedMessage?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  isSyncing,
  lastSyncedMessage,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-md shadow-teal-900/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white sm:text-lg">
                University Vault
              </span>
              <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-teal-400">
                GATEWAY
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Secure Cloud Stream & Proxy Explorer
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Sync Button */}
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-teal-950/50 transition-all hover:from-teal-500 hover:to-teal-400 hover:shadow-teal-900/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            title="Recursively sync files and metadata from target Google Drive"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Drive'}</span>
          </button>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <UserIcon className="h-3.5 w-3.5 text-teal-400" />
              <span className="font-medium text-slate-200">{user?.username || 'User'}</span>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-xs font-medium text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {lastSyncedMessage && (
        <div className="border-t border-teal-500/20 bg-teal-950/40 px-4 py-1.5 text-center text-xs text-teal-300">
          {lastSyncedMessage}
        </div>
      )}
    </header>
  );
};
