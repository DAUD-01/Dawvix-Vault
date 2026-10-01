import React, { useState, useEffect, useRef } from "react";
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
const MAX_RECENT_SEARCHES = 5;

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
  searchInputRef,
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSortKey = `${sortBy}_${sortOrder}`;

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  }, []);

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

  const saveRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) return;
    const updated = [query, ...recentSearches.filter((q) => q !== query)].slice(
      0,
      MAX_RECENT_SEARCHES,
    );
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setShowRecentDropdown(false);
      saveRecentSearch(searchQuery);
    } else if (e.key === "Escape") {
      setShowRecentDropdown(false);
    }
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
    <div
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-2 relative"
      ref={dropdownRef}
    >
      {/* Search Input with Scope Toggle */}
      <div className="flex flex-1 items-center gap-2 max-w-xl relative">
        {/* Search Scope selector */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shrink-0">
          <button
            type="button"
            onClick={() => onScopeChange("folder")}
            title="Search inside current folder"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
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
            title="Search entire vault globally"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              searchScope === "vault"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Vault</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setShowRecentDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchScope === "vault"
                ? "Search entire vault across all folders... (Press /)"
                : "Filter items in current folder..."
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-10 pr-16 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-teal-500/80 focus:ring-2 focus:ring-teal-500/20 shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                /
              </kbd>
            )}
          </div>

          {/* Recent Searches Dropdown */}
          {showRecentDropdown && recentSearches.length > 0 && !searchQuery && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-teal-400" /> Recent
                  Searches
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem(RECENT_SEARCHES_KEY);
                  }}
                  className="hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="p-1">
                {recentSearches.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onSearchChange(item);
                      setShowRecentDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-teal-500/10 hover:text-teal-300 rounded-lg transition-colors text-left"
                  >
                    <span>{item}</span>
                    <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 text-teal-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter, Sort & View toggles */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick Category Chips */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          <Filter className="h-3.5 w-3.5 text-slate-500 mx-1.5 hidden sm:block" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onFilterChange(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                filterType === cat.id
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
          <select
            value={currentSortKey}
            onChange={(e) => handleSortSelect(e.target.value)}
            className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="name_asc" className="bg-slate-900">
              Name (A → Z)
            </option>
            <option value="name_desc" className="bg-slate-900">
              Name (Z → A)
            </option>
            <option value="size_desc" className="bg-slate-900">
              Size (Largest)
            </option>
            <option value="size_asc" className="bg-slate-900">
              Size (Smallest)
            </option>
            <option value="lastSyncedAt_desc" className="bg-slate-900">
              Date (Newest)
            </option>
            <option value="lastSyncedAt_asc" className="bg-slate-900">
              Date (Oldest)
            </option>
          </select>
        </div>

        {/* List / Grid toggle */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => onToggleGrid(false)}
            title="List View"
            className={`rounded-lg p-1.5 transition-colors ${
              !isGrid
                ? "bg-teal-500/20 text-teal-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleGrid(true)}
            title="Grid View"
            className={`rounded-lg p-1.5 transition-colors ${
              isGrid
                ? "bg-teal-500/20 text-teal-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Count badge */}
        <div className="text-xs text-slate-500 hidden xl:block pl-1">
          {filteredCount === totalCount
            ? `${totalCount} items`
            : `${filteredCount} of ${totalCount} items`}
        </div>
      </div>
    </div>
  );
};
