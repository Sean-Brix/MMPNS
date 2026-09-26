import React from 'react';
import { LayoutDashboard, FileEdit, Users, BookOpen, MessageSquare, Image as ImageIcon, Settings, Bell, Search, Plus, Filter, MoreVertical, Edit3, Trash2, ExternalLink, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
      active 
        ? 'bg-[#EDCD1F] text-[#185C20] shadow-lg shadow-[#EDCD1F]/20' 
        : 'text-white/70 hover:text-white hover:bg-white/10'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={`${active ? 'text-[#185C20]' : 'text-white/40 group-hover:text-white/70'} transition-colors`}>
        {icon}
      </span>
      {label}
    </div>
    {badge && (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
        active ? 'bg-[#185C20] text-[#EDCD1F]' : 'bg-red-500 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

export const DashboardSidebar: React.FC<{ 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onGoHome: () => void;
}> = ({ activeTab, setActiveTab, onLogout, onGoHome }) => {
  const menuItems = [
    { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview' },
    { id: 'news', icon: <FileEdit size={18} />, label: 'News & Events', badge: '3' },
    { id: 'faculty', icon: <Users size={18} />, label: 'Faculty & Staff' },
    { id: 'academics', icon: <BookOpen size={18} />, label: 'Academics' },
    { id: 'inquiries', icon: <MessageSquare size={18} />, label: 'Inquiries', badge: '12' },
    { id: 'gallery', icon: <ImageIcon size={18} />, label: 'Media Gallery' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <div className="w-72 bg-[#185C20] text-white flex flex-col h-screen sticky top-0 border-r border-white/5 shadow-2xl">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={onGoHome}>
          <div className="w-10 h-10 bg-[#EDCD1F] rounded-xl flex items-center justify-center shadow-lg shadow-[#EDCD1F]/20 group-hover:scale-105 transition-transform">
            <span className="text-[#185C20] font-black text-xl">M</span>
          </div>
          <div>
            <h1 className="text-lg font-black leading-none tracking-tight">MMPNS</h1>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 px-4">Management</p>
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              badge={item.badge}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto p-8 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#EDCD1F]/20 border border-[#EDCD1F]/30 flex items-center justify-center text-[#EDCD1F] font-bold">
            AD
          </div>
          <div>
            <p className="text-sm font-bold">Administrator</p>
            <p className="text-[10px] text-white/40">Super Admin</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-red-400 border border-red-400/20 hover:bg-red-400 hover:text-white transition-all"
        >
          Sign Out System
        </button>
      </div>
    </div>
  );
};

export const DashboardHeader: React.FC<{ title: string }> = ({ title }) => (
  <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-50">
    <div className="flex items-center gap-6">
      <h2 className="text-xl font-black text-gray-900 capitalize tracking-tight">{title}</h2>
      <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          placeholder="Global search..." 
          className="bg-gray-50 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#185C20]/10 w-64 transition-all"
        />
      </div>
    </div>
    
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <button className="p-2.5 text-gray-400 hover:text-[#185C20] hover:bg-[#185C20]/5 rounded-xl transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2.5 text-gray-400 hover:text-[#185C20] hover:bg-[#185C20]/5 rounded-xl transition-all">
          <ExternalLink size={20} />
        </button>
      </div>
      <div className="h-8 w-px bg-gray-100"></div>
      <div className="text-right">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feb 13, 2026</p>
        <p className="text-xs font-bold text-[#185C20]">School Portal</p>
      </div>
    </div>
  </header>
);
