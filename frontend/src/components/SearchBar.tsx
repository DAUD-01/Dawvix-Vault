import React from 'react';
import { Search, X, LayoutGrid, List, Filter, ArrowUpDown, Globe, Folder } from 'lucide-react';
import { SortBy, SortOrder, SearchScope } from '../types';

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
  const currentSortKey = `${sortBy}_${sortOrder}`;

  const handleSortSelect = (val: string) => {
    const [by, order] = val.split('_') as [SortBy, SortOrder];
    onSortChange(by, order);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-2">
      {/* Search Input with Scope Toggle */}
      <div className="flex flex-1 items-center gap-2 max-w-xl">
        {/* Search Scope selector */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shrink-0">
          <button
            type="button"
            onClick={() => onScopeChange('folder')}
            title="Search inside current folder"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              searchScope === 'folder'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Folder</span>
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('vault')}
            title="Search entire vault globally"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              searchScope === 'vault'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">All Vault</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              searchScope === 'vault'
                ? 'Search entire vault across all folders...'
                : 'Filter items in current folder...'
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-10 pr-16 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-teal-500/80 focus:ring-2 focus:ring-teal-500/20"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 text-slate-500 hover:text-slate-300"
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
        </div>
      </div>

      {/* Filter, Sort & View toggles */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Filter */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
          <select
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-900">All Items</option>
            <option value="folders" className="bg-slate-900">Folders Only</option>
            <option value="documents" className="bg-slate-900">Documents & PDFs</option>
            <option value="media" className="bg-slate-900">Media (Audio/Video/Img)</option>
            <option value="archives" className="bg-slate-900">Code & Archives</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
          <select
            value={currentSortKey}
            onChange={(e) => handleSortSelect(e.target.value)}
            className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="name_asc" className="bg-slate-900">Name (A → Z)</option>
            <option value="name_desc" className="bg-slate-900">Name (Z → A)</option>
            <option value="size_desc" className="bg-slate-900">Size (Largest first)</option>
            <option value="size_asc" className="bg-slate-900">Size (Smallest first)</option>
            <option value="lastSyncedAt_desc" className="bg-slate-900">Date (Newest)</option>
            <option value="lastSyncedAt_asc" className="bg-slate-900">Date (Oldest)</option>
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
                ? 'bg-teal-500/20 text-teal-400'
                : 'text-slate-500 hover:text-slate-300'
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
                ? 'bg-teal-500/20 text-teal-400'
                : 'text-slate-500 hover:text-slate-300'
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
