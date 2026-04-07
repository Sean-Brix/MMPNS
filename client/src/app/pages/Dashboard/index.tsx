import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Briefcase,
  GraduationCap,
  CalendarDays,
  Home,
  LogOut,
  CheckCircle,
  AlertCircle,
  X,
  Menu
} from 'lucide-react';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { initializeDatabase } from '../../../utils/database';
import { clearAdminSession, clearTeacherSession } from '../../../utils/auth';
import { FacultyManager } from './FacultyManager';
import { AlumniManager } from './AlumniManager';
import { PagesManager } from './PagesManager';

type Tab = 'faculty' | 'alumni' | 'featured';

interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const Dashboard: React.FC = () => {
  const goTo = useAppNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('faculty');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await initializeDatabase();
      setIsLoading(false);
      showNotification('success', 'Dashboard loaded successfully');
    };
    init();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const handleSignOut = () => {
    clearTeacherSession();
    clearAdminSession();
    goTo('teacher-portal');
  };

  const menuItems = [
    { id: 'faculty' as Tab, label: 'Faculty & Staff', icon: Briefcase },
    { id: 'alumni' as Tab, label: 'Alumni', icon: GraduationCap },
    { id: 'featured' as Tab, label: 'Featured Events', icon: CalendarDays },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#EDCD1F] border-t-transparent animate-spin" />
          <p className="text-sm text-[#185C20]/50 font-bold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] selection:bg-[#EDCD1F] selection:text-[#185C20] flex">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-[calc(100vw-2rem)]">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm border ${
                notification.type === 'success'
                  ? 'bg-green-50/95 border-green-200 text-green-800'
                  : notification.type === 'error'
                  ? 'bg-red-50/95 border-red-200 text-red-800'
                  : 'bg-blue-50/95 border-blue-200 text-blue-800'
              }`}
            >
              {notification.type === 'success' && <CheckCircle size={18} className="flex-shrink-0" />}
              {notification.type === 'error' && <AlertCircle size={18} className="flex-shrink-0" />}
              {notification.type === 'info' && <AlertCircle size={18} className="flex-shrink-0" />}
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          x: sidebarOpen ? 0 : -280,
          width: 280
        }}
        className="bg-[#185C20] text-white flex-shrink-0 overflow-hidden fixed lg:sticky top-0 h-screen z-40 lg:z-auto"
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDCD1F] flex items-center justify-center flex-shrink-0">
                <Database size={24} className="text-[#185C20]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-serif font-bold text-sm whitespace-nowrap">MMPNS</h1>
                <p className="text-xs text-white/60 whitespace-nowrap">Content Manager</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#EDCD1F] text-[#185C20] shadow-lg'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-white/10 space-y-1">
            <button
              onClick={() => goTo('home')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <Home size={20} className="flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Back to Site</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Sign Out</span>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all cursor-pointer lg:hidden"
            >
              <X size={20} className="flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Close Menu</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-[#185C20]/10 px-4 md:px-8 py-4 md:py-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#185C20] hover:bg-[#185C20]/5 rounded-lg transition-colors flex-shrink-0"
              >
                <Menu size={24} />
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-lg md:text-2xl text-[#185C20] truncate">
                  {menuItems.find(m => m.id === activeTab)?.label}
                </h2>
                <p className="text-xs md:text-sm text-[#185C20]/50 mt-1 hidden sm:block">
                  Manage your {activeTab} data and content
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-[#185C20]/40 uppercase tracking-wider hidden md:block">
                Admin Dashboard
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'faculty' && (
              <motion.div
                key="faculty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <FacultyManager showNotification={showNotification} />
              </motion.div>
            )}
            {activeTab === 'alumni' && (
              <motion.div
                key="alumni"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AlumniManager showNotification={showNotification} />
              </motion.div>
            )}
            {activeTab === 'featured' && (
              <motion.div
                key="featured"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PagesManager showNotification={showNotification} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;