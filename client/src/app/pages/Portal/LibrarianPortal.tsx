import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Library, BookOpen, BookMarked,
  Clock, Search, BarChart3, AlertCircle, CheckCircle2,
  BookCopy, Users, TrendingUp, ScanLine,
} from 'lucide-react';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { BookManagement } from '../../components/librarian/BookManagement';
import { CirculationPage } from '../../components/librarian/CirculationPage';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';
import { useNavigate } from 'react-router';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'circulation',label: 'Circulation',    icon: ScanLine },
  { id: 'catalog',    label: 'Books Catalog',  icon: BookOpen },
  { id: 'borrowed',   label: 'Borrowed Books', icon: BookMarked },
  { id: 'due',        label: 'Due Returns',    icon: Clock },
  { id: 'lookup',     label: 'Student Lookup', icon: Search },
  { id: 'reports',    label: 'Reports',        icon: BarChart3 },
];

// ─── Dashboard Overview ───────────────────────────────────────────────────────

const LibrarianDashboard: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
      <p className="text-sm text-gray-500 mt-0.5">Library Management Dashboard</p>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Total Books',       value: '0', icon: BookCopy,  color: 'bg-amber-50 text-amber-700' },
        { label: 'Currently Borrowed',value: '0', icon: BookMarked,color: 'bg-blue-50 text-blue-700' },
        { label: 'Overdue Books',     value: '0', icon: AlertCircle,color: 'bg-red-50 text-red-600' },
        { label: "Today's Returns",   value: '0', icon: CheckCircle2,color: 'bg-green-50 text-green-700' },
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

    {/* Recent Activity placeholder */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          Recent Borrowing Activity
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="w-10 h-10 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">No borrowing activity yet.</p>
          <p className="text-xs text-gray-300 mt-1">Add books to the catalog to get started.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-500" />
          Upcoming Due Returns
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-10 h-10 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">No upcoming due returns.</p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Books Catalog placeholder ────────────────────────────────────────────────

const EmptySection: React.FC<{ title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = ({ title, description, icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
    <Icon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
    <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
    <p className="text-xs text-gray-400">{description}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const LibrarianPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    void initializeDatabase();
    const session = getStoredSession();
    if (session?.role === 'librarian') {
      setIsAuthenticated(true);
      setUser({
        role: 'librarian',
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
      case 'circulation':
        return <CirculationPage user={user} />;
      case 'catalog':
        return <BookManagement />;
      case 'borrowed':
        return <EmptySection title="Borrowed Books" description="No books are currently borrowed." icon={BookMarked} />;
      case 'due':
        return <EmptySection title="Due Returns" description="No books are due for return." icon={Clock} />;
      case 'lookup':
        return <EmptySection title="Student Lookup" description="Search for a student to view their borrowing history." icon={Users} />;
      case 'reports':
        return <EmptySection title="Reports" description="Circulation reports will appear here once borrowing activity begins." icon={BarChart3} />;
      default:
        return <LibrarianDashboard user={user} />;
    }
  };

  return (
    <PortalLayout
      user={user}
      role="librarian"
      menuItems={MENU_ITEMS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      portalName="Library Portal"
    >
      {renderSection()}
    </PortalLayout>
  );
};
