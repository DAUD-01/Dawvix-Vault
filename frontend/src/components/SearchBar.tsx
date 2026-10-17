import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Globe,
  Folder,
  History,
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
  isDefaultSort: boolean;
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
  isDefaultSort,
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

  const handleScopeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const options = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [],
    );
    if (options.length !== 2) return;

    let nextIndex: number;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (options.indexOf(event.currentTarget) + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (options.indexOf(event.currentTarget) + options.length - 1) % options.length;
    } else {
      return;
    }

    event.preventDefault();
    options[nextIndex].focus();
    onScopeChange(nextIndex === 0 ? "folder" : "vault");
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "folders", label: "Folders" },
    { id: "pdf", label: "PDF" },
    { id: "documents", label: "Docs" },
    { id: "spreadsheets", label: "Sheets" },
    { id: "presentations", label: "Slides" },
    { id: "images", label: "Images" },
    { id: "media", label: "Audio & video" },
    { id: "archives", label: "Archives" },
    { id: "code", label: "Code" },
  ];
  return (
    <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div ref={dropdownRef} className="relative flex w-full min-w-0 flex-1 items-center gap-2">
        <div
          role="radiogroup"
          aria-label="List mode and search scope"
          className="flex h-[var(--control-h)] shrink-0 items-center rounded-[var(--control-radius)] bg-surface-variant/60 p-1"
        >
          <button
            type="button"
            role="radio"
            aria-label="Browse by folder. Search this folder."
            aria-checked={searchScope === "folder"}
            tabIndex={searchScope === "folder" ? 0 : -1}
            onClick={() => onScopeChange("folder")}
            onKeyDown={handleScopeKeyDown}
            className={`flex h-[calc(var(--control-h)-8px)] items-center gap-1.5 rounded-[4px] border px-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
              searchScope === "folder"
                ? "border-transparent bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                : "border-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            <Folder className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Folder</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-label="Show all items. Search the whole vault."
            aria-checked={searchScope === "vault"}
            tabIndex={searchScope === "vault" ? 0 : -1}
            onClick={() => onScopeChange("vault")}
            onKeyDown={handleScopeKeyDown}
            className={`flex h-[calc(var(--control-h)-8px)] items-center gap-1.5 rounded-[4px] border px-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
              searchScope === "vault"
                ? "border-transparent bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                : "border-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">All Vault</span>
          </button>
        </div>

        <div className="relative min-w-0 flex-1" style={{ maxWidth: 480, minWidth: 200 }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-muted)]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            name="vault-search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setShowRecentDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchScope === "vault"
                ? "Search entire vault…"
                : "Filter files in this folder…"
            }
            aria-label={searchScope === "vault" ? "Search all vault files" : "Search files in this folder"}
            className="glass-input h-[var(--control-h)] w-full rounded-[var(--control-radius)] border border-[color:var(--color-border-control)] bg-surface-variant py-1.5 pl-9 pr-12 text-[13px] text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-muted)] outline-none transition-colors focus:border-[color:var(--color-accent)] focus:ring-2 focus:ring-[color:var(--color-accent)]/20"
          />
          <div className="absolute right-2.5 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="flex h-7 w-7 items-center justify-center rounded-[var(--control-radius)] text-[color:var(--color-text-muted)] transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-[color:var(--color-border-control)] bg-surface-variant px-1.5 py-0.5 text-[10px] font-mono text-[color:var(--color-text-muted)] sm:inline-block">
                /
              </kbd>
            )}
          </div>

          {showRecentDropdown && recentSearches.length > 0 && !searchQuery && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-outline/[0.10] bg-surface/95 shadow-xl glass-panel">
              <div className="flex items-center justify-between border-b border-outline/[0.08] px-3.5 py-2 text-[11px] font-medium text-[color:var(--color-text-muted)]">
                <span className="flex items-center gap-1.5 text-[color:var(--color-text-primary)]">
                  <History className="h-3.5 w-3.5" /> Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearSearches}
                  className="rounded-md px-2 py-0.5 text-[10px] text-[color:var(--color-text-muted)] transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)]"
                >
                  Clear history
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
                    className="w-full rounded-lg px-3 py-2 text-left text-xs text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-hover)] focus-visible:bg-[color:var(--color-hover)] focus-visible:outline-none"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label
          className={`relative flex h-[var(--control-h)] items-center gap-2 rounded-[var(--control-radius)] border px-2.5 transition-colors focus-within:ring-2 focus-within:ring-[color:var(--color-accent)]/40 ${
            filterType !== "all"
              ? "border-[color:var(--color-primary-soft-border)] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
              : "border-[color:var(--color-border-control)] bg-surface-variant text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)]"
          }`}
        >
          <Filter className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden text-xs font-medium sm:inline">Filter</span>
          <select
            name="file-type-filter"
            autoComplete="off"
            id="file-type-filter"
            value={filterType}
            onChange={(event) => onFilterChange(event.target.value)}
            aria-label="Filter files by type"
            className="max-w-[125px] cursor-pointer appearance-none bg-transparent pr-5 text-xs font-medium text-[color:var(--color-text-primary)] outline-none"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5" aria-hidden="true" />
        </label>

        <label
          className={`relative flex h-[var(--control-h)] items-center gap-2 rounded-[var(--control-radius)] border px-2.5 transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)] focus-within:ring-2 focus-within:ring-[color:var(--color-accent)]/40 ${
            !isDefaultSort
              ? "border-[color:var(--color-primary-soft-border)] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
              : "border-[color:var(--color-border-control)] bg-surface-variant text-[color:var(--color-text-muted)]"
          }`}
          data-active={!isDefaultSort}
        >
          <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden text-xs font-medium sm:inline">Sort</span>
          <select
            name="sort-results"
            autoComplete="off"
            value={currentSortKey}
            onChange={(e) => handleSortSelect(e.target.value)}
            className="max-w-[140px] cursor-pointer appearance-none bg-transparent pr-5 text-xs font-medium text-[color:var(--color-text-primary)] outline-none"
            aria-label="Sort files"
          >
            <option value="name_asc">Name (A → Z)</option>
            <option value="name_desc">Name (Z → A)</option>
            <option value="size_desc">Size (Largest)</option>
            <option value="size_asc">Size (Smallest)</option>
            <option value="lastSyncedAt_desc">Date (Newest)</option>
            <option value="lastSyncedAt_asc">Date (Oldest)</option>
            <option value="mimeType_asc">Type (A → Z)</option>
            <option value="mimeType_desc">Type (Z → A)</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5" aria-hidden="true" />
        </label>

        <div className="flex h-[var(--control-h)] shrink-0 items-center rounded-[var(--control-radius)] bg-surface-variant/60 p-1">
          <button
            type="button"
            onClick={() => onToggleGrid(false)}
            aria-label="List view"
            aria-pressed={!isGrid}
            className={`flex h-[calc(var(--control-h)-8px)] w-[calc(var(--control-h)-8px)] items-center justify-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
              !isGrid
                ? "border-transparent bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                : "border-transparent text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggleGrid(true)}
            aria-label="Grid view"
            aria-pressed={isGrid}
            className={`flex h-[calc(var(--control-h)-8px)] w-[calc(var(--control-h)-8px)] items-center justify-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
              isGrid
                ? "border-transparent bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                : "border-transparent text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden pl-1 text-[11px] font-medium text-[color:var(--color-text-muted)] xl:block">
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
