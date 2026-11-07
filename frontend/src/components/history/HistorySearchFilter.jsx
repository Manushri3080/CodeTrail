import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  FolderGit2, 
  Play, 
  Activity, 
  CheckSquare, 
  ChevronDown, 
  RotateCcw,
  Loader2,
  Check
} from 'lucide-react';

/**
 * HistorySearchFilter (CT-235)
 * 
 * Modular search bar and filter engine for Activity History & Timeline.
 * Features:
 * - 300ms query debouncing searching across descriptions, file names, and workspace titles.
 * - Category filter pills: all, workspace, code_execution, tasks.
 * - Workspace ID filter dropdown.
 * - Date range filter pills: Today, This Week, All Time.
 * - Active filter indicators & quick reset controls.
 */
export const HistorySearchFilter = ({
  searchQuery = '',
  onSearchChange,
  categoryFilter = 'all',
  onCategoryChange,
  workspaceIdFilter = 'all',
  onWorkspaceIdChange,
  dateRangeFilter = 'all',
  onDateRangeChange,
  workspaces = [],
  totalCount = null,
  onResetFilters,
  className = ''
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync external search changes into local input
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // 300ms Query Debounce Effect
  useEffect(() => {
    if (localSearch === searchQuery) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setIsDebouncing(false);
      if (onSearchChange) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearSearch = () => {
    setLocalSearch('');
    setIsDebouncing(false);
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const selectedWorkspace = workspaces.find(
    (w) => String(w._id || w.id) === String(workspaceIdFilter)
  );

  const isAnyFilterActive = 
    Boolean(localSearch && localSearch.trim()) ||
    categoryFilter !== 'all' ||
    workspaceIdFilter !== 'all' ||
    dateRangeFilter !== 'all';

  return (
    <div className={`ct-history-search-filter-container ${className}`}>
      {/* 1. SEARCH INPUT ROW WITH 300ms DEBOUNCE */}
      <div className="ct-history-search-box">
        <Search size={15} className="ct-history-search-icon text-gray-400 shrink-0" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search history by event description, file name, or workspace..."
          className="ct-history-search-input"
          aria-label="Search activity history"
        />
        {isDebouncing && (
          <Loader2 size={14} className="animate-spin text-purple-400 mr-1.5 shrink-0" title="Debouncing query (300ms)..." />
        )}
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="ct-history-search-clear"
            title="Clear search"
            aria-label="Clear search query"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 2. FILTER PILLS: CATEGORY, WORKSPACE ID & DATE RANGE */}
      <div className="ct-history-filters-row">
        
        {/* Category Pills: All, Workspace, Code Execution, Tasks */}
        <div className="ct-history-filter-group category-group" role="radiogroup" aria-label="Category filters">
          <button
            type="button"
            className={`ct-filter-pill-btn ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => onCategoryChange && onCategoryChange('all')}
            role="radio"
            aria-checked={categoryFilter === 'all'}
          >
            <Activity size={12} className="shrink-0" />
            <span>All</span>
          </button>

          <button
            type="button"
            className={`ct-filter-pill-btn ${categoryFilter === 'workspace' ? 'active' : ''}`}
            onClick={() => onCategoryChange && onCategoryChange('workspace')}
            role="radio"
            aria-checked={categoryFilter === 'workspace'}
          >
            <FolderGit2 size={12} className="shrink-0 text-purple-400" />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            className={`ct-filter-pill-btn ${categoryFilter === 'code_execution' ? 'active' : ''}`}
            onClick={() => onCategoryChange && onCategoryChange('code_execution')}
            role="radio"
            aria-checked={categoryFilter === 'code_execution'}
          >
            <Play size={12} className="shrink-0 text-emerald-400" />
            <span>Runs</span>
          </button>

          <button
            type="button"
            className={`ct-filter-pill-btn ${categoryFilter === 'tasks' ? 'active' : ''}`}
            onClick={() => onCategoryChange && onCategoryChange('tasks')}
            role="radio"
            aria-checked={categoryFilter === 'tasks'}
          >
            <CheckSquare size={12} className="shrink-0 text-amber-400" />
            <span>Tasks</span>
          </button>
        </div>

        {/* Separator */}
        <div className="ct-filter-separator hidden md:block" />

        {/* Workspace ID Dropdown Selector */}
        <div className="ct-history-filter-group workspace-group relative" ref={dropdownRef}>
          <button
            type="button"
            className={`ct-workspace-select-btn ${workspaceIdFilter !== 'all' ? 'active' : ''}`}
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={isWorkspaceDropdownOpen}
            title="Filter by workspace"
          >
            <FolderGit2 size={12} className="text-cyan-400 shrink-0" />
            <span className="truncate max-w-[120px]">
              {selectedWorkspace ? selectedWorkspace.title : 'All Workspaces'}
            </span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isWorkspaceDropdownOpen && (
            <div className="ct-workspace-dropdown-menu" role="listbox">
              <div
                className={`ct-workspace-dropdown-item ${workspaceIdFilter === 'all' ? 'selected' : ''}`}
                onClick={() => {
                  if (onWorkspaceIdChange) onWorkspaceIdChange('all');
                  setIsWorkspaceDropdownOpen(false);
                }}
                role="option"
                aria-selected={workspaceIdFilter === 'all'}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>All Workspaces</span>
                </div>
                {workspaceIdFilter === 'all' && <Check size={12} className="text-purple-400" />}
              </div>

              {workspaces.map((ws) => {
                const wsId = String(ws._id || ws.id);
                const isSelected = String(workspaceIdFilter) === wsId;
                return (
                  <div
                    key={wsId}
                    className={`ct-workspace-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (onWorkspaceIdChange) onWorkspaceIdChange(wsId);
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full bg-${ws.brandColor || 'purple'}-400 shrink-0`} />
                      <span className="truncate">{ws.title}</span>
                    </div>
                    {isSelected && <Check size={12} className="text-purple-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="ct-filter-separator hidden md:block" />

        {/* Date Range Filter Pills: Today, This Week, All Time */}
        <div className="ct-history-filter-group date-group" role="radiogroup" aria-label="Date range filters">
          <button
            type="button"
            className={`ct-filter-pill-btn ${dateRangeFilter === 'all' ? 'active' : ''}`}
            onClick={() => onDateRangeChange && onDateRangeChange('all')}
            role="radio"
            aria-checked={dateRangeFilter === 'all'}
            title="All Time History"
          >
            <span>All Time</span>
          </button>

          <button
            type="button"
            className={`ct-filter-pill-btn ${dateRangeFilter === 'week' ? 'active' : ''}`}
            onClick={() => onDateRangeChange && onDateRangeChange('week')}
            role="radio"
            aria-checked={dateRangeFilter === 'week'}
            title="Events from the last 7 days"
          >
            <span>This Week</span>
          </button>

          <button
            type="button"
            className={`ct-filter-pill-btn ${dateRangeFilter === 'today' ? 'active' : ''}`}
            onClick={() => onDateRangeChange && onDateRangeChange('today')}
            role="radio"
            aria-checked={dateRangeFilter === 'today'}
            title="Events from today"
          >
            <span>Today</span>
          </button>
        </div>

        {/* Reset / Clear Filters Link */}
        {isAnyFilterActive && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="ct-filter-reset-btn"
            title="Clear all search and filter parameters"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        )}

      </div>

      {/* Active Filter Context Strip (shows matching event count and active tags) */}
      {isAnyFilterActive && (
        <div className="ct-active-filter-summary">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 font-mono">
              Filtered: <strong className="text-white">{totalCount !== null ? totalCount : '...'}</strong> event{totalCount === 1 ? '' : 's'}
            </span>
            {localSearch && (
              <span className="ct-active-tag">
                query: "{localSearch}"
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="ct-active-tag">
                category: {categoryFilter}
              </span>
            )}
            {selectedWorkspace && (
              <span className="ct-active-tag">
                workspace: {selectedWorkspace.title}
              </span>
            )}
            {dateRangeFilter !== 'all' && (
              <span className="ct-active-tag">
                range: {dateRangeFilter === 'today' ? 'Today' : 'This Week'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorySearchFilter;
