import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck,
  ClipboardList, CalendarDays, GraduationCap,
  BookOpen, Settings2, Star,
} from 'lucide-react';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { AccountManagement } from '../../components/AccountManagement';
import { StudentRegistration } from '../../components/registrar/StudentRegistration';
import { SecurityCenter } from '../../components/security/SecurityCenter';
import { PrincipalSubjects } from '../../components/principal/PrincipalSubjects';
import { PrincipalEvaluation } from '../../components/principal/PrincipalEvaluation';
import { PrincipalTeachers } from '../../components/principal/PrincipalTeachers';
import { PrincipalYearSetup } from '../../components/principal/PrincipalYearSetup';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';
import { useNavigate } from 'react-router';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'accounts',    label: 'Account Management', icon: ShieldCheck },
  { id: 'teachers',    label: 'Teachers',           icon: Users },
  { id: 'students',    label: 'Students',           icon: GraduationCap },
  { id: 'subjects',    label: 'Subjects',           icon: BookOpen },
  { id: 'attendance',  label: 'Attendance Logs',    icon: CalendarDays },
  { id: 'evaluations', label: 'Evaluation',         icon: ClipboardList },
  { id: 'settings',    label: 'Settings',           icon: Settings2 },
];

const MultiRoleDashboard: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">Multi-Role Operations</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Total Students',  value: '...', icon: Users },
        { label: 'Attendance Logs', value: '...', icon: CalendarDays },
        { label: 'Evaluations',     value: '...', icon: ClipboardList },
        { label: 'Total Accounts',  value: '...', icon: ShieldCheck },
      ].map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-[#185C20]/10 text-[#185C20]">
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
          <p className="text-xs text-gray-500">Use the sidebar to manage accounts, students, attendance, evaluations, and academic setup.</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Principal Tools</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Teachers', icon: Users, color: 'bg-green-50 text-green-700' },
            { label: 'Students', icon: GraduationCap, color: 'bg-blue-50 text-blue-700' },
            { label: 'Subjects', icon: BookOpen, color: 'bg-amber-50 text-amber-700' },
            { label: 'Evaluation', icon: Star, color: 'bg-[#185C20]/10 text-[#185C20]' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-gray-100 p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-gray-700">{item.label}</p>
              </div>
            );
          })}
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
      void initializeDatabase([
        'student_registrations',
        'students',
        'teachers',
        'teacher_records',
        'master_subjects',
        'teacher_portal',
        'evaluation_rubrics',
        'teacher_evaluations',
        'school_years',
        'settings',
      ]);
      setIsAuthenticated(true);
      setUser({
        role: session.role,
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
      case 'accounts':      return <AccountManagement callerRole="registrar" />;
      case 'attendance':    return <SecurityCenter section="attendance" />;
      case 'teachers':      return <PrincipalTeachers />;
      case 'students':      return <StudentRegistration />;
      case 'subjects':      return <PrincipalSubjects />;
      case 'evaluations':   return <PrincipalEvaluation />;
      case 'settings':      return <PrincipalYearSetup />;
      default: return <MultiRoleDashboard user={user} />;
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
      portalName="Multi-Role Portal"
    >
      {renderSection()}
    </PortalLayout>
  );
};
