import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users,
  ClipboardList, CalendarDays, GraduationCap,
  BookOpen, Settings2, UserCog, CalendarRange,
} from 'lucide-react';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { StudentRegistration } from '../../components/registrar/StudentRegistration';
import { RegistrarDashboard } from '../../components/registrar/RegistrarDashboard';
import { AccountSettings } from '../../components/registrar/AccountSettings';
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
  { id: 'teachers',    label: 'Teachers',           icon: Users },
  { id: 'students',    label: 'Students',           icon: GraduationCap },
  { id: 'subjects',    label: 'Subjects',           icon: BookOpen },
  { id: 'attendance',  label: 'Attendance Logs',    icon: CalendarDays },
  { id: 'evaluations', label: 'Evaluation',         icon: ClipboardList },
  { id: 'settings',    label: 'Settings',           icon: Settings2 },
];

const SETTINGS_TABS = [
  { id: 'account',  label: 'My Account',    icon: UserCog },
  { id: 'academic', label: 'Academic Year', icon: CalendarRange },
] as const;

const RegistrarSettings: React.FC = () => {
  const [tab, setTab] = useState<(typeof SETTINGS_TABS)[number]['id']>('account');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        {SETTINGS_TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active ? 'border-purple-700 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} /> {item.label}
            </button>
          );
        })}
      </div>
      {tab === 'account' ? <AccountSettings /> : <PrincipalYearSetup />}
    </div>
  );
};

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
      case 'attendance':    return <SecurityCenter section="attendance" />;
      case 'teachers':      return <PrincipalTeachers />;
      case 'students':      return <StudentRegistration />;
      case 'subjects':      return <PrincipalSubjects />;
      case 'evaluations':   return <PrincipalEvaluation />;
      case 'settings':      return <RegistrarSettings />;
      default: return <RegistrarDashboard user={user} onNavigate={setActiveSection} />;
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
