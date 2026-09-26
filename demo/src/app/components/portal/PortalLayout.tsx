import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Menu, X, ChevronRight } from 'lucide-react';
import type { UserProfile, UserRole } from '../../../utils/auth';
import { ROLE_LABELS } from '../../../utils/roles';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PortalLayoutProps {
  user: UserProfile;
  role: UserRole;
  menuItems: SidebarItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  portalName: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  teacher:    { bg: 'bg-[#185C20]',  text: 'text-white',  badge: 'bg-emerald-600' },
  principal:  { bg: 'bg-[#185C20]',  text: 'text-white',  badge: 'bg-green-700' },
  student:    { bg: 'bg-blue-800',   text: 'text-white',  badge: 'bg-blue-600' },
  librarian:  { bg: 'bg-amber-800',  text: 'text-white',  badge: 'bg-amber-600' },
  registrar:  { bg: 'bg-purple-800', text: 'text-white',  badge: 'bg-purple-600' },
  security:   { bg: 'bg-cyan-950',   text: 'text-white',  badge: 'bg-cyan-700' },
  admin:      { bg: 'bg-slate-800',  text: 'text-white',  badge: 'bg-slate-600' },
  superadmin: { bg: 'bg-rose-900',   text: 'text-white',  badge: 'bg-rose-700' },
};

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  user,
  role,
  menuItems,
  activeSection,
  onSectionChange,
  onLogout,
  children,
  portalName,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const colors = ROLE_COLORS[role] || ROLE_COLORS.admin;
  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`w-64 flex-shrink-0 flex flex-col h-full shadow-xl z-20 ${colors.bg} ${colors.text}`}
          >
            {/* Logo / Portal Name */}
            <div className="px-5 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EDCD1F] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#185C20] font-black text-sm">M</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">MMPNS</p>
                  <p className="text-xs opacity-70 truncate">{portalName}</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-auto p-1 rounded opacity-60 hover:opacity-100 transition-opacity lg:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                      isActive
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                  </button>
                );
              })}
            </nav>

            {/* User Info + Logout */}
            <div className="px-3 py-4 border-t border-white/10">
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className={`w-8 h-8 rounded-full ${colors.badge} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{user.initials || '??'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-xs opacity-60 truncate">{roleLabel}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all duration-150"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center px-4 bg-white border-b border-gray-200 gap-3 flex-shrink-0 shadow-sm">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
              {roleLabel}
            </span>
            <h1 className="text-sm font-semibold text-gray-800 truncate">
              {menuItems.find((m) => m.id === activeSection)?.label || portalName}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">{user.displayName}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
