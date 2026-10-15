import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { VaultStats } from "../types";
import { formatBytes } from "../utils/fileUtils";
import {
  Shield,
  RefreshCw,
  LogOut,
  HardDrive,
  Files,
  ChevronDown,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";

interface NavbarProps {
  onSync: () => Promise<void>;
  canSync: boolean;
  isSyncing: boolean;
  lastSyncedMessage?: string | null;
  stats?: VaultStats | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  canSync,
  isSyncing,
  lastSyncedMessage,
  stats,
}) => {
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset banner dismissal state when a new sync message arrives
  useEffect(() => {
    if (lastSyncedMessage) {
      setBannerDismissed(false);
    }
  }, [lastSyncedMessage]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#070a11]/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-md shadow-teal-500/20 ring-1 ring-white/20">
            <Shield className="h-4.5 w-4.5 text-slate-950 font-bold" />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#070a11] bg-teal-400"
              title="Active & Ready"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-white text-base">
              Dawvix Vault
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-teal-300">
              <Sparkles className="h-2.5 w-2.5" /> Pro
            </span>
          </div>
        </div>

        {/* Action Controls & Live Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Vault Stats Pills */}
          {stats && (
            <div className="hidden md:flex items-center gap-1.5 mr-1">
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-slate-300 hover:border-white/[0.1] transition-colors">
                <Files className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-slate-400">
                  <strong className="font-medium text-slate-200">
                    {stats.totalFiles}
                  </strong>{" "}
                  files
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-slate-300 hover:border-white/[0.1] transition-colors">
                <HardDrive className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-slate-400">
                  <strong className="font-medium text-slate-200">
                    {formatBytes(stats.totalBytes)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Sync Button */}
          {canSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-3 py-1.5 text-xs font-medium text-slate-950 shadow-sm shadow-teal-500/20 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              title="Sync items with Google Drive"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="font-semibold">{isSyncing ? "Syncing..." : "Sync"}</span>
            </button>
          )}

          {/* Profile & Dropdown Menu */}
          <div
            className="relative border-l border-white/[0.08] pl-2 sm:pl-2.5"
            ref={dropdownRef}
          >
            <button
              type="button"
              onClick={() => setShowUserDropdown((prev) => !prev)}
              aria-expanded={showUserDropdown}
              aria-label="User menu"
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300 transition-all hover:bg-white/[0.06] hover:border-white/[0.12]"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500/30 to-emerald-400/30 text-[10px] font-bold text-teal-300 ring-1 ring-teal-500/30">
                {userInitial}
              </div>
              <span className="hidden font-medium text-slate-200 sm:inline max-w-[100px] truncate">
                {user?.username || "User"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  showUserDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* User Menu Popover */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0c101a]/95 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b border-white/[0.08] px-3.5 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Signed in as
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-200 mt-0.5">
                    {user?.username || "Authenticated User"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    {user?.role === "admin" ? "Administrator" : "Read-only"}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {canSync && lastSyncedMessage && !bannerDismissed && (
        <div className="flex items-center justify-between border-t border-teal-500/20 bg-teal-950/40 px-4 py-1.5 text-xs text-teal-300">
          <div className="mx-auto flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            <span>{lastSyncedMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="p-0.5 text-teal-400/70 hover:text-teal-200 transition-colors"
            title="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
