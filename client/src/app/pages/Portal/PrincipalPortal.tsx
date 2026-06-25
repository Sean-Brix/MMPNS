import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  Calendar, ClipboardList, Settings2, Star,
} from 'lucide-react';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { PrincipalSubjects } from '../../components/principal/PrincipalSubjects';
import { PrincipalEvaluation } from '../../components/principal/PrincipalEvaluation';
import { PrincipalCalendar } from '../../components/principal/PrincipalCalendar';
import { PrincipalRegistration } from '../../components/principal/PrincipalRegistration';
import { PrincipalTeachers } from '../../components/principal/PrincipalTeachers';
import { PrincipalYearSetup } from '../../components/principal/PrincipalYearSetup';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';
import { useNavigate } from 'react-router';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'teachers',    label: 'Teachers',            icon: Users },
  { id: 'students',    label: 'Students',            icon: GraduationCap },
  { id: 'subjects',    label: 'Subjects & Sections', icon: BookOpen },
  { id: 'calendar',    label: 'Calendar',            icon: Calendar },
  { id: 'evaluations', label: 'Evaluations',         icon: ClipboardList },
  { id: 'year-setup',  label: 'School Year',         icon: Settings2 },
];

const PrincipalDashboardOverview: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        Welcome, {user.displayName}
      </h2>
      <p className="text-sm text-gray-500 mt-0.5">Principal's Overview</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Total Teachers', value: '—', icon: Users, color: 'bg-green-50 text-green-700' },
        { label: 'Total Students', value: '—', icon: GraduationCap, color: 'bg-blue-50 text-blue-700' },
        { label: 'Active Subjects', value: '—', icon: BookOpen, color: 'bg-amber-50 text-amber-700' },
        { label: 'Pending Evaluations', value: '—', icon: Star, color: 'bg-purple-50 text-purple-700' },
      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        );
      })}
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p className="text-sm font-medium text-amber-800">Getting Started</p>
      <p className="text-xs text-amber-700 mt-1">
        Set up the school year, assign subjects to teachers, and configure sections to get started.
      </p>
    </div>
  </div>
);

export const PrincipalPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getStoredSession();
    if (session?.role === 'principal') {
      void initializeDatabase([
        'students',
        'teachers',
        'teacher_records',
        'master_subjects',
        'teacher_portal',
        'calendar',
        'evaluation_rubrics',
        'teacher_evaluations',
        'school_years',
      ]);
      setIsAuthenticated(true);
      setUser({
        role: 'principal',
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
      case 'teachers':    return <PrincipalTeachers />;
      case 'students':    return <PrincipalRegistration />;
      case 'subjects':    return <PrincipalSubjects />;
      case 'calendar':    return <PrincipalCalendar />;
      case 'evaluations': return <PrincipalEvaluation />;
      case 'year-setup':  return <PrincipalYearSetup />;
      default:            return <PrincipalDashboardOverview user={user} />;
    }
  };

  return (
    <PortalLayout
      user={user}
      role="principal"
      menuItems={MENU_ITEMS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      portalName="Principal Portal"
    >
      {renderSection()}
    </PortalLayout>
  );
};
