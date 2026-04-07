import React, { useState, useCallback } from 'react';
import { NewsHeader } from './NewsHeader';
import { NewsSyncBar } from './NewsSyncBar';
import { NewsMainFeed } from './NewsMainFeed';
import { NewsSidebar, DEFAULT_FILTERS, type NewsFilters, type NewsItemForStats } from './NewsSidebar';

export const News: React.FC = () => {
  const [filters, setFilters] = useState<NewsFilters>(DEFAULT_FILTERS);
  const [allItems, setAllItems] = useState<NewsItemForStats[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);

  const handleAllItemsChange = useCallback((items: NewsItemForStats[]) => {
    setAllItems(items);
  }, []);

  const handleFilteredCountChange = useCallback((count: number) => {
    setFilteredCount(count);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <NewsHeader />
      <NewsSyncBar />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <NewsMainFeed
            filters={filters}
            onAllItemsChange={handleAllItemsChange}
            onFilteredCountChange={handleFilteredCountChange}
          />
          <NewsSidebar
            filters={filters}
            onFiltersChange={setFilters}
            allItems={allItems}
            filteredCount={filteredCount}
          />
        </div>
      </div>
    </div>
  );
};

export default News;
