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
  Archive,
  AudioLines,
  Check,
  Code2,
  FileSpreadsheet,
  FileText,
  Images,
  Presentation,
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
  const filterSortRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);

  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [openMenu, setOpenMenu] = useState<"filter" | "sort" | null>(null);
  const {
    searches: recentSearches,
    addSearch,
    clearSearches,
  } = useRecentSearches(RECENT_SEARCHES_KEY);

  const currentSortKey = `${sortBy}_${sortOrder}`;
  const filterOptions = [
    { id: "all", label: "All files", hint: "Every item", Icon: FileText },
    { id: "folders", label: "Folders", hint: "Directories", Icon: Folder },
    { id: "pdf", label: "PDF", hint: "PDF documents", Icon: FileText },
    { id: "documents", label: "Docs", hint: "Text and documents", Icon: FileText },
    { id: "spreadsheets", label: "Sheets", hint: "Spreadsheets", Icon: FileSpreadsheet },
    { id: "presentations", label: "Slides", hint: "Presentations", Icon: Presentation },
    { id: "images", label: "Images", hint: "Pictures and graphics", Icon: Images },
    { id: "media", label: "Audio & video", hint: "Media files", Icon: AudioLines },
    { id: "archives", label: "Archives", hint: "Compressed files", Icon: Archive },
    { id: "code", label: "Code", hint: "All programming languages", Icon: Code2 },
  ];
  const sortOptions = [
    { id: "name_asc", label: "Name", hint: "A to Z" },
    { id: "name_desc", label: "Name", hint: "Z to A" },
    { id: "size_desc", label: "Size", hint: "Largest first" },
    { id: "size_asc", label: "Size", hint: "Smallest first" },
    { id: "lastSyncedAt_desc", label: "Date added", hint: "Newest first" },
    { id: "lastSyncedAt_asc", label: "Date added", hint: "Oldest first" },
    { id: "mimeType_asc", label: "File type", hint: "A to Z" },
    { id: "mimeType_desc", label: "File type", hint: "Z to A" },
  ];

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

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!filterSortRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenMenu(null);
      (openMenu === "filter" ? filterTriggerRef : sortTriggerRef).current?.focus();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) return;
    const root = filterSortRef.current;
    const selector = `[data-dropdown="${openMenu}"] [aria-selected="true"]`;
    root?.querySelector<HTMLButtonElement>(selector)?.focus();
  }, [openMenu]);

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const options = Array.from(
      event.currentTarget.closest('[role="listbox"]')?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    const currentIndex = options.indexOf(event.currentTarget);
    let nextIndex: number;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
    else if (event.key === "ArrowUp") nextIndex = (currentIndex + options.length - 1) % options.length;
    else return;

    event.preventDefault();
    options[nextIndex]?.focus();
  };

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

      <div ref={filterSortRef} className="flex shrink-0 items-center gap-2">
        <div className="relative flex h-[var(--control-h)] w-[var(--control-h)] shrink-0 items-center justify-center">
          <button
            ref={filterTriggerRef}
            type="button"
            onClick={() => setOpenMenu((open) => open === "filter" ? null : "filter")}
            aria-label="Filter files"
            aria-haspopup="listbox"
            aria-expanded={openMenu === "filter"}
            aria-controls="file-type-menu"
            className={`flex h-full w-full items-center justify-center rounded-[var(--control-radius)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/40 ${
              filterType !== "all"
                ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            {filterType !== "all" && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-accent)] px-1 text-[11px] font-semibold leading-none text-[color:var(--color-on-primary)]">
                1
              </span>
            )}
            <Filter className="h-4 w-4" aria-hidden="true" />
          </button>
          {openMenu === "filter" && (
            <div
              id="file-type-menu"
              role="listbox"
              aria-label="Filter files by type"
              data-dropdown="filter"
              className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-outline/15 bg-surface/95 p-1.5 shadow-2xl ring-1 ring-black/10 backdrop-blur-xl"
            >
              <div className="px-2.5 pb-2 pt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">Filter files</p>
                <p className="mt-0.5 text-xs text-[color:var(--color-text-primary)]">Choose a file category</p>
              </div>
              <div className="max-h-[min(60vh,360px)] overflow-y-auto">
                {filterOptions.map(({ id, label, hint, Icon }) => {
                  const selected = filterType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onKeyDown={handleOptionKeyDown}
                      onClick={() => {
                        onFilterChange(id);
                        setOpenMenu(null);
                        filterTriggerRef.current?.focus();
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)] ${
                        selected
                          ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-text-primary)]"
                          : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[color:var(--color-primary-soft-border)] text-[color:var(--color-primary)]" : "bg-surface-variant text-[color:var(--color-text-muted)]"}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{label}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-[color:var(--color-text-muted)]">{hint}</span>
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex h-[var(--control-h)] w-[var(--control-h)] shrink-0 items-center justify-center">
          <button
            ref={sortTriggerRef}
            type="button"
            onClick={() => setOpenMenu((open) => open === "sort" ? null : "sort")}
            aria-label="Sort files"
            aria-haspopup="listbox"
            aria-expanded={openMenu === "sort"}
            aria-controls="sort-menu"
            className={`flex h-full w-full items-center justify-center rounded-[var(--control-radius)] transition-colors hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/40 ${
              !isDefaultSort
                ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                : "text-[color:var(--color-text-muted)]"
            }`}
          >
            {!isDefaultSort && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" aria-hidden="true" />}
            <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {openMenu === "sort" && (
            <div
              id="sort-menu"
              role="listbox"
              aria-label="Sort files"
              data-dropdown="sort"
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-outline/15 bg-surface/95 p-1.5 shadow-2xl ring-1 ring-black/10 backdrop-blur-xl"
            >
              <div className="px-2.5 pb-2 pt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">Sort results</p>
                <p className="mt-0.5 text-xs text-[color:var(--color-text-primary)]">Order files by</p>
              </div>
              <div role="group" aria-label="Sort order">
                {sortOptions.map(({ id, label, hint }) => {
                  const selected = currentSortKey === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onKeyDown={handleOptionKeyDown}
                      onClick={() => {
                        handleSortSelect(id);
                        setOpenMenu(null);
                        sortTriggerRef.current?.focus();
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)] ${
                        selected
                          ? "bg-[color:var(--color-primary-soft)] text-[color:var(--color-text-primary)]"
                          : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-text-primary)]"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold ${selected ? "bg-[color:var(--color-primary-soft-border)] text-[color:var(--color-primary)]" : "bg-surface-variant text-[color:var(--color-text-muted)]"}`}>
                        {id.endsWith("_asc") ? "↑" : "↓"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{label}</span>
                        <span className="mt-0.5 block text-[10px] text-[color:var(--color-text-muted)]">{hint}</span>
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
