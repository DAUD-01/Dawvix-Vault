import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  Globe,
  Folder,
  History,
  Sparkles,
} from "lucide-react";
import { SortBy, SortOrder, SearchScope } from "../types";

// --- Custom Hooks for better separation of concerns ---

/** Manages recent searches with localStorage persistence */
function useRecentSearches(key: string, maxItems: number = 5) {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setSearches(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  }, [key]);

  const addSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) return;

      setSearches((prev) => {
        const updated = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(
          0,
          maxItems,
        );
        try {
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save recent search", e);
        }
        return updated;
      });
    },
    [key, maxItems],
  );

  const clearSearches = useCallback(() => {
    setSearches([]);
    localStorage.removeItem(key);
  }, [key]);

  return { searches, addSearch, clearSearches };
}

// --- Main Component ---

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterChange: (type: string) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (by: SortBy, order: SortOrder) => void;
  searchScope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
  isGrid: boolean;
  onToggleGrid: (grid: boolean) => void;
  totalCount: number;
  filteredCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

const RECENT_SEARCHES_KEY = "vault_recent_searches";

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  searchScope,
  onScopeChange,
  isGrid,
  onToggleGrid,
  totalCount,
  filteredCount,
  searchInputRef: externalInputRef,
}) => {
  // Use external ref if provided, otherwise fallback to internal
  const fallbackRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || fallbackRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const {
    searches: recentSearches,
    addSearch,
    clearSearches,
  } = useRecentSearches(RECENT_SEARCHES_KEY);

  const currentSortKey = `${sortBy}_${sortOrder}`;

  // Global hotkey to focus search (Press '/')
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is already typing in an input/textarea
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [inputRef]);

  // Close recent search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowRecentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setShowRecentDropdown(false);
      addSearch(searchQuery);
    } else if (e.key === "Escape") {
      setShowRecentDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    onSearchChange("");
    inputRef.current?.focus(); // Refocus input after clearing
  };

  const handleSortSelect = (val: string) => {
    const [by, order] = val.split("_") as [SortBy, SortOrder];
    onSortChange(by, order);
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "folders", label: "Folders" },
    { id: "documents", label: "Docs" },
    { id: "media", label: "Media" },
    { id: "archives", label: "Code" },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-1 relative">
      {/* Search Input Area */}
      <div
        className="flex flex-1 items-center gap-2 max-w-xl relative"
        ref={dropdownRef}
      >
        {/* Scope Segmented Control */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 shrink-0">
          <button
            type="button"
            onClick={() => onScopeChange("folder")}
            aria-label="Search inside current folder"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:outline-none ${
              searchScope === "folder"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Folder</span>
          </button>
          <button
            type="button"
            onClick={() => onScopeChange("vault")}
            aria-label="Search entire vault globally"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:outline-none ${
              searchScope === "vault"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Vault</span>
          </button>
        </div>

        {/* Search Input Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setShowRecentDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchScope === "vault"
                ? "Search all vault files... (Press /)"
                : "Filter files in this folder... (Press /)"
            }
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-14 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-teal-500/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-teal-500/20"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 text-slate-500 hover:text-slate-200 hover:bg-white/10 rounded-md transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:outline-none"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-slate-500 select-none">
                /
              </kbd>
            )}
          </div>

          {/* Recent Searches Dropdown */}
          {showRecentDropdown && recentSearches.length > 0 && !searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-white/[0.1] bg-[#0c101a]/95 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <History className="h-3.5 w-3.5 text-teal-400" /> Recent
                  Searches
                </span>
                <button
                  type="button"
                  onClick={clearSearches}
                  className="hover:text-slate-200 transition-colors text-[10px] px-2 py-0.5 rounded-md hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-teal-500 focus-visible:outline-none"
                >
                  Clear history
                </button>
              </div>
              <div className="p-1.5">
                {recentSearches.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onSearchChange(item);
                      setShowRecentDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-teal-300 rounded-xl transition-colors text-left group focus-visible:bg-white/[0.06] focus-visible:text-teal-300 focus-visible:outline-none"
                  >
                    <span>{item}</span>
                    <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 text-teal-400 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter, Sort & View Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick Category Chips (Scrollable on mobile) */}
        <div
          className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 overflow-x-auto overflow-y-hidden max-w-full hide-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <Filter className="h-3.5 w-3.5 text-slate-500 mx-1.5 hidden sm:block shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onFilterChange(cat.id)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:outline-none ${
                filterType === cat.id
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 hover:border-white/[0.15] transition-colors focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500/60">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 mr-1.5 shrink-0" />
          <select
            value={currentSortKey}
            onChange={(e) => handleSortSelect(e.target.value)}
            className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer py-0.5 focus:outline-none"
            aria-label="Sort results"
          >
            <option value="name_asc" className="bg-[#0b0f19]">
              Name (A → Z)
            </option>
            <option value="name_desc" className="bg-[#0b0f19]">
              Name (Z → A)
            </option>
            <option value="size_desc" className="bg-[#0b0f19]">
              Size (Largest)
            </option>
            <option value="size_asc" className="bg-[#0b0f19]">
              Size (Smallest)
            </option>
            <option value="lastSyncedAt_desc" className="bg-[#0b0f19]">
              Date (Newest)
            </option>
            <option value="lastSyncedAt_asc" className="bg-[#0b0f19]">
              Date (Oldest)
            </option>
          </select>
        </div>

        {/* List / Grid Toggle */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => onToggleGrid(false)}
            aria-label="Switch to list view"
            className={`rounded-lg p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:outline-none ${
              !isGrid
                ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleGrid(true)}
            aria-label="Switch to grid view"
            className={`rounded-lg p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:outline-none ${
              isGrid
                ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Dynamic Count Badge */}
        <div className="text-[11px] text-slate-500 hidden xl:block pl-1 font-medium">
          {filteredCount === totalCount
            ? `${totalCount.toLocaleString()} items`
            : `${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </div>
      </div>

      {/* Hide scrollbar utility class logic (In case you aren't using a plugin) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `,
        }}
      />
    </div>
  );
};
