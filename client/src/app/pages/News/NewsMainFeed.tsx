import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Quote, ArrowRight, ExternalLink, X, ThumbsUp, MessageSquare, Send, Share2, Facebook, Loader2, ChevronDown, ChevronLeft, ChevronRight, Play, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Skeleton } from '../../components/ui/skeleton';
import { NewsFilters } from './NewsSidebar';
import type { NewsItemForStats } from './NewsSidebar';

interface MediaItem {
  type: 'photo' | 'video';
  src: string; // image src or video poster
  videoSrc?: string; // video source URL
}

interface NewsItem {
  id: string;
  title: string;
  category: 'Announcement' | 'Event' | 'Activity';
  date: string;
  excerpt: string;
  image: string; // thumbnail for the feed card
  media: MediaItem[]; // all media for the slider
  likes: string;
  commentsCount: string;
  url?: string;
}

interface CachedPage {
  items: NewsItem[];
  nextUrl: string | null;
  timestamp: number;
}

interface PaginationCache {
  pages: CachedPage[];
  timestamp: number;
}

const POSTS_PER_PAGE = 3;
const CACHE_KEY = 'mmpns_gazette_pages';
const OLD_CACHE_KEY = 'mmpns_news_cache'; // legacy key to clean up
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Normalize a news item to ensure media field always exists (handles stale cache)
const normalizeNewsItem = (item: any): NewsItem => {
  const media: MediaItem[] = Array.isArray(item.media) && item.media.length > 0
    ? item.media
    : [{ type: 'photo' as const, src: item.image || '' }];
  return { ...item, media };
};

const normalizeCachedPages = (pages: any[]): CachedPage[] => {
  return pages.map(page => ({
    ...page,
    items: Array.isArray(page.items) ? page.items.map(normalizeNewsItem) : [],
  }));
};

// Facebook Graph API Configuration
const FB_ACCESS_TOKEN = "EAAW5ZBzP4RD0BQ4kFvbfb8bpwu1DGiReb7hjhAeErlSCWZCZB28Hab23yhk3CZBLVV6YQRQgB1SEXnbcTrJ1zfB9p2USO3zO7gf1REZCBs6UpRaSOn48Nob7K0GZC7yvEQkz05hUczWbz2QnnCW1YVZChk4MzVkd89QbZBnEgo9m23krusaYL6jmQB9Y5yXY0ANnAwWSlqFmq401sACepJHqabfT1SaqjGFZCt6g4SxQZD";
const PAGE_ID = "441612072362122";

const INITIAL_API_URL = FB_ACCESS_TOKEN
  ? `https://graph.facebook.com/v25.0/${PAGE_ID}/posts?fields=id,message,created_time,attachments{media_type,media,url,subattachments{media_type,media,url}}&limit=${POSTS_PER_PAGE}&access_token=${FB_ACCESS_TOKEN}`
  : null;

const extractMediaItems = (attachments: any): MediaItem[] => {
  const media: MediaItem[] = [];
  if (!attachments?.data?.length) return media;

  const mainAttachment = attachments.data[0];

  // Album: has subattachments with multiple media items
  if (mainAttachment.subattachments?.data?.length) {
    for (const sub of mainAttachment.subattachments.data) {
      if (sub.media_type === 'video') {
        media.push({
          type: 'video',
          src: sub.media?.image?.src || '',
          videoSrc: sub.media?.source || sub.url || ''
        });
      } else {
        // photo or other image-based types
        if (sub.media?.image?.src) {
          media.push({ type: 'photo', src: sub.media.image.src });
        }
      }
    }
    return media;
  }

  // Single video
  if (mainAttachment.media_type === 'video') {
    media.push({
      type: 'video',
      src: mainAttachment.media?.image?.src || '',
      videoSrc: mainAttachment.media?.source || mainAttachment.url || ''
    });
    return media;
  }

  // Single photo or other
  if (mainAttachment.media?.image?.src) {
    media.push({ type: 'photo', src: mainAttachment.media.image.src });
  }

  return media;
};

const formatPost = (post: any): NewsItem => {
  const firstLine = post.message ? post.message.split('\n')[0] : "School Update";
  const title = firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine;

  const media = extractMediaItems(post.attachments);
  const fallbackImage = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800";
  const imageUrl = media.length > 0 ? media[0].src : fallbackImage;

  // If no media was extracted, add the fallback as a single photo
  if (media.length === 0) {
    media.push({ type: 'photo', src: fallbackImage });
  }

  const dateObj = new Date(post.created_time);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });

  return {
    id: post.id,
    title: title || "New Announcement",
    category: post.message?.toLowerCase().includes('event') ? 'Event' :
              post.message?.toLowerCase().includes('activity') ? 'Activity' : 'Announcement',
    date: formattedDate,
    excerpt: post.message || "No content available.",
    image: imageUrl,
    media: media,
    likes: "Interact",
    commentsCount: "Feed",
    url: post.attachments?.data?.[0]?.url || `https://facebook.com/${post.id}`
  };
};

const FALLBACK_DATA: NewsItem[] = [
  {
    id: "1",
    title: 'Grand Parents Day 2025: Celebrating Wisdom and Love',
    category: 'Event',
    date: 'Oct 28, 2025',
    excerpt: 'MMPNS honors the grandparents of our students in a special morning of tribute, prayer, and performances.',
    image: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&q=80&w=800",
    media: [{ type: 'photo', src: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&q=80&w=800" }],
    likes: '1.2K',
    commentsCount: '84'
  },
  {
    id: "2",
    title: 'Schedule of First Quarter Examinations',
    category: 'Announcement',
    date: 'Oct 20, 2025',
    excerpt: 'Please be guided by the examination schedule for the First Quarter. Students are reminded to settle their accounts.',
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800",
    media: [{ type: 'photo', src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800" }],
    likes: '456',
    commentsCount: '12'
  },
  {
    id: "3",
    title: 'Math-Science Month Opening Ceremony',
    category: 'Activity',
    date: 'Oct 05, 2025',
    excerpt: 'Unleashing the young scientists and mathematicians within! The month-long celebration kicked off with exciting trivia.',
    image: "https://images.unsplash.com/photo-1758685734153-132c8620c1bd?auto=format&fit=crop&q=80&w=800",
    media: [{ type: 'photo', src: "https://images.unsplash.com/photo-1758685734153-132c8620c1bd?auto=format&fit=crop&q=80&w=800" }],
    likes: '892',
    commentsCount: '31'
  }
];

// Helper to check date against filter range
const isInDateRange = (dateStr: string, range: NewsFilters['dateRange']): boolean => {
  if (range === 'all') return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true; // keep items with unparseable dates
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'today': return d >= startOfToday;
    case 'week': {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return d >= startOfWeek;
    }
    case 'month': return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year': return d >= new Date(now.getFullYear(), 0, 1);
    default: return true;
  }
};

// Helper to check media type against filter
const matchesMediaType = (media: MediaItem[], filterType: NewsFilters['mediaType']): boolean => {
  if (filterType === 'all') return true;
  if (filterType === 'album') return (media?.length ?? 0) > 1;
  if (filterType === 'video') return media?.some(m => m.type === 'video') && (media?.length ?? 0) <= 1;
  if (filterType === 'photo') return media?.every(m => m.type === 'photo') && (media?.length ?? 0) <= 1;
  return true;
};

// Helper to check message content against filter
const matchesMessageFilter = (excerpt: string, filter: NewsFilters['hasMessage']): boolean => {
  if (filter === 'all') return true;
  const hasText = excerpt && excerpt !== 'No content available.' && excerpt.trim().length > 0;
  return filter === 'with-text' ? hasText : !hasText;
};

interface NewsMainFeedProps {
  filters: NewsFilters;
  onAllItemsChange: (items: NewsItemForStats[]) => void;
  onFilteredCountChange: (count: number) => void;
}

const NewsFeedSkeleton: React.FC = () => {
  return (
    <div className="lg:w-2/3 space-y-10" aria-busy="true" aria-label="Loading news feed">
      <div className="space-y-3 border-b-4 border-[#185C20] pb-4">
        <Skeleton className="h-10 w-[min(90%,520px)]" />
        <Skeleton className="h-3 w-full max-w-[460px]" />
      </div>

      <div className="space-y-16">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex flex-col gap-8 md:flex-row">
            <Skeleton className="aspect-[4/3] w-full rounded-sm md:w-1/2" />
            <div className="space-y-4 md:w-1/2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-11/12" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-9/12" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NewsMainFeed: React.FC<NewsMainFeedProps> = ({ filters, onAllItemsChange, onFilteredCountChange }) => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [pages, setPages] = useState<CachedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const feedTopRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause active video when sliding away or closing modal
  const pauseActiveVideo = useCallback(() => {
    try {
      videoRef.current?.pause();
    } catch {}
  }, []);

  // Clean up legacy cache keys on mount
  useEffect(() => {
    try {
      localStorage.removeItem(OLD_CACHE_KEY);
      // Also invalidate current cache if it has old schema (no media field)
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const firstItem = parsed?.pages?.[0]?.items?.[0];
        if (firstItem && !Array.isArray(firstItem.media)) {
          console.log("[MMPNS Gazette] Clearing stale cache with old schema.");
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {}
  }, []);

  // Get cached pagination data
  const getCachedPages = useCallback((): PaginationCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed: PaginationCache = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
      if (isExpired) {
        console.log("[MMPNS Gazette] Page cache expired.");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  // Save pagination data to cache
  const savePagesToCache = useCallback((pagesData: CachedPage[]) => {
    const cachePayload: PaginationCache = {
      pages: pagesData,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
    console.log(`[MMPNS Gazette] Cached ${pagesData.length} page(s) to localStorage.`);
  }, []);

  // Fetch a page from Facebook API
  const fetchPage = useCallback(async (url: string): Promise<{ items: NewsItem[]; nextUrl: string | null }> => {
    console.log(`[MMPNS Gazette] Fetching page from Facebook Graph API...`);
    const response = await fetch(url);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message);
    }

    const items: NewsItem[] = (json.data || []).map(formatPost);
    const nextUrl: string | null = json.paging?.next || null;

    return { items, nextUrl };
  }, []);

  // Initial load: fetch first page or use cache
  useEffect(() => {
    const loadInitialPage = async () => {
      try {
        setLoading(true);

        // Check cache first
        const cached = getCachedPages();
        if (cached && cached.pages.length > 0) {
          console.log(`[MMPNS Gazette] Serving ${cached.pages.length} cached page(s).`);
          setPages(normalizeCachedPages(cached.pages));
          const lastPage = cached.pages[cached.pages.length - 1];
          setHasMore(lastPage.nextUrl !== null);
          setLoading(false);
          return;
        }

        if (!INITIAL_API_URL) {
          throw new Error("Facebook Access Token is missing. Using fallback data.");
        }

        const { items, nextUrl } = await fetchPage(INITIAL_API_URL);
        const newPage: CachedPage = { items, nextUrl, timestamp: Date.now() };
        setPages([newPage]);
        setHasMore(nextUrl !== null);
        savePagesToCache([newPage]);
        console.log("[MMPNS Gazette] Successfully synced first page with Facebook.");
      } catch (err: any) {
        console.error("[MMPNS Gazette] API Error:", err);

        // Try stale cache
        try {
          const staleRaw = localStorage.getItem(CACHE_KEY);
          if (staleRaw) {
            const stale: PaginationCache = JSON.parse(staleRaw);
            if (stale.pages.length > 0) {
              console.log("[MMPNS Gazette] API failed. Serving stale cached pages.");
              setPages(normalizeCachedPages(stale.pages));
              setError("Using cached posts. Facebook connection temporarily unavailable.");
              setLoading(false);
              return;
            }
          }
        } catch {}

        console.log("[MMPNS Gazette] API failed and no cache. Serving sample content.");
        setError("Unable to load latest Facebook posts. Showing sample content.");
        const fallbackPage: CachedPage = { items: FALLBACK_DATA, nextUrl: null, timestamp: Date.now() };
        setPages([fallbackPage]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    loadInitialPage();
  }, []);

  // Load next page
  const loadNextPage = useCallback(async () => {
    // If we already have the next page cached, just navigate
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Need to fetch from API
    const currentPage = pages[currentPageIndex];
    if (!currentPage?.nextUrl) return;

    try {
      setLoadingMore(true);
      const { items, nextUrl } = await fetchPage(currentPage.nextUrl);
      const newPage: CachedPage = { items, nextUrl, timestamp: Date.now() };
      const updatedPages = [...pages, newPage];
      setPages(updatedPages);
      setCurrentPageIndex(updatedPages.length - 1);
      setHasMore(nextUrl !== null);
      savePagesToCache(updatedPages);
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log(`[MMPNS Gazette] Loaded page ${updatedPages.length}. ${nextUrl ? 'More available.' : 'No more pages.'}`);
    } catch (err: any) {
      console.error("[MMPNS Gazette] Pagination Error:", err);
      setError("Failed to load more posts. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [currentPageIndex, pages, fetchPage, savePagesToCache]);

  // Go to previous page
  const loadPrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPageIndex]);

  // All loaded items across all pages — for sidebar stats
  const allLoadedItems = useMemo(
    () => pages.flatMap(p => (p.items || []).map(normalizeNewsItem)),
    [pages]
  );

  // Report all items to parent for sidebar stats
  useEffect(() => {
    onAllItemsChange(allLoadedItems);
  }, [allLoadedItems, onAllItemsChange]);

  // Current page items before filtering
  const currentPageItems = useMemo(
    () => (pages[currentPageIndex]?.items || []).map(normalizeNewsItem),
    [pages, currentPageIndex]
  );

  // Apply filters to current page items
  const currentItems = useMemo(() => {
    const searchLower = filters.search.toLowerCase().trim();
    return currentPageItems.filter(item => {
      if (searchLower && !item.title.toLowerCase().includes(searchLower) && !item.excerpt.toLowerCase().includes(searchLower)) {
        return false;
      }
      if (!isInDateRange(item.date, filters.dateRange)) return false;
      if (!matchesMediaType(item.media, filters.mediaType)) return false;
      if (!matchesMessageFilter(item.excerpt, filters.hasMessage)) return false;
      return true;
    });
  }, [currentPageItems, filters]);

  // Report filtered count across ALL pages to parent
  useEffect(() => {
    const searchLower = filters.search.toLowerCase().trim();
    const count = allLoadedItems.filter(item => {
      if (searchLower && !item.title.toLowerCase().includes(searchLower) && !item.excerpt.toLowerCase().includes(searchLower)) return false;
      if (!isInDateRange(item.date, filters.dateRange)) return false;
      if (!matchesMediaType(item.media, filters.mediaType)) return false;
      if (!matchesMessageFilter(item.excerpt, filters.hasMessage)) return false;
      return true;
    }).length;
    onFilteredCountChange(count);
  }, [allLoadedItems, filters, onFilteredCountChange]);

  const totalLoadedPosts = useMemo(
    () => pages.reduce((sum, p) => sum + (p.items?.length ?? 0), 0),
    [pages]
  );
  const canGoNext = currentPageIndex < pages.length - 1 || (hasMore && pages[currentPageIndex]?.nextUrl);
  const canGoPrev = currentPageIndex > 0;

  if (loading) {
    return (
      <NewsFeedSkeleton />
    );
  }

  return (
    <div className="lg:w-2/3 space-y-12">
      {/* Editorial Header */}
      <div ref={feedTopRef} className="border-b-4 border-[#185C20] pb-4 mb-12 scroll-mt-8">
        <h2 className="text-4xl font-black text-[#185C20] uppercase tracking-tighter">The MMPNS Gazette</h2>
        <div className="flex justify-between items-center mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Institutional Bulletin &middot; Live Facebook Sync</span>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <p className="text-xs text-red-600 font-bold">{error}</p>
        </div>
      )}

      {/* Page Indicator */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Page {currentPageIndex + 1} of {pages.length}{hasMore ? '+' : ''} &middot; {totalLoadedPosts} posts loaded
        </p>
        <div className="flex items-center gap-1">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentPageIndex(idx);
                feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === currentPageIndex 
                  ? 'bg-[#185C20] w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Posts for Current Page */}
      <div className="space-y-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPageIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-20"
          >
            {currentItems.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm font-black text-gray-300 uppercase tracking-widest mb-2">No matching posts on this page</p>
                <p className="text-xs text-gray-400">Try adjusting your filters or navigating to another page.</p>
              </div>
            )}
            {currentItems.map((news, idx) => (
              <motion.article 
                key={news.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="group cursor-pointer"
                onClick={() => { setSelectedNews(news); setMediaIndex(0); }}
              >
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Media Column */}
                  <div className="md:w-1/2 relative">
                    <div className="aspect-[4/3] rounded-sm overflow-hidden border border-gray-100 shadow-xl">
                      <ImageWithFallback 
                        src={news.image} 
                        alt={news.title} 
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                      />
                    </div>
                    <div className="absolute -top-3 -left-3 px-4 py-2 bg-[#EDCD1F] text-[#185C20] text-[10px] font-black uppercase tracking-widest shadow-lg transform -rotate-2">
                      {news.category}
                    </div>
                    {(news.media?.length ?? 0) > 1 && (
                      <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-1.5 text-white text-[10px] font-black">
                        <ImageIcon size={12} />
                        {news.media.length}
                      </div>
                    )}
                  </div>

                  {/* Text Column */}
                  <div className="md:w-1/2 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      <Calendar size={12} className="text-[#185C20]" />
                      {news.date}
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-6 leading-[0.9] group-hover:text-[#185C20] transition-colors line-clamp-2">
                      {news.title}
                    </h3>
                    <div className="relative mb-8">
                      <Quote size={24} className="absolute -top-4 -left-6 text-gray-100 -z-10" />
                      <p className="text-sm text-gray-600 leading-relaxed font-serif line-clamp-3">
                        {news.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <button className="inline-flex items-center gap-2 text-[11px] font-black text-[#185C20] uppercase tracking-widest border-b-2 border-[#EDCD1F] pb-1 hover:gap-4 transition-all">
                        View Post <ArrowRight size={14} />
                      </button>
                      <div className="flex items-center gap-3 text-gray-300">
                        <span className="flex items-center gap-1 text-[10px] font-bold"><ThumbsUp size={12} /> {news.likes}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold"><MessageSquare size={12} /> {news.commentsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      <div className="border-t-2 border-[#185C20] pt-8">
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <button
            onClick={loadPrevPage}
            disabled={!canGoPrev}
            className={`inline-flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              canGoPrev
                ? 'text-[#185C20] border-2 border-[#185C20] hover:bg-[#185C20] hover:text-white'
                : 'text-gray-300 border-2 border-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          {/* Page Number */}
          <div className="text-center">
            <p className="text-2xl font-black text-[#185C20]">{currentPageIndex + 1}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Edition</p>
          </div>

          {/* Next / Load More Button */}
          <button
            onClick={loadNextPage}
            disabled={!canGoNext || loadingMore}
            className={`inline-flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              canGoNext && !loadingMore
                ? 'text-white bg-[#185C20] border-2 border-[#185C20] hover:bg-[#185C20]/90'
                : 'text-gray-300 bg-gray-100 border-2 border-gray-200 cursor-not-allowed'
            }`}
          >
            {loadingMore ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Loading...
              </>
            ) : currentPageIndex < pages.length - 1 ? (
              <>
                Next
                <ChevronRight size={14} />
              </>
            ) : hasMore ? (
              <>
                Load More
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                End of Feed
              </>
            )}
          </button>
        </div>

        {/* Visual flourish */}
        <div className="flex items-center justify-center mt-6 gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-3">
            {hasMore ? `Showing ${POSTS_PER_PAGE} posts per page` : `All ${totalLoadedPosts} posts loaded`}
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      </div>

      <AnimatePresence>
        {selectedNews && (() => {
          // Safe media array - handles stale cache without media field
          const mediaItems: MediaItem[] = selectedNews.media && selectedNews.media.length > 0
            ? selectedNews.media
            : [{ type: 'photo' as const, src: selectedNews.image }];
          const safeMediaIndex = Math.min(mediaIndex, mediaItems.length - 1);

          return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { pauseActiveVideo(); setSelectedNews(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => { pauseActiveVideo(); setSelectedNews(null); }}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white md:text-gray-900 md:bg-gray-100 md:hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Media Slider */}
              <div className="md:w-3/5 relative h-64 md:h-auto shrink-0 bg-black overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={safeMediaIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    {mediaItems[safeMediaIndex]?.type === 'video' ? (
                      <video
                        key={`video-${safeMediaIndex}`}
                        ref={videoRef}
                        src={mediaItems[safeMediaIndex].videoSrc}
                        poster={mediaItems[safeMediaIndex].src}
                        controls
                        autoPlay
                        muted
                        playsInline
                        preload="auto"
                        controlsList="nodownload"
                        disablePictureInPicture
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <ImageWithFallback
                        src={mediaItems[safeMediaIndex]?.src || selectedNews.image}
                        alt={`${selectedNews.title} - ${safeMediaIndex + 1}`}
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Preload adjacent media for smoother slider navigation */}
                {mediaItems.length > 1 && (
                  <div className="hidden" aria-hidden="true">
                    {[safeMediaIndex - 1, safeMediaIndex + 1]
                      .map(i => (i + mediaItems.length) % mediaItems.length)
                      .filter(i => i !== safeMediaIndex)
                      .map(i => {
                        const item = mediaItems[i];
                        if (!item) return null;
                        if (item.type === 'video') {
                          return <link key={`preload-${i}`} rel="preload" as="image" href={item.src} />;
                        }
                        return <img key={`preload-${i}`} src={item.src} alt="" loading="eager" decoding="async" />;
                      })}
                  </div>
                )}

                {/* Slider Navigation Arrows */}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); pauseActiveVideo(); setMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); pauseActiveVideo(); setMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Counter Badge */}
                {mediaItems.length > 1 && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-[10px] font-black tracking-wider flex items-center gap-1.5">
                    {mediaItems[safeMediaIndex]?.type === 'video' ? <Play size={10} /> : <ImageIcon size={10} />}
                    {safeMediaIndex + 1} / {mediaItems.length}
                  </div>
                )}

                {/* Dot Indicators */}
                {mediaItems.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {mediaItems.map((m, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); pauseActiveVideo(); setMediaIndex(idx); }}
                        className={`rounded-full transition-all duration-300 ${
                          idx === safeMediaIndex
                            ? 'w-6 h-2 bg-white'
                            : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Mobile overlay info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none md:hidden" />
                <div className="absolute bottom-6 left-6 md:hidden pointer-events-none">
                  <span className="px-3 py-1 bg-[#EDCD1F] text-[#185C20] text-[10px] font-black uppercase tracking-widest rounded-full">
                    {selectedNews.category}
                  </span>
                  <h2 className="text-xl font-black text-white mt-2 leading-tight">{selectedNews.title}</h2>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-8 md:p-10 flex-grow overflow-y-auto custom-scrollbar">
                  <div className="hidden md:block mb-8">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-[#185C20] uppercase tracking-widest mb-3">
                      <span className="px-2 py-0.5 bg-[#EDCD1F] rounded">{selectedNews.category}</span>
                      <span>&middot;</span>
                      <span className="text-gray-400">{selectedNews.date}</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 leading-[1.1]">{selectedNews.title}</h2>
                  </div>

                  <div className="space-y-6">
                    <p className="text-base text-gray-700 leading-relaxed font-serif whitespace-pre-wrap">
                      {selectedNews.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-50 space-y-3">
                  <a 
                    href={selectedNews.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-4 px-4 bg-[#1877F2] text-white rounded-xl cursor-pointer hover:bg-[#1877F2]/90 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <Facebook size={14} />
                    View Original Post on Facebook
                  </a>
                  <button 
                    onClick={() => { pauseActiveVideo(); setSelectedNews(null); }}
                    className="w-full py-3 bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-100"
                  >
                    Return to Gazette
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};