import React from 'react';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { personnel } from './data';

export const FacultyManagement: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-xl">Faculty Directory</h3>
          <p className="text-sm text-gray-400">Manage school staff and teaching personnel</p>
        </div>
        <Button className="flex items-center gap-2"><Plus size={18} /> Add Personnel</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personnel.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 text-gray-400 hover:text-[#185C20]"><MoreVertical size={16} /></button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <img src={p.image} alt={p.name} className="w-16 h-16 rounded-2xl object-cover" />
              <div>
                <h4 className="font-bold text-gray-900 leading-tight">{p.name}</h4>
                <p className="text-xs text-[#185C20] font-bold">{p.role}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-widest">Dept</span>
                <span className="text-gray-900 font-medium">{p.department}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-widest">Email</span>
                <span className="text-gray-900 font-medium truncate ml-4">{p.email}</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-50 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 font-bold">Edit Profile</Button>
              <Button variant="outline" size="sm" className="w-10 p-0 flex items-center justify-center border-red-50/50 hover:bg-red-50 hover:border-red-100 text-gray-300 hover:text-red-500"><Trash2 size={16} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
