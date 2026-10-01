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
} from "lucide-react";

interface NavbarProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedMessage?: string | null;
  stats?: VaultStats | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
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
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand with Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-md shadow-teal-900/30">
            <Shield className="h-5 w-5 text-white" />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500 animate-pulse"
              title="Gateway Active"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white sm:text-lg">
                Dawvix Vault
              </span>
              <span className="rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-teal-400">
                GATEWAY
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Live Stats */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Live Vault Stats Pills */}
          {stats && (
            <div className="hidden md:flex items-center gap-2 mr-1">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 shadow-inner">
                <Files className="h-3.5 w-3.5 text-teal-400" />
                <span>
                  <strong className="font-semibold text-white">
                    {stats.totalFiles}
                  </strong>{" "}
                  files
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 shadow-inner">
                <HardDrive className="h-3.5 w-3.5 text-teal-400" />
                <span>
                  <strong className="font-semibold text-white">
                    {formatBytes(stats.totalBytes)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Sync Button */}
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-teal-950/50 transition-all hover:from-teal-500 hover:to-teal-400 hover:shadow-teal-900/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            title="Recursively sync files and metadata from target Google Drive"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span>{isSyncing ? "Syncing..." : "Sync Drive"}</span>
          </button>

          {/* Profile & Dropdown Menu */}
          <div
            className="relative border-l border-slate-800 pl-2.5 sm:pl-3"
            ref={dropdownRef}
          >
            <button
              type="button"
              onClick={() => setShowUserDropdown((prev) => !prev)}
              aria-expanded={showUserDropdown}
              aria-label="User menu"
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-[10px] font-bold text-teal-300">
                {userInitial}
              </div>
              <span className="hidden font-medium text-slate-200 sm:inline">
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
              <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2">
                <div className="border-b border-slate-800/80 px-3 py-2.5">
                  <p className="text-[11px] font-medium text-slate-400">
                    Signed in as
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {user?.username || "Authenticated User"}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
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
      {lastSyncedMessage && !bannerDismissed && (
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
