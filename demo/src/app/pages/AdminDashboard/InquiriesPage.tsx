import React from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { inquiries } from './data';

export const InquiriesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-xl">Inbox</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">Sort by:</span>
          <select className="bg-white border border-gray-100 rounded-lg text-xs font-bold px-3 py-2 outline-none shadow-sm">
            <option>Most Recent</option>
            <option>Unread First</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {inquiries.map((inq) => (
          <div key={inq.id} className={`p-8 hover:bg-gray-50/50 transition-all group relative cursor-pointer ${inq.status === 'New' ? 'bg-blue-50/30' : ''}`}>
            {inq.status === 'New' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#185C20]"></div>}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#185C20]/10 rounded-2xl flex items-center justify-center font-black text-[#185C20]">
                  {inq.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{inq.name}</h4>
                  <p className="text-xs text-gray-400 font-medium">{inq.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  inq.status === 'New' ? 'bg-blue-100 text-blue-600' : 
                  inq.status === 'Replied' ? 'bg-green-100 text-[#185C20]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {inq.status}
                </span>
                <button className="p-2 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"><MoreVertical size={16} /></button>
              </div>
            </div>
            <div className="pl-16">
              <h5 className="font-bold text-gray-800 text-sm mb-2">{inq.subject}</h5>
              <p className="text-sm text-gray-500 leading-relaxed max-w-3xl line-clamp-2">{inq.message}</p>
              <div className="mt-6 flex items-center gap-4">
                <Button size="sm" className="font-bold px-6">Reply Now</Button>
                <Button variant="outline" size="sm" className="font-bold px-6">Mark as {inq.status === 'Read' ? 'Replied' : 'Read'}</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
