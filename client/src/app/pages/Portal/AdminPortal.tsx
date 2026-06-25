import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, CalendarDays, LayoutDashboard, ScanLine, ShieldCheck, Settings,
  Users, Activity, Newspaper, GraduationCap,
  Terminal, Database, AlertTriangle, Wrench,
  CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { PortalLogin } from '../../components/portal/PortalLogin';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { AccountManagement } from '../../components/AccountManagement';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { useNavigate } from 'react-router';
import { initializeDatabase, resetDatabase, type DatabaseTable } from '../../../utils/database';
import { FacultyManager } from '../Dashboard/FacultyManager';
import { AlumniManager } from '../Dashboard/AlumniManager';
import { SecurityCenter } from '../../components/security/SecurityCenter';
import {
  ADMINISTRATION_ROLES,
  ROLE_PORTAL_ROUTES,
  isAdministrationRole,
} from '../../../utils/roles';

interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ─── Menu items ───────────────────────────────────────────────────────────────

const ADMIN_MENU: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'accounts',  label: 'Account Management', icon: ShieldCheck },
  { id: 'faculty',   label: 'Faculty & Staff',    icon: Users },
  { id: 'alumni',    label: 'Alumni',             icon: GraduationCap },
  { id: 'news',      label: 'News & Pages',       icon: Newspaper },
  { id: 'security',  label: 'Security & Attendance', icon: ShieldCheck },
  { id: 'settings',  label: 'School Settings',    icon: Settings },
];

const SUPERADMIN_MENU: SidebarItem[] = [
  { id: 'dashboard',  label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'accounts',   label: 'Account Management', icon: ShieldCheck },
  { id: 'faculty',    label: 'Faculty & Staff',    icon: Users },
  { id: 'alumni',     label: 'Alumni',             icon: GraduationCap },
  { id: 'news',       label: 'News & Pages',       icon: Newspaper },
  { id: 'security',   label: 'Security & Attendance', icon: ShieldCheck },
  { id: 'developer',  label: 'Developer Tools',    icon: Terminal },
  { id: 'database',   label: 'Database',           icon: Database },
  { id: 'settings',   label: 'System Settings',    icon: Settings },
];

const SECURITY_MENU: SidebarItem[] = [
  { id: 'security-analytics',  label: 'Analytics',           icon: BarChart3 },
  { id: 'security-overview',   label: 'Overview',            icon: ShieldCheck },
  { id: 'security-kiosk',      label: 'ID Scanning Kiosk',   icon: ScanLine },
  { id: 'security-attendance', label: 'Attendance Log',      icon: CalendarDays },
  { id: 'security-settings',   label: 'Settings',            icon: Settings },
];

// ─── Dashboards ───────────────────────────────────────────────────────────────

const AdminOverview: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">System Administration</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: 'Total Accounts', icon: Users,      color: 'bg-slate-100 text-slate-700' },
        { label: 'Active Users',   icon: Activity,   color: 'bg-green-50 text-green-700' },
        { label: 'Recent Logins',  icon: ShieldCheck, color: 'bg-blue-50 text-blue-700' },
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
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Navigation</h3>
      <div className="space-y-2 text-xs text-gray-500">
        <p>• Use <strong>Account Management</strong> to create, activate, or deactivate accounts.</p>
        <p>• Use <strong>Faculty &amp; Staff</strong> to manage the public faculty directory.</p>
        <p>• Use <strong>School Settings</strong> to configure system-wide preferences.</p>
      </div>
    </div>
  </div>
);

const SuperadminOverview: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">Developer / Superadmin — Full System Access</p>
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
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-rose-600" />
        <p className="text-sm font-medium text-rose-800">Developer Access</p>
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

// ─── Placeholder ──────────────────────────────────────────────────────────────

const PlaceholderSection: React.FC<{ title: string; icon: React.ComponentType<{ className?: string }> }> = ({ title, icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
    <p className="text-sm font-semibold text-gray-700">{title}</p>
    <p className="text-xs text-gray-400 mt-1">This section is coming soon.</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      return;
    }

    if (!isAdministrationRole(session.role)) {
      void navigate(ROLE_PORTAL_ROUTES[session.role], { replace: true });
      return;
    }

    const roleRoute = ROLE_PORTAL_ROUTES[session.role];
    if (roleRoute !== '/admin-portal') {
      void navigate(roleRoute, { replace: true });
      return;
    }

    if (session) {
      void initializeDatabase(session.role === 'security' ? [] : undefined);
      setIsAuthenticated(true);
      setActiveSection(session.role === 'security' ? 'security-analytics' : 'dashboard');
      setUser({
        role: session.role,
        username: session.username,
        displayName: session.displayName,
        initials: session.initials || '',
        status: 'active',
        lastLogin: null,
      });
    }
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated || !user) {
    return (
      <PortalLogin
        portalName="Administration Portal"
        portalDescription="Administration, management & developer access"
        allowedRoles={ADMINISTRATION_ROLES}
        onSuccess={(result) => {
          if (!result.user || !result.role) return;
          const destination = ROLE_PORTAL_ROUTES[result.role];
          if (destination !== '/admin-portal') {
            void navigate(destination, { replace: true });
          } else {
            void initializeDatabase(result.role === 'security' ? [] : undefined);
            setUser(result.user);
            setIsAuthenticated(true);
            setActiveSection(result.role === 'security' ? 'security-analytics' : 'dashboard');
          }
        }}
        accentColor="#1e293b"
      />
    );
  }

  const isSuperadmin = user.role === 'superadmin';
  const isSecurity = user.role === 'security';
  const menuItems = isSecurity ? SECURITY_MENU : isSuperadmin ? SUPERADMIN_MENU : ADMIN_MENU;
  const callerRole = isSuperadmin ? 'superadmin' : 'admin';

  const renderSection = () => {
    switch (activeSection) {
      case 'accounts':  return isSecurity ? null : <AccountManagement callerRole={callerRole} />;
      case 'faculty':   return <FacultyManager showNotification={showNotification} />;
      case 'alumni':    return <AlumniManager showNotification={showNotification} />;
      case 'news':      return <PlaceholderSection title="News & Pages" icon={Newspaper} />;
      case 'security':  return <SecurityCenter section="analytics" />;
      case 'security-analytics':  return <SecurityCenter section="analytics" />;
      case 'security-overview':   return <SecurityCenter section="overview" />;
      case 'security-kiosk':      return <SecurityCenter section="kiosk" />;
      case 'security-attendance': return <SecurityCenter section="attendance" />;
      case 'security-settings':   return <SecurityCenter section="settings" />;
      case 'settings':  return <PlaceholderSection title="School Settings" icon={Settings} />;
      // superadmin-only
      case 'developer': return isSuperadmin ? <DeveloperTools /> : <PlaceholderSection title="Developer Tools" icon={Terminal} />;
      case 'database':  return isSuperadmin ? <PlaceholderSection title="Database Management" icon={Database} /> : null;
      default:
        if (isSecurity) return <SecurityCenter section="analytics" />;
        return isSuperadmin ? <SuperadminOverview user={user} /> : <AdminOverview user={user} />;
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-[calc(100vw-2rem)]">
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
      <PortalLayout
        user={user}
        role={user.role}
        menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        portalName={isSecurity ? 'Security Administration' : 'Administration Portal'}
      >
        {renderSection()}
      </PortalLayout>
    </>
  );
};
