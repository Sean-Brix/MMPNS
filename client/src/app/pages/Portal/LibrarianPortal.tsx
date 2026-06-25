import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, BookMarked, Search, BarChart3, ScanLine,
} from 'lucide-react';
import { PortalLayout, type SidebarItem } from '../../components/portal/PortalLayout';
import { BookManagement } from '../../components/librarian/BookManagement';
import { CirculationPage } from '../../components/librarian/CirculationPage';
import { BorrowHistoryPage } from '../../components/librarian/BorrowHistoryPage';
import { LibrarianDashboard } from '../../components/librarian/LibrarianDashboard';
import { StudentLookup } from '../../components/librarian/StudentLookup';
import { getStoredSession, logout, type UserProfile } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';
import { useNavigate } from 'react-router';

const MENU_ITEMS: SidebarItem[] = [
  { id: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'circulation',label: 'Circulation',    icon: ScanLine },
  { id: 'catalog',    label: 'Books Catalog',  icon: BookOpen },
  { id: 'borrowed',   label: 'Borrow History', icon: BookMarked },
  { id: 'lookup',     label: 'Student Lookup', icon: Search },
  { id: 'reports',    label: 'Reports',        icon: BarChart3 },
];

// ─── Placeholder section ──────────────────────────────────────────────────────

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
    const session = getStoredSession();
    if (session?.role === 'librarian') {
      void initializeDatabase(['books', 'library_circulation', 'students']);
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
        return <BorrowHistoryPage />;
      case 'lookup':
        return <StudentLookup />;
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
