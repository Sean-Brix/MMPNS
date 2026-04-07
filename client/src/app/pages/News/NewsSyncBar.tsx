import React from 'react';
import { Facebook, RefreshCcw } from 'lucide-react';

export const NewsSyncBar: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-100 py-3">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
        <div className="flex items-center gap-2 text-gray-500">
          <Facebook size={14} className="text-[#1877F2]" />
          Synced with <span className="text-[#185C20]">MMPNS Official Facebook Page</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 italic">Last synced: 15 minutes ago</span>
          <button className="flex items-center gap-1 text-[#185C20] hover:underline cursor-pointer">
            <RefreshCcw size={12} /> Sync Now
          </button>
        </div>
      </div>
    </div>
  );
};
