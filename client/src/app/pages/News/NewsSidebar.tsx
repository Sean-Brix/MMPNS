import React, { useMemo } from 'react';
import { Search, Calendar, Film, FileText, SlidersHorizontal, X, RotateCcw } from 'lucide-react';

// Shared filter types — also imported by NewsMainFeed
export interface NewsFilters {
  search: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  mediaType: 'all' | 'photo' | 'video' | 'album';
  hasMessage: 'all' | 'with-text' | 'media-only';
}

export const DEFAULT_FILTERS: NewsFilters = {
  search: '',
  dateRange: 'all',
  mediaType: 'all',
  hasMessage: 'all',
};

// Minimal item shape needed for stats computation
export interface NewsItemForStats {
  date: string;
  excerpt: string;
  media: { type: 'photo' | 'video'; src: string; videoSrc?: string }[];
}

interface NewsSidebarProps {
  filters: NewsFilters;
  onFiltersChange: (filters: NewsFilters) => void;
  allItems: NewsItemForStats[];
  filteredCount: number;
}

// Helper to parse "Oct 28, 2025" date strings
const parseDate = (dateStr: string): Date | null => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const NewsSidebar: React.FC<NewsSidebarProps> = ({ filters, onFiltersChange, allItems, filteredCount }) => {
  // Compute stats from all loaded items
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let photoCount = 0;
    let videoCount = 0;
    let albumCount = 0;
    let withTextCount = 0;
    let mediaOnlyCount = 0;
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let yearCount = 0;

    for (const item of allItems) {
      // Media type stats
      const hasVideo = item.media?.some(m => m.type === 'video');
      const hasPhoto = item.media?.some(m => m.type === 'photo');
      const isAlbum = (item.media?.length ?? 0) > 1;

      if (isAlbum) albumCount++;
      else if (hasVideo) videoCount++;
      else if (hasPhoto) photoCount++;

      // Message stats
      const hasText = item.excerpt && item.excerpt !== 'No content available.' && item.excerpt.trim().length > 0;
      if (hasText) withTextCount++;
      else mediaOnlyCount++;

      // Date stats
      const d = parseDate(item.date);
      if (d) {
        if (d >= startOfToday) todayCount++;
        if (d >= startOfWeek) weekCount++;
        if (d >= startOfMonth) monthCount++;
        if (d >= startOfYear) yearCount++;
      }
    }

    return {
      total: allItems.length,
      photoCount, videoCount, albumCount,
      withTextCount, mediaOnlyCount,
      todayCount, weekCount, monthCount, yearCount,
    };
  }, [allItems]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.mediaType !== 'all') count++;
    if (filters.hasMessage !== 'all') count++;
    return count;
  }, [filters]);

  const update = (partial: Partial<NewsFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const dateRangeOptions: { value: NewsFilters['dateRange']; label: string; count: number }[] = [
    { value: 'all', label: 'All Time', count: stats.total },
    { value: 'today', label: 'Today', count: stats.todayCount },
    { value: 'week', label: 'This Week', count: stats.weekCount },
    { value: 'month', label: 'This Month', count: stats.monthCount },
    { value: 'year', label: 'This Year', count: stats.yearCount },
  ];

  const mediaTypeOptions: { value: NewsFilters['mediaType']; label: string; count: number }[] = [
    { value: 'all', label: 'All Types', count: stats.total },
    { value: 'photo', label: 'Photos', count: stats.photoCount },
    { value: 'video', label: 'Videos', count: stats.videoCount },
    { value: 'album', label: 'Albums', count: stats.albumCount },
  ];

  const messageOptions: { value: NewsFilters['hasMessage']; label: string; count: number }[] = [
    { value: 'all', label: 'All Posts', count: stats.total },
    { value: 'with-text', label: 'With Message', count: stats.withTextCount },
    { value: 'media-only', label: 'Media Only', count: stats.mediaOnlyCount },
  ];

  const selectedDateLabel = dateRangeOptions.find((opt) => opt.value === filters.dateRange)?.label || 'All Time';
  const selectedMediaLabel = mediaTypeOptions.find((opt) => opt.value === filters.mediaType)?.label || 'All Types';
  const selectedMessageLabel = messageOptions.find((opt) => opt.value === filters.hasMessage)?.label || 'All Posts';

  return (
    <div className="lg:w-1/3">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal size={18} className="text-[#185C20]" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 truncate">Feed Controls</h4>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[#185C20] text-white text-[9px] font-black rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-[#185C20] transition-colors"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
        </div>

        <div className="px-3 py-2.5 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Showing <span className="text-[#185C20] font-black">{filteredCount}</span> of{' '}
            <span className="font-black text-gray-700">{stats.total}</span> loaded posts
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="relative flex-1 min-w-0 lg:min-w-[220px]">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Search</label>
            <Search size={14} className="absolute left-3.5 top-[34px] -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Search posts..."
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => update({ search: '' })}
                className="absolute right-3 top-[34px] -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="lg:w-[170px]">
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              <Calendar size={12} /> Date
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => update({ dateRange: e.target.value as NewsFilters['dateRange'] })}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20"
            >
              {dateRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-[170px]">
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              <Film size={12} /> Media
            </label>
            <select
              value={filters.mediaType}
              onChange={(e) => update({ mediaType: e.target.value as NewsFilters['mediaType'] })}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20"
            >
              {mediaTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-[180px]">
            <label className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              <FileText size={12} /> Content
            </label>
            <select
              value={filters.hasMessage}
              onChange={(e) => update({ hasMessage: e.target.value as NewsFilters['hasMessage'] })}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20"
            >
              {messageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="rounded-xl bg-[#185C20]/5 border border-[#185C20]/10 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#185C20]">
              Active: {selectedDateLabel} • {selectedMediaLabel} • {selectedMessageLabel}{filters.search ? ` • Search: ${filters.search}` : ''}
            </p>
            <button
              onClick={resetFilters}
              className="text-[10px] font-black uppercase tracking-wider text-[#185C20] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
