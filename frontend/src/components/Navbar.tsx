import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_THEME_SEED,
  DEFAULT_THEME,
  SavedTheme,
  useTheme,
} from "../context/ThemeContext";
import { Breadcrumbs } from "./Breadcrumbs";
import { BreadcrumbItem } from "../types";
import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
} from "@material/material-color-utilities";
import {
  RefreshCw,
  LogOut,
  ChevronDown,
  CheckCircle2,
  X,
  Palette,
  RotateCcw,
  Sun,
  Moon,
  Check,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Layers,
} from "lucide-react";

const PRESET_COLORS = [
  { name: "Teal", color: DEFAULT_THEME_SEED },
  { name: "Blue", color: "#4285F4" },
  { name: "Purple", color: "#6750A4" },
  { name: "Green", color: "#2E7D32" },
  { name: "Rose", color: "#C2185B" },
  { name: "Amber", color: "#B45309" },
];

interface NavbarProps {
  onSync: () => Promise<void>;
  canSync: boolean;
  syncStatus: 'idle' | 'syncing' | 'pending' | 'error';
  lastSyncedAt: string | null;
  lastSyncedMessage?: string | null;
  showBreadcrumbs: boolean;
  breadcrumbs: BreadcrumbItem[];
  onSelectFolder: (folderId: string, index: number) => void;
  onDropOnFolder: (targetFolderId: string, itemIds: string[]) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSync,
  canSync,
  syncStatus,
  lastSyncedAt,
  lastSyncedMessage,
  showBreadcrumbs,
  breadcrumbs,
  onSelectFolder,
  onDropOnFolder,
}) => {
  const { user, logout } = useAuth();
  const {
    savedTheme,
    bgImageUrl,
    previewTheme,
    saveTheme,
    discardThemePreview,
    uploadBgImage,
    removeBgImage,
  } = useTheme();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [draftTheme, setDraftTheme] = useState<SavedTheme>(savedTheme);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const themeTriggerRef = useRef<HTMLButtonElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const validDraft = /^#[\da-f]{6}$/i.test(draftTheme.seedColor);
  const previewPalette = useMemo(
    () =>
      validDraft
        ? themeFromSourceColor(argbFromHex(draftTheme.seedColor)).palettes.primary
        : null,
    [draftTheme.seedColor, validDraft],
  );

  const updateDraftTheme = (change: Partial<SavedTheme>) => {
    const next = { ...draftTheme, ...change };
    setDraftTheme(next);
    if (/^#[\da-f]{6}$/i.test(next.seedColor)) {
      try {
        previewTheme(next);
        setThemeError(null);
      } catch (error) {
        console.error("Failed to preview theme", error);
        setThemeError("Unable to preview these appearance settings.");
      }
    }
  };

  const handleCancelTheme = (restoreFocus = false) => {
    discardThemePreview();
    setDraftTheme(savedTheme);
    setShowThemePicker(false);
    setThemeError(null);
    if (restoreFocus) themeTriggerRef.current?.focus();
  };

  const handleSaveTheme = () => {
    try {
      saveTheme(draftTheme);
      setShowThemePicker(false);
      setThemeError(null);
      themeTriggerRef.current?.focus();
    } catch (error) {
      console.error("Failed to save theme", error);
      setThemeError("Unable to save your appearance settings. Try again.");
    }
  };

  const openThemePicker = () => {
    setShowUserDropdown(false);
    setDraftTheme(savedTheme);
    previewTheme(savedTheme);
    setThemeError(null);
    setShowThemePicker(true);
  };

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

  useEffect(() => {
    if (!showThemePicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        themePickerRef.current &&
        !themePickerRef.current.contains(event.target as Node)
      ) {
        handleCancelTheme();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showThemePicker) {
        handleCancelTheme(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showThemePicker, savedTheme]);

  const handleBgFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      try {
        setIsUploadingBg(true);
        await uploadBgImage(files[0]);
      } catch (err) {
        console.error("Failed to store background image", err);
        setThemeError("Unable to process background image.");
      } finally {
        setIsUploadingBg(false);
        e.target.value = "";
      }
    }
  };

  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "U";
  const isSyncBusy = syncStatus === 'syncing' || syncStatus === 'pending';

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-surface/90 glass-panel">
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-[90rem] items-center justify-between" style={{ paddingInline: 'var(--gutter)' }}>
        <div className="flex min-w-0 flex-1 items-center">
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/dashboard?folder=root"
              aria-label="Go to dashboard"
              className="group inline-flex shrink-0 items-baseline gap-1.5 rounded-md py-1 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
            >
              <span className="text-[17px] font-bold leading-none tracking-[-0.045em] text-[color:var(--color-text-primary)]">
                Dawvix
              </span>
              <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-[color:var(--color-accent)]">
                Vault
              </span>
            </Link>
          </div>

          {showBreadcrumbs && (
            <>
              <div className="mx-3 h-4 w-px shrink-0 bg-[color:var(--color-border)]" aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <Breadcrumbs
                  items={breadcrumbs}
                  onSelectFolder={onSelectFolder}
                  onDropOnFolder={onDropOnFolder}
                />
              </div>
            </>
          )}
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-2">
          {/* Theme customizer button */}
          <div className="relative" ref={themePickerRef}>
            <button
              ref={themeTriggerRef}
              type="button"
              onClick={() => showThemePicker ? handleCancelTheme() : openThemePicker()}
              aria-label="Change theme"
              aria-haspopup="dialog"
              aria-expanded={showThemePicker}
              className={`flex h-[var(--control-h)] w-[var(--control-h)] items-center justify-center rounded-[var(--control-radius)] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
                showThemePicker ? "bg-[color:var(--color-hover)]" : ""
              }`}
            >
              <Palette className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Theme customizer dialog */}
            {showThemePicker && (
              <div
                role="dialog"
                aria-label="Theme customization"
                className="fixed right-2 top-[3.75rem] z-50 mt-2 max-h-[calc(100vh-4.5rem)] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-outline/[0.10] bg-surface p-4 text-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-100 sm:absolute sm:right-0 sm:top-full"
              >
                {/* Header: Title + Mode Toggle */}
                <div className="flex items-start justify-between border-b border-outline/[0.08] pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-on-surface">Theme & Appearance</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Personalize your vault workspace.
                    </p>
                  </div>
                  <div className="flex rounded-lg border border-outline/[0.1] bg-surface-variant p-0.5">
                    {(["dark", "light"] as const).map((themeMode) => (
                      <button
                        key={themeMode}
                        type="button"
                        onClick={() => updateDraftTheme({ mode: themeMode })}
                        aria-label={`${themeMode} mode`}
                        aria-pressed={draftTheme.mode === themeMode}
                        className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
                          draftTheme.mode === themeMode
                            ? "bg-teal-500/20 text-teal-300"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {themeMode === "dark" ? (
                          <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Surface Style: Matte vs Glass (GLS-001 - GLS-013) */}
                <div className="mt-3.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      <Layers className="h-3.5 w-3.5 text-slate-500" /> Surface Style
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {draftTheme.surfaceStyle === "glass" ? "Translucent panels" : "Solid surfaces"}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraftTheme({ surfaceStyle: "matte" })}
                      aria-pressed={draftTheme.surfaceStyle === "matte"}
                      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        draftTheme.surfaceStyle === "matte"
                          ? "border-teal-500/60 bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30"
                          : "border-outline/[0.1] bg-surface-variant text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Matte
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraftTheme({ surfaceStyle: "glass" })}
                      aria-pressed={draftTheme.surfaceStyle === "glass"}
                      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        draftTheme.surfaceStyle === "glass"
                          ? "border-teal-500/60 bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30"
                          : "border-outline/[0.1] bg-surface-variant text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Glass
                    </button>
                  </div>
                </div>

                {/* Color Intensity: Default vs Vibrant (VBR-001 - VBR-011) */}
                <div className="mt-3.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-slate-500" /> Color Intensity
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {draftTheme.colorIntensity === "vibrant" ? "High saturation & OLED" : "M3 Soft tonal"}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraftTheme({ colorIntensity: "default" })}
                      aria-pressed={draftTheme.colorIntensity === "default"}
                      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        draftTheme.colorIntensity === "default"
                          ? "border-teal-500/60 bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30"
                          : "border-outline/[0.1] bg-surface-variant text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraftTheme({ colorIntensity: "vibrant" })}
                      aria-pressed={draftTheme.colorIntensity === "vibrant"}
                      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        draftTheme.colorIntensity === "vibrant"
                          ? "border-teal-500/60 bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30"
                          : "border-outline/[0.1] bg-surface-variant text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Vibrant
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="mt-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Seed Colors
                  </p>
                  <div className="mt-1.5 grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => updateDraftTheme({ seedColor: preset.color })}
                        aria-label={`${preset.name} theme`}
                        aria-pressed={draftTheme.seedColor === preset.color}
                        className={`relative h-9 min-w-9 rounded-lg border transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${
                          draftTheme.seedColor === preset.color
                            ? "border-outline/80 ring-2 ring-white/50"
                            : "border-outline/15"
                        }`}
                        style={{ backgroundColor: preset.color }}
                      >
                        {draftTheme.seedColor === preset.color && (
                          <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom HEX */}
                <label
                  htmlFor="theme-hex"
                  className="mt-3 block text-[10px] font-medium uppercase tracking-wider text-slate-500"
                >
                  Custom HEX
                </label>
                <input
                  id="theme-hex"
                  type="text"
                  name="theme-hex"
                  autoComplete="off"
                  spellCheck={false}
                  value={draftTheme.seedColor}
                  onChange={(event) => updateDraftTheme({ seedColor: event.target.value })}
                  placeholder="#0D9488…"
                  maxLength={7}
                  aria-invalid={!validDraft}
                  className="ui-control mt-1 w-full border-outline/[0.12] font-mono text-xs uppercase focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/20"
                />

                {/* Palette Preview */}
                <div className="mt-2.5 rounded-xl border border-outline/[0.08] bg-surface-variant/70 p-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 shrink-0 rounded-lg border border-outline/15 shadow-inner"
                      style={{
                        backgroundColor: validDraft ? draftTheme.seedColor : "transparent",
                      }}
                      aria-label={validDraft ? `Preview ${draftTheme.seedColor}` : "Invalid color"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-medium text-slate-200">
                        {validDraft ? draftTheme.seedColor.toUpperCase() : "Enter a valid 6-digit HEX"}
                      </p>
                    </div>
                  </div>
                  {previewPalette && (
                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
                      {[90, 80, 60, 40, 20].map((tone) => (
                        <span
                          key={tone}
                          className="flex-1"
                          style={{
                            backgroundColor: hexFromArgb(previewPalette.tone(tone)),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Background Image (BGI-001 - BGI-018) */}
                <div className="mt-3.5 border-t border-outline/[0.08] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      <ImageIcon className="h-3.5 w-3.5 text-slate-500" /> Background Image
                    </span>
                    {bgImageUrl && (
                      <span className="text-[10px] text-teal-400 font-medium">Active</span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={bgFileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleBgFileSelect}
                      />
                      <button
                        type="button"
                        onClick={() => bgFileInputRef.current?.click()}
                        disabled={isUploadingBg}
                        className="flex-1 flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-outline/[0.12] bg-surface-variant px-3 text-xs font-medium text-slate-200 hover:border-teal-500/40 hover:text-teal-300 transition-colors"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-teal-400" />
                        <span>{bgImageUrl ? "Change Image" : "Choose Image"}</span>
                      </button>

                      {bgImageUrl && (
                        <button
                          type="button"
                          onClick={() => void removeBgImage()}
                          className="flex min-h-8 min-w-8 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-[color:var(--color-error)] hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="background-blur" className="text-xs text-slate-300">
                          Background blur
                        </label>
                        <output htmlFor="background-blur" className="text-xs tabular-nums text-slate-400">
                          {draftTheme.bgImageBlur}px
                        </output>
                      </div>
                      <input
                        id="background-blur"
                        name="background-blur"
                        type="range"
                        min={0}
                        max={24}
                        step={1}
                        value={draftTheme.bgImageBlur}
                        onChange={(event) => updateDraftTheme({ bgImageBlur: Number(event.target.value) })}
                        aria-label="Background image blur"
                        aria-valuetext={`${draftTheme.bgImageBlur} pixels`}
                        className="mt-2 min-h-8 w-full accent-[color:var(--color-primary)]"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>No blur</span>
                        <span>Maximum</span>
                      </div>
                    </div>
                  </div>
                </div>

                {themeError && (
                  <p role="alert" className="mt-2 text-[11px] text-[color:var(--color-error)]">
                    {themeError}
                  </p>
                )}

                {/* Dialog Footer Actions */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-outline/[0.08] pt-3">
                  <button
                    type="button"
                    onClick={() => updateDraftTheme(DEFAULT_THEME)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-surface-variant hover:text-slate-200"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancelTheme(true)}
                      className="min-h-9 rounded-lg px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-variant"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTheme}
                      disabled={!validDraft}
                      className="min-h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-on-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync Button */}
          {canSync && (
            <button
              type="button"
              onClick={() => void onSync()}
              disabled={isSyncBusy}
              aria-label="Sync with Google Drive"
              aria-busy={isSyncBusy}
              className="relative flex h-[var(--control-h)] min-w-[var(--control-h)] items-center justify-center gap-2 rounded-[var(--control-radius)] border border-[color:var(--color-border-control)] bg-surface-variant px-3 text-[13px] font-medium text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              title={lastSyncedAt
                ? `Sync with Google Drive. Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                : "Sync items with Google Drive"}
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <RefreshCw
                  className={`h-4 w-4 ${syncStatus === 'syncing' ? "animate-[spin_1s_linear_infinite]" : ""}`}
                  aria-hidden="true"
                />
                {syncStatus === 'pending' && (
                  <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" aria-hidden="true" />
                )}
                {syncStatus === 'error' && (
                  <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-error)]" aria-hidden="true" />
                )}
              </span>
              <span className="hidden sm:inline">Sync</span>
              {syncStatus === 'syncing' && <span className="sr-only">Syncing</span>}
            </button>
          )}

          {/* Profile & Dropdown Menu */}
          <div
            className="relative"
            ref={dropdownRef}
          >
            <button
              type="button"
              onClick={() => {
                handleCancelTheme();
                setShowUserDropdown((prev) => !prev);
              }}
              aria-expanded={showUserDropdown}
              aria-label="User menu"
              className="flex h-[var(--control-h)] items-center gap-2 rounded-[var(--control-radius)] border border-[color:var(--color-border-control)] bg-surface-variant px-2.5 text-[13px] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-[10px] font-semibold text-teal-300">
                {userInitial}
              </div>
              <span className="hidden font-medium text-slate-200 sm:inline max-w-[100px] truncate">
                {user?.username || "User"}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                  showUserDropdown ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {/* User Menu Popover */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-outline/[0.08] bg-surface/95 glass-panel shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b border-outline/[0.08] px-3.5 py-3">
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
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-[color:var(--color-error)] transition-colors hover:bg-rose-500/10"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
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
            aria-label="Dismiss sync message"
            className="p-0.5 text-teal-400/70 hover:text-teal-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
