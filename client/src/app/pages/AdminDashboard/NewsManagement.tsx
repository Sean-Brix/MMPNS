import React from 'react';
import { Search, Filter, Plus, FileText, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { newsPosts } from './data';

export const NewsManagement: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search articles..." className="bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#185C20]/10 w-64 shadow-sm" />
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2"><Filter size={16} /> Filter</Button>
        </div>
        <Button className="flex items-center gap-2 rounded-xl h-11 px-6"><Plus size={18} /> New Article</Button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Title</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date Published</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {newsPosts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400"><FileText size={20} /></div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm max-w-md truncate">{post.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium">By {post.author}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5"><span className="text-xs font-bold text-gray-600 px-3 py-1 bg-gray-100 rounded-full">{post.category}</span></td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${post.status === 'Published' ? 'bg-[#185C20]' : 'bg-orange-400'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">{post.status}</span>
                  </div>
                </td>
                <td className="px-8 py-5"><p className="text-sm font-medium text-gray-600">{post.date}</p></td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 text-gray-400 hover:text-[#185C20] transition-all"><Edit3 size={16} /></button>
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
