import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShieldCheck, Globe, Settings,
  Users, Activity, FileText, Newspaper,
  Image, GraduationCap,
} from 'lucide-react';
import { PortalLogin } from '../../components/portal/PortalLogin';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { AccountManagement } from '../../components/AccountManagement';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';

// Content Manager sub-pages (from old /admin Dashboard)
import { FacultyManager } from '../Dashboard/FacultyManager';
import { AlumniManager } from '../Dashboard/AlumniManager';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'accounts',   label: 'Account Management', icon: ShieldCheck },
  { id: 'faculty',    label: 'Faculty & Staff',   icon: Users },
  { id: 'alumni',     label: 'Alumni',            icon: GraduationCap },
  { id: 'news',       label: 'News & Pages',      icon: Newspaper },
  { id: 'settings',   label: 'School Settings',   icon: Settings },
];

const AdminDashboardOverview: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">System Administration</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: 'Total Accounts', value: '—', icon: Users,    color: 'bg-slate-100 text-slate-700' },
        { label: 'Active Users',   value: '—', icon: Activity, color: 'bg-green-50 text-green-700' },
        { label: 'Recent Logins',  value: '—', icon: ShieldCheck, color: 'bg-blue-50 text-blue-700' },
      ].map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        );
      })}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Navigation</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <p>• Use <strong>Account Management</strong> to create, activate, or deactivate accounts.</p>
          <p>• Use <strong>Faculty & Staff</strong> to manage the public faculty directory.</p>
          <p>• Use <strong>School Settings</strong> to configure system-wide preferences.</p>
        </div>
      </div>
    </div>
  </div>
);

const PlaceholderSection: React.FC<{ title: string; icon: React.ComponentType<{ className?: string }> }> = ({ title, icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
    <p className="text-sm font-semibold text-gray-700">{title}</p>
    <p className="text-xs text-gray-400 mt-1">This section is available in the portal.</p>
  </div>
);

export const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    void initializeDatabase();
    const session = getStoredSession();
    if (session?.role === 'admin') {
      setIsAuthenticated(true);
      setUser({
        role: 'admin',
        username: session.username,
        displayName: session.displayName,
        initials: session.initials || '',
        status: 'active',
        lastLogin: null,
      });
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated || !user) {
    return (
      <PortalLogin
        portalName="Admin Portal"
        portalDescription="System administration and content management"
        onSuccess={(result) => {
          if (result.user && result.role === 'admin') {
            setUser(result.user);
            setIsAuthenticated(true);
          }
        }}
        accentColor="#1e293b"
      />
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'accounts': return <AccountManagement callerRole="admin" />;
      case 'faculty':  return <FacultyManager />;
      case 'alumni':   return <AlumniManager />;
      case 'news':     return <PlaceholderSection title="News & Pages" icon={Newspaper} />;
      case 'settings': return <PlaceholderSection title="School Settings" icon={Settings} />;
      default:         return <AdminDashboardOverview user={user} />;
    }
  };

  return (
    <PortalLayout
      user={user}
      role="admin"
      menuItems={MENU_ITEMS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      portalName="Admin Portal"
    >
      {renderSection()}
    </PortalLayout>
  );
};
