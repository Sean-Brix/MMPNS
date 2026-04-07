import React, { useMemo } from 'react';
import { Search, Calendar, Image, Film, FileText, FileX, SlidersHorizontal, X, RotateCcw, Play, Images } from 'lucide-react';

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

  const mediaTypeOptions: { value: NewsFilters['mediaType']; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'all', label: 'All Types', icon: <SlidersHorizontal size={14} />, count: stats.total },
    { value: 'photo', label: 'Photos', icon: <Image size={14} />, count: stats.photoCount },
    { value: 'video', label: 'Videos', icon: <Play size={14} />, count: stats.videoCount },
    { value: 'album', label: 'Albums', icon: <Images size={14} />, count: stats.albumCount },
  ];

  const messageOptions: { value: NewsFilters['hasMessage']; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'all', label: 'All Posts', icon: <SlidersHorizontal size={14} />, count: stats.total },
    { value: 'with-text', label: 'With Message', icon: <FileText size={14} />, count: stats.withTextCount },
    { value: 'media-only', label: 'Media Only', icon: <FileX size={14} />, count: stats.mediaOnlyCount },
  ];

  return (
    <div className="lg:w-1/3 space-y-6">
      {/* Filter Header with Reset */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#185C20]" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Filter Feed</h4>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-[#185C20] text-white text-[9px] font-black rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-[#185C20] transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>

        {/* Results summary */}
        <div className="mb-5 px-3 py-2.5 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Showing <span className="text-[#185C20] font-black">{filteredCount}</span> of{' '}
            <span className="font-black text-gray-700">{stats.total}</span> loaded posts
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search posts..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
          <Calendar size={18} className="text-[#185C20]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Date Posted</h4>
        </div>
        <div className="space-y-1">
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ dateRange: opt.value })}
              className={`group w-full flex justify-between items-center text-xs py-2.5 px-3 rounded-lg transition-all ${
                filters.dateRange === opt.value
                  ? 'bg-[#185C20] text-white font-black'
                  : 'text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span>{opt.label}</span>
              <span className={`text-[10px] tabular-nums ${
                filters.dateRange === opt.value
                  ? 'text-white/70'
                  : 'text-gray-300'
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Media Type Filter */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
          <Film size={18} className="text-[#185C20]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Media Type</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {mediaTypeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ mediaType: opt.value })}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                filters.mediaType === opt.value
                  ? 'bg-[#185C20] text-white border-[#185C20] shadow-lg shadow-[#185C20]/20'
                  : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600'
              }`}
            >
              {opt.icon}
              <span className="text-[10px] font-black uppercase tracking-wider">{opt.label}</span>
              <span className={`text-[9px] tabular-nums ${
                filters.mediaType === opt.value ? 'text-white/60' : 'text-gray-300'
              }`}>
                {opt.count} {opt.count === 1 ? 'post' : 'posts'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Content Filter */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
          <FileText size={18} className="text-[#185C20]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">Content</h4>
        </div>
        <div className="space-y-1.5">
          {messageOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ hasMessage: opt.value })}
              className={`group w-full flex items-center gap-3 text-xs py-2.5 px-3 rounded-lg transition-all ${
                filters.hasMessage === opt.value
                  ? 'bg-[#185C20] text-white font-black'
                  : 'text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span className={filters.hasMessage === opt.value ? 'text-[#EDCD1F]' : 'text-gray-300'}>{opt.icon}</span>
              <span className="flex-1 text-left">{opt.label}</span>
              <span className={`text-[10px] tabular-nums ${
                filters.hasMessage === opt.value ? 'text-white/70' : 'text-gray-300'
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="bg-[#185C20] p-6 rounded-3xl shadow-xl shadow-[#185C20]/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-[#EDCD1F] relative z-10">Active Filters</h4>
          <div className="flex flex-wrap gap-2 relative z-10">
            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-bold">
                <Search size={10} /> &ldquo;{filters.search.length > 15 ? filters.search.slice(0, 15) + '…' : filters.search}&rdquo;
                <button onClick={() => update({ search: '' })} className="ml-0.5 hover:text-[#EDCD1F] transition-colors"><X size={10} /></button>
              </span>
            )}
            {filters.dateRange !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-bold">
                <Calendar size={10} /> {dateRangeOptions.find(o => o.value === filters.dateRange)?.label}
                <button onClick={() => update({ dateRange: 'all' })} className="ml-0.5 hover:text-[#EDCD1F] transition-colors"><X size={10} /></button>
              </span>
            )}
            {filters.mediaType !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-bold">
                <Film size={10} /> {mediaTypeOptions.find(o => o.value === filters.mediaType)?.label}
                <button onClick={() => update({ mediaType: 'all' })} className="ml-0.5 hover:text-[#EDCD1F] transition-colors"><X size={10} /></button>
              </span>
            )}
            {filters.hasMessage !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-bold">
                <FileText size={10} /> {messageOptions.find(o => o.value === filters.hasMessage)?.label}
                <button onClick={() => update({ hasMessage: 'all' })} className="ml-0.5 hover:text-[#EDCD1F] transition-colors"><X size={10} /></button>
              </span>
            )}
          </div>
          <button
            onClick={resetFilters}
            className="mt-4 w-full py-3 bg-[#EDCD1F] text-[#185C20] font-black text-[10px] uppercase tracking-[0.3em] rounded-xl hover:brightness-110 active:scale-[0.98] transition-all relative z-10"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
