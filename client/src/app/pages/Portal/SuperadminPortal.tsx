import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShieldCheck, Globe, Settings, Database,
  Users, Activity, Code2, Newspaper, GraduationCap,
  Terminal, Wrench, AlertTriangle,
} from 'lucide-react';
import { PortalLogin } from '../../components/portal/PortalLogin';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { AccountManagement } from '../../components/AccountManagement';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase, resetDatabase, type DatabaseTable } from '../../../utils/database';

// Reuse content manager components
import { FacultyManager } from '../Dashboard/FacultyManager';
import { AlumniManager } from '../Dashboard/AlumniManager';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',  label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'accounts',   label: 'Account Management', icon: ShieldCheck },
  { id: 'faculty',    label: 'Faculty & Staff',    icon: Users },
  { id: 'alumni',     label: 'Alumni',             icon: GraduationCap },
  { id: 'news',       label: 'News & Pages',       icon: Newspaper },
  { id: 'developer',  label: 'Developer Tools',    icon: Terminal },
  { id: 'database',   label: 'Database',           icon: Database },
  { id: 'settings',   label: 'System Settings',    icon: Settings },
];

// ─── Superadmin Overview ──────────────────────────────────────────────────────

const SuperadminOverview: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">Superadmin — Full System Access</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'All Accounts',    icon: Users,     color: 'bg-rose-50 text-rose-700' },
        { label: 'Active Sessions', icon: Activity,  color: 'bg-green-50 text-green-700' },
        { label: 'DB Tables',       icon: Database,  color: 'bg-blue-50 text-blue-700' },
        { label: 'System Health',   icon: Wrench,    color: 'bg-amber-50 text-amber-700' },
      ].map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        );
      })}
    </div>

    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-rose-600" />
        <p className="text-sm font-medium text-rose-800">Superadmin Access</p>
      </div>
      <p className="text-xs text-rose-700">
        You have full access to all system features including account creation for all roles, developer tools, and database management. Use with care.
      </p>
    </div>
  </div>
);

// ─── Developer Tools ──────────────────────────────────────────────────────────

const DeveloperTools: React.FC = () => {
  const [resetTable, setResetTable] = useState<DatabaseTable | ''>('');
  const [resetMsg, setResetMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const TABLES: DatabaseTable[] = [
    'faculty', 'alumni', 'pages', 'settings', 'school_years',
    'teacher_portal', 'calendar', 'teacher_records', 'master_subjects',
    'student_registrations', 'students', 'teachers', 'evaluation_rubrics', 'teacher_evaluations',
  ];

  const handleReset = async () => {
    if (!resetTable || isResetting) return;
    setIsResetting(true);
    const ok = await resetDatabase(resetTable);
    setResetMsg(ok ? `Table "${resetTable}" has been reset.` : 'Reset failed.');
    setIsResetting(false);
    setTimeout(() => setResetMsg(''), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">Developer Area</p>
        </div>
        <p className="text-xs text-amber-700">These tools affect live data. Use with extreme caution.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          Reset Database Table
        </h3>
        <div className="flex gap-3 flex-wrap">
          <select
            value={resetTable}
            onChange={(e) => setResetTable(e.target.value as DatabaseTable)}
            className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          >
            <option value="">Select table to reset...</option>
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={handleReset}
            disabled={!resetTable || isResetting}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isResetting ? 'Resetting...' : 'Reset Table'}
          </button>
        </div>
        {resetMsg && <p className="text-xs text-green-700 mt-2">{resetMsg}</p>}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PlaceholderSection: React.FC<{ title: string; icon: React.ComponentType<{ className?: string }> }> = ({ title, icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
    <p className="text-sm font-semibold text-gray-700">{title}</p>
    <p className="text-xs text-gray-400 mt-1">This section is available in the portal.</p>
  </div>
);

export const SuperadminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    void initializeDatabase();
    const session = getStoredSession();
    if (session?.role === 'superadmin') {
      setIsAuthenticated(true);
      setUser({
        role: 'superadmin',
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
        portalName="Superadmin Portal"
        portalDescription="Full system access — authorized personnel only"
        onSuccess={(result) => {
          if (result.user && result.role === 'superadmin') {
            setUser(result.user);
            setIsAuthenticated(true);
          }
        }}
        accentColor="#881337"
      />
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'accounts':  return <AccountManagement callerRole="superadmin" />;
      case 'faculty':   return <FacultyManager />;
      case 'alumni':    return <AlumniManager />;
      case 'news':      return <PlaceholderSection title="News & Pages" icon={Newspaper} />;
      case 'developer': return <DeveloperTools />;
      case 'database':  return <PlaceholderSection title="Database Management" icon={Database} />;
      case 'settings':  return <PlaceholderSection title="System Settings" icon={Settings} />;
      default:          return <SuperadminOverview user={user} />;
    }
  };

  return (
    <PortalLayout
      user={user}
      role="superadmin"
      menuItems={MENU_ITEMS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      portalName="Superadmin Portal"
    >
      {renderSection()}
    </PortalLayout>
  );
};
