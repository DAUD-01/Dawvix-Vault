import React from 'react';
import { Search, X, LayoutGrid, List, Filter } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterChange: (type: string) => void;
  isGrid: boolean;
  onToggleGrid: (grid: boolean) => void;
  totalCount: number;
  filteredCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  isGrid,
  onToggleGrid,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter files and folders in current view..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-teal-500/80 focus:ring-2 focus:ring-teal-500/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter and View toggles */}
      <div className="flex items-center gap-2.5">
        {/* Category Filter */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1">
          <Filter className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
          <select
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-900">All Items</option>
            <option value="folders" className="bg-slate-900">Folders</option>
            <option value="documents" className="bg-slate-900">Documents / PDFs</option>
            <option value="media" className="bg-slate-900">Images & Media</option>
            <option value="archives" className="bg-slate-900">Archives / Code</option>
          </select>
        </div>

        {/* View switcher */}
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
        <div className="text-xs text-slate-500 hidden md:block">
          {filteredCount === totalCount
            ? `${totalCount} items`
            : `${filteredCount} of ${totalCount} items`}
        </div>
      </div>
    </div>
  );
};
