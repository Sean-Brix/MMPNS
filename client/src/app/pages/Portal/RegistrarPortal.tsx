import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, UserPlus, Users, ShieldCheck,
  FileText, BarChart3, ClipboardList, CalendarDays,
} from 'lucide-react';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { AccountManagement } from '../../components/AccountManagement';
import { StudentRegistration } from '../../components/registrar/StudentRegistration';
import { SecurityCenter } from '../../components/security/SecurityCenter';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';
import { useNavigate } from 'react-router';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',    label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'registrations',label: 'Student Registrations', icon: ClipboardList },
  { id: 'accounts',     label: 'Account Management',  icon: ShieldCheck },
  { id: 'attendance',   label: 'Attendance Log',      icon: CalendarDays },
  { id: 'records',      label: 'Records',             icon: FileText },
];

const RegistrarDashboard: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">Registrar's Office</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Total Students',     value: '—', icon: Users },
        { label: 'New Registrations',  value: '—', icon: UserPlus },
        { label: 'Pending Approvals',  value: '—', icon: ClipboardList },
        { label: 'Total Accounts',     value: '—', icon: ShieldCheck },
      ].map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-purple-50 text-purple-700">
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
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Use the sidebar to manage registrations and accounts.</p>
        </div>
      </div>
    </div>
  </div>
);

export const RegistrarPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getStoredSession();
    if (session?.role === 'registrar') {
      void initializeDatabase(['student_registrations', 'students']);
      setIsAuthenticated(true);
      setUser({
        role: 'registrar',
        username: session.username,
        displayName: session.displayName,
        initials: session.initials || '',
        status: 'active',
        lastLogin: null,
      });
    } else {
      void navigate('/admin-portal', { replace: true });
    }
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUser(null);
    void navigate('/admin-portal', { replace: true });
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'registrations': return <StudentRegistration />;
      case 'accounts':      return <AccountManagement callerRole="registrar" />;
      case 'attendance':    return <SecurityCenter section="attendance" />;
      case 'records':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Records</p>
            <p className="text-xs text-gray-400 mt-1">Academic records management coming soon.</p>
          </div>
        );
      default: return <RegistrarDashboard user={user} />;
    }
  };

  return (
    <PortalLayout
      user={user}
      role="registrar"
      menuItems={MENU_ITEMS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      portalName="Registrar Portal"
    >
      {renderSection()}
    </PortalLayout>
  );
};
