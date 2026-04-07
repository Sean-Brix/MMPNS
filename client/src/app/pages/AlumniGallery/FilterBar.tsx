import React from 'react';
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react';

interface FilterBarProps {
  setCurrentPage: (page: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterBatch: string;
  setFilterBatch: (b: string) => void;
  filterField: string;
  setFilterField: (f: string) => void;
  batchYears: string[];
  fields: string[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  resultsCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  setCurrentPage,
  searchQuery,
  setSearchQuery,
  filterBatch,
  setFilterBatch,
  filterField,
  setFilterField,
  batchYears,
  fields,
  hasActiveFilters,
  clearFilters,
  resultsCount
}) => {
  return (
    <section className="sticky top-10 z-40 bg-[#FAF9F6]/95 backdrop-blur-xl border-b border-[#185C20]/10 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 border-b border-[#185C20]/5">
          <button 
            onClick={() => setCurrentPage('alumni')} 
            className="group flex items-center gap-2.5 text-[#185C20]/60 hover:text-[#185C20] transition-all text-[11px] font-bold tracking-[0.2em] uppercase cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full border border-[#185C20]/10 flex items-center justify-center group-hover:border-[#EDCD1F] group-hover:bg-[#EDCD1F]/5 transition-all">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span>Back to Alumni</span>
          </button>
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#185C20] font-bold tracking-[0.4em] uppercase">Yearbook Archive</span>
              <span className="text-[9px] text-[#EDCD1F] font-medium tracking-[0.3em] uppercase">Voices That Echo</span>
            </div>
            <div className="w-px h-8 bg-[#185C20]/10" />
            <BookOpen size={16} className="text-[#185C20]/30" />
          </div>
        </div>

        <div className="py-5 md:py-7">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-12">
            <div className="w-full lg:w-64 shrink-0 space-y-4">
              <div className="space-y-2">
                <span className="text-[9px] text-[#185C20]/40 font-bold uppercase tracking-[0.3em] block ml-1">Search Directory</span>
                <div className="relative group">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#185C20]/30 group-focus-within:text-[#EDCD1F] transition-colors" />
                  <input
                    type="text"
                    placeholder="Find alumni..."
                    className="w-full pl-11 pr-10 py-2.5 bg-white border border-[#185C20]/8 rounded-xl text-[13px] text-[#185C20] placeholder-[#185C20]/25 focus:outline-none focus:ring-4 focus:ring-[#EDCD1F]/10 focus:border-[#EDCD1F]/40 transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-[#185C20]/20 hover:text-[#185C20]/60 hover:bg-[#185C20]/5 cursor-pointer transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-[#185C20]/40 italic">
                  Found <span className="text-[#185C20] font-bold not-italic">{resultsCount}</span> portraits
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[9px] text-[#EDCD1F] hover:text-[#185C20] font-bold uppercase tracking-wider transition-colors cursor-pointer underline underline-offset-4 decoration-[#EDCD1F]/30">
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#EDCD1F]" />
                    <span className="text-[9px] text-[#185C20]/40 font-bold uppercase tracking-[0.3em]">Batch</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {batchYears.map(year => (
                      <button
                        key={year}
                        onClick={() => setFilterBatch(year)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          filterBatch === year
                            ? 'bg-[#185C20] border-[#185C20] text-white shadow-md shadow-[#185C20]/10'
                            : 'bg-white border-[#185C20]/5 text-[#185C20]/35 hover:border-[#185C20]/20 hover:text-[#185C20]'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#EDCD1F]" />
                    <span className="text-[9px] text-[#185C20]/40 font-bold uppercase tracking-[0.3em]">Field</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fields.map(field => (
                      <button
                        key={field}
                        onClick={() => setFilterField(field)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                          filterField === field
                            ? 'bg-[#185C20] border-[#185C20] text-white shadow-md shadow-[#185C20]/10'
                            : 'bg-white border-[#185C20]/5 text-[#185C20]/35 hover:border-[#185C20]/20 hover:text-[#185C20]'
                        }`}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
