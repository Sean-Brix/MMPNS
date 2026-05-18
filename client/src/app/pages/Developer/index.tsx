import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Database,
  Home,
  Lock,
  LogOut,
  Menu,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  User,
  X,
} from 'lucide-react';

import credentialsSeed from '../../../data/seeds/credentials.json';
import facultySeed from '../../../data/seeds/faculty.json';
import alumniSeed from '../../../data/seeds/alumni.json';
import pagesSeed from '../../../data/seeds/pages.json';
import schoolYearsSeed from '../../../data/seeds/school_years.json';
import {
  authenticateAdminOnline,
  clearAdminSession,
  getAdminSession,
  saveAdminSession,
  type AdminCredential,
  type StudentCredential,
  type TeacherCredential,
} from '../../../utils/auth';
import { initializeDatabase, readDatabase, writeDatabase } from '../../../utils/database';
import { HOME_IMAGE_EDIT_MODE_KEY, HOME_IMAGE_STORAGE_KEY } from '../../../utils/homeImageSlots';
import { useAppNavigate } from '../../hooks/useAppNavigate';

type DeveloperTab = 'seeding' | 'settings';
type BannerType = 'success' | 'error' | 'info';

type SeedKey = 'users' | 'alumni' | 'events' | 'faculty' | 'schoolYears';
type SeedAction = 'add-sample' | 'delete-all';

interface AdminSession {
  id: number;
  displayName: string;
  initials: string;
  role: string;
  email: string;
  authenticated: boolean;
  loginTime: string;
}

interface CredentialsDb {
  teachers: TeacherCredential[];
  students: StudentCredential[];
  admins: AdminCredential[];
  lastUpdated?: string;
}

interface SeedItem {
  key: SeedKey;
  title: string;
  description: string;
  addLabel: string;
  deleteLabel: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  intent: 'danger' | 'primary';
  action?: () => void;
}

const ALLOWED_ROLES = new Set(['admin', 'superadmin']);

const FACEBOOK_TOKEN_STORAGE_KEY = 'mmpns_fb_page_access_token';

const getStatusStyles = (type: BannerType) => {
  if (type === 'success') {
    return 'bg-green-50 text-green-700 border-green-200';
  }
  if (type === 'error') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const uniqueBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const seen = new Set<string>();
  const next: T[] = [];

  items.forEach((item) => {
    const key = getKey(item).toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    next.push(item);
  });

  return next;
};

const seedItems: SeedItem[] = [
  {
    key: 'users',
    title: 'Users',
    description: 'Teachers and students in portal credentials. Admin accounts are always preserved on delete.',
    addLabel: 'Add sample users',
    deleteLabel: 'Delete all users',
  },
  {
    key: 'alumni',
    title: 'Alumni',
    description: 'Public alumni stories and dashboard alumni records.',
    addLabel: 'Add sample alumni',
    deleteLabel: 'Delete all alumni',
  },
  {
    key: 'events',
    title: 'Events',
    description: 'Featured Home event slides (announcement and bulletin entries).',
    addLabel: 'Add sample events',
    deleteLabel: 'Delete all events',
  },
  {
    key: 'faculty',
    title: 'Faculties & Departments',
    description: 'Faculty/staff list and department categories derived from these records.',
    addLabel: 'Add sample faculty',
    deleteLabel: 'Delete all faculty',
  },
  {
    key: 'schoolYears',
    title: 'School Years',
    description: 'Academic year records used by grading and setup workflows.',
    addLabel: 'Add sample school years',
    deleteLabel: 'Delete all school years',
  },
];

const ModalConfirm: React.FC<{
  state: ConfirmState;
  onClose: () => void;
}> = ({ state, onClose }) => {
  if (!state.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#185C20]/10">
          <div>
            <h3 className="text-lg font-bold text-[#185C20]">{state.title}</h3>
            <p className="text-xs text-[#185C20]/60 mt-1">{state.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#185C20]/5 text-[#185C20]/50 hover:text-[#185C20] transition-colors flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#185C20]/15 text-[#185C20] hover:bg-[#185C20]/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              state.action?.();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
              state.intent === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#185C20] hover:bg-[#144a1a]'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Developer: React.FC = () => {
  const goTo = useAppNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<DeveloperTab>('seeding');
  const [session, setSession] = useState<AdminSession | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [bannerType, setBannerType] = useState<BannerType>('info');
  const [bannerMessage, setBannerMessage] = useState('');

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    intent: 'primary',
  });

  const [settingsUsername, setSettingsUsername] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsPasswordConfirm, setSettingsPasswordConfirm] = useState('');

  const [facebookAccessToken, setFacebookAccessToken] = useState('');
  const [facebookTokenSaved, setFacebookTokenSaved] = useState(false);

  const [usersCount, setUsersCount] = useState(0);
  const [alumniCount, setAlumniCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [departmentsCount, setDepartmentsCount] = useState(0);
  const [schoolYearsCount, setSchoolYearsCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const storedToken = (localStorage.getItem(FACEBOOK_TOKEN_STORAGE_KEY) || '').trim();
      setFacebookTokenSaved(Boolean(storedToken));
    } catch {
      setFacebookTokenSaved(false);
    }
  }, [isAuthenticated]);

  const showBanner = (type: BannerType, message: string) => {
    setBannerType(type);
    setBannerMessage(message);
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  const openConfirm = (state: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...state, open: true });
  };

  const getCredentialsDb = () => {
    return readDatabase<CredentialsDb>('credentials') || {
      teachers: [],
      students: [],
      admins: [],
    };
  };

  const refreshCounts = () => {
    const credentials = getCredentialsDb();
    const faculty = readDatabase<{ staff?: any[] }>('faculty') || { staff: [] };
    const alumni = readDatabase<{ alumni?: any[] }>('alumni') || { alumni: [] };
    const pages = readDatabase<any>('pages') || {};
    const schoolYears = readDatabase<any>('school_years') || {};

    const staffItems = Array.isArray(faculty.staff) ? faculty.staff : [];
    const uniqueDepartments = new Set(
      staffItems
        .map((member) => (typeof member?.department === 'string' ? member.department.trim() : ''))
        .filter(Boolean),
    );

    const eventSlides = Array.isArray(pages?.home?.heroSlides)
      ? pages.home.heroSlides.filter((slide: any) => slide?.type === 'announcement' || slide?.type === 'bulletin')
      : [];

    const years = Array.isArray(schoolYears?.school_years) ? schoolYears.school_years : [];

    setUsersCount((credentials.teachers?.length || 0) + (credentials.students?.length || 0) + (credentials.admins?.length || 0));
    setAlumniCount(Array.isArray(alumni.alumni) ? alumni.alumni.length : 0);
    setEventsCount(eventSlides.length);
    setFacultyCount(staffItems.length);
    setDepartmentsCount(uniqueDepartments.size);
    setSchoolYearsCount(years.length);
  };

  useEffect(() => {
    const bootstrap = async () => {
      await initializeDatabase();

      const existingSession = getAdminSession() as AdminSession | null;
      if (existingSession && ALLOWED_ROLES.has(existingSession.role)) {
        setSession(existingSession);
        setSettingsUsername(existingSession.displayName ? '' : '');
        setIsAuthenticated(true);
      } else if (existingSession) {
        clearAdminSession();
        showBanner('error', 'Developer access is restricted to admin and superadmin roles.');
      }

      if (existingSession) {
        const credentials = getCredentialsDb();
        const currentAdmin = credentials.admins.find((admin) => admin.id === existingSession.id);
        if (currentAdmin) {
          setSettingsUsername(currentAdmin.username);
        }
      }

      refreshCounts();
      setIsLoading(false);
    };

    bootstrap();
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = await authenticateAdminOnline(username, password);
    if (!result.success || !result.admin) {
      showBanner('error', result.error || 'Invalid credentials.');
      return;
    }

    if (!ALLOWED_ROLES.has(result.admin.role)) {
      showBanner('error', 'Only admin and superadmin accounts can use developer tools.');
      return;
    }

    saveAdminSession(result.admin);
    const nextSession = getAdminSession() as AdminSession | null;

    setSession(nextSession);
    setSettingsUsername(result.admin.username);
    setIsAuthenticated(true);
    setUsername('');
    setPassword('');
    showBanner('success', `Welcome ${result.admin.displayName}.`);
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setSession(null);
    showBanner('info', 'Signed out from developer tools.');
    goTo('teacher-portal');
  };

  const applySeedAction = async (key: SeedKey, action: SeedAction) => {
    if (key === 'users') {
      const current = getCredentialsDb();

      if (action === 'add-sample') {
        const nextAdmins = uniqueBy(
          [...(current.admins || []), ...(credentialsSeed.admins as AdminCredential[])],
          (admin) => admin.username,
        );
        const nextTeachers = uniqueBy(
          [...(current.teachers || []), ...(credentialsSeed.teachers as TeacherCredential[])],
          (teacher) => teacher.username,
        );
        const nextStudents = uniqueBy(
          [...(current.students || []), ...(credentialsSeed.students as StudentCredential[])],
          (student) => student.studentId,
        );

        const success = writeDatabase('credentials', {
          ...current,
          admins: nextAdmins,
          teachers: nextTeachers,
          students: nextStudents,
        });

        if (!success) {
          showBanner('error', 'Failed to add sample user data.');
          return;
        }

        showBanner('success', 'Sample users added.');
      }

      if (action === 'delete-all') {
        const preservedAdmins = (current.admins || []).length > 0
          ? current.admins
          : (credentialsSeed.admins as AdminCredential[]);

        const success = writeDatabase('credentials', {
          ...current,
          teachers: [],
          students: [],
          admins: preservedAdmins,
        });

        if (!success) {
          showBanner('error', 'Failed to clear user data.');
          return;
        }

        showBanner('success', 'Teachers and students cleared. Admin accounts were preserved.');
      }
    }

    if (key === 'alumni') {
      const current = readDatabase<{ alumni?: any[] }>('alumni') || { alumni: [] };

      if (action === 'add-sample') {
        const merged = uniqueBy(
          [...(current.alumni || []), ...((alumniSeed as any).alumni || [])],
          (item) => `${item.name || ''}-${item.batch || ''}`,
        );

        const success = writeDatabase('alumni', { ...current, alumni: merged });
        if (!success) {
          showBanner('error', 'Failed to add sample alumni data.');
          return;
        }

        showBanner('success', 'Sample alumni added.');
      }

      if (action === 'delete-all') {
        const success = writeDatabase('alumni', { ...current, alumni: [] });
        if (!success) {
          showBanner('error', 'Failed to clear alumni data.');
          return;
        }

        showBanner('success', 'All alumni data removed.');
      }
    }

    if (key === 'events') {
      const current = readDatabase<any>('pages') || {};
      const existingSlides = Array.isArray(current?.home?.heroSlides) ? current.home.heroSlides : [];
      const existingHeroes = existingSlides.filter((slide: any) => slide?.type === 'hero');
      const existingEvents = existingSlides.filter((slide: any) => slide?.type === 'announcement' || slide?.type === 'bulletin');
      const seededEvents = Array.isArray((pagesSeed as any)?.home?.heroSlides)
        ? (pagesSeed as any).home.heroSlides.filter((slide: any) => slide?.type === 'announcement' || slide?.type === 'bulletin')
        : [];

      if (action === 'add-sample') {
        const mergedEvents = uniqueBy(
          [...existingEvents, ...seededEvents],
          (slide) => String(slide.id || slide.title || ''),
        );

        const success = writeDatabase('pages', {
          ...current,
          home: {
            ...(current.home || {}),
            heroSlides: [...existingHeroes, ...mergedEvents],
          },
        });

        if (!success) {
          showBanner('error', 'Failed to add sample event data.');
          return;
        }

        showBanner('success', 'Sample events added.');
      }

      if (action === 'delete-all') {
        const success = writeDatabase('pages', {
          ...current,
          home: {
            ...(current.home || {}),
            heroSlides: existingHeroes,
          },
        });

        if (!success) {
          showBanner('error', 'Failed to clear event data.');
          return;
        }

        showBanner('success', 'All featured event slides removed.');
      }
    }

    if (key === 'faculty') {
      const current = readDatabase<{ staff?: any[] }>('faculty') || { staff: [] };

      if (action === 'add-sample') {
        const merged = uniqueBy(
          [...(current.staff || []), ...((facultySeed as any).staff || [])],
          (item) => String(item.name || ''),
        );

        const success = writeDatabase('faculty', { ...current, staff: merged });
        if (!success) {
          showBanner('error', 'Failed to add sample faculty data.');
          return;
        }

        showBanner('success', 'Sample faculty and department data added.');
      }

      if (action === 'delete-all') {
        const success = writeDatabase('faculty', { ...current, staff: [] });
        if (!success) {
          showBanner('error', 'Failed to clear faculty data.');
          return;
        }

        showBanner('success', 'All faculty and department-category data removed.');
      }
    }

    if (key === 'schoolYears') {
      const current = readDatabase<any>('school_years') || {};
      const seedYears = Array.isArray((schoolYearsSeed as any).school_years) ? (schoolYearsSeed as any).school_years : [];

      if (action === 'add-sample') {
        const merged = uniqueBy(
          [...(Array.isArray(current.school_years) ? current.school_years : []), ...seedYears],
          (item) => String(item.id || item.name || item.school_year || ''),
        );

        const success = writeDatabase('school_years', {
          ...current,
          school_years: merged,
        });

        if (!success) {
          showBanner('error', 'Failed to add sample school year data.');
          return;
        }

        showBanner('success', 'Sample school year data added.');
      }

      if (action === 'delete-all') {
        const success = writeDatabase('school_years', {
          ...current,
          school_years: [],
        });

        if (!success) {
          showBanner('error', 'Failed to clear school year data.');
          return;
        }

        showBanner('success', 'All school year data removed.');
      }
    }

    localStorage.removeItem(HOME_IMAGE_STORAGE_KEY);
    localStorage.removeItem(HOME_IMAGE_EDIT_MODE_KEY);
    await initializeDatabase();
    refreshCounts();
  };

  const requestSeedAction = (item: SeedItem, action: SeedAction) => {
    const isDelete = action === 'delete-all';
    const actionLabel = isDelete ? item.deleteLabel : item.addLabel;

    openConfirm({
      title: actionLabel,
      message: isDelete
        ? `This will modify ${item.title.toLowerCase()} records immediately. Admin accounts are preserved when deleting users.`
        : `This will append sample ${item.title.toLowerCase()} records into your current data.`,
      confirmLabel: isDelete ? 'Yes, continue' : 'Apply sample data',
      intent: isDelete ? 'danger' : 'primary',
      action: () => {
        void applySeedAction(item.key, action);
      },
    });
  };

  const updateAdminCredentials = () => {
    if (!session) {
      showBanner('error', 'No active admin session found.');
      return;
    }

    const nextUsername = settingsUsername.trim();
    if (!nextUsername) {
      showBanner('error', 'Username is required.');
      return;
    }

    if (settingsPassword && settingsPassword !== settingsPasswordConfirm) {
      showBanner('error', 'Password confirmation does not match.');
      return;
    }

    const credentials = getCredentialsDb();
    const adminIndex = credentials.admins.findIndex((admin) => admin.id === session.id);
    if (adminIndex < 0) {
      showBanner('error', 'Unable to locate your admin account.');
      return;
    }

    const usernameTaken = credentials.admins.some(
      (admin, index) => index !== adminIndex && admin.username.toLowerCase() === nextUsername.toLowerCase(),
    );

    if (usernameTaken) {
      showBanner('error', 'That username is already used by another admin.');
      return;
    }

    const updatedAdmin: AdminCredential = {
      ...credentials.admins[adminIndex],
      username: nextUsername,
      password: settingsPassword ? settingsPassword : credentials.admins[adminIndex].password,
    };

    const nextCredentials: CredentialsDb = {
      ...credentials,
      admins: [...credentials.admins],
      teachers: [...credentials.teachers],
      students: [...credentials.students],
    };
    nextCredentials.admins[adminIndex] = updatedAdmin;

    const success = writeDatabase('credentials', nextCredentials);
    if (!success) {
      showBanner('error', 'Failed to update admin account.');
      return;
    }

    saveAdminSession(updatedAdmin);
    const nextSession = getAdminSession() as AdminSession | null;
    setSession(nextSession);
    setSettingsPassword('');
    setSettingsPasswordConfirm('');
    showBanner('success', 'Admin username/password updated successfully.');
    refreshCounts();
  };

  const saveFacebookAccessToken = () => {
    const nextToken = facebookAccessToken.trim();
    if (!nextToken) {
      showBanner('error', 'Facebook access token is required.');
      return;
    }

    try {
      localStorage.setItem(FACEBOOK_TOKEN_STORAGE_KEY, nextToken);
      setFacebookAccessToken('');
      setFacebookTokenSaved(true);
      showBanner('success', 'Facebook access token saved. Refresh News & Updates to apply.');
    } catch (error) {
      console.error('Failed to persist Facebook token:', error);
      showBanner('error', 'Unable to save token in this browser.');
    }
  };

  const menuItems = [
    { id: 'seeding' as DeveloperTab, label: 'Seeding', icon: Database },
    { id: 'settings' as DeveloperTab, label: 'Settings', icon: Settings },
  ];

  const stats = useMemo(() => {
    return {
      users: usersCount,
      alumni: alumniCount,
      events: eventsCount,
      faculty: facultyCount,
      departments: departmentsCount,
      schoolYears: schoolYearsCount,
    };
  }, [usersCount, alumniCount, eventsCount, facultyCount, departmentsCount, schoolYearsCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={30} className="text-[#185C20] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#185C20]/70 font-semibold">Loading developer tools...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#185C20]/10 bg-white shadow-xl p-6">
          <button
            type="button"
            onClick={() => goTo('home')}
            className="inline-flex items-center gap-2 text-sm text-[#185C20]/70 hover:text-[#185C20] mb-4"
          >
            <ArrowLeft size={15} />
            Back to site
          </button>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#185C20] mx-auto mb-3 flex items-center justify-center">
              <Lock size={28} className="text-[#EDCD1F]" />
            </div>
            <h1 className="text-2xl font-bold text-[#185C20]">Developer Access</h1>
            <p className="text-sm text-[#185C20]/60 mt-1">Admin and superadmin only</p>
          </div>

          {bannerMessage && (
            <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-semibold ${getStatusStyles(bannerType)}`}>
              {bannerMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                required
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-[#185C20] text-white font-bold text-sm hover:bg-[#144a1a] transition-colors"
            >
              Sign in to developer tools
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] selection:bg-[#EDCD1F] selection:text-[#185C20] flex">
      <div
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />

      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280,
          width: 280,
        }}
        className="bg-[#185C20] text-white flex-shrink-0 overflow-hidden fixed lg:sticky top-0 h-screen z-40"
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDCD1F] flex items-center justify-center flex-shrink-0">
                <Database size={24} className="text-[#185C20]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-serif font-bold text-sm whitespace-nowrap">MMPNS</h1>
                <p className="text-xs text-white/60 whitespace-nowrap">Developer Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#EDCD1F] text-[#185C20] shadow-lg'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-1">
            <button
              onClick={() => goTo('home')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <Home size={20} className="flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Back to Site</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Sign Out</span>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all cursor-pointer lg:hidden"
            >
              <X size={20} className="flex-shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Close Menu</span>
            </button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#185C20]/10 px-4 md:px-8 py-4 md:py-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#185C20] hover:bg-[#185C20]/5 rounded-lg transition-colors flex-shrink-0"
              >
                <Menu size={24} />
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-lg md:text-2xl text-[#185C20] truncate">
                  {activeTab === 'seeding' ? 'Seeding Controls' : 'Developer Settings'}
                </h2>
                <p className="text-xs md:text-sm text-[#185C20]/50 mt-1 hidden sm:block">
                  Signed in as {session?.displayName} ({session?.role})
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#185C20]/40 uppercase tracking-wider hidden md:block">Developer</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 space-y-4">
          {bannerMessage && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${getStatusStyles(bannerType)}`}>
              {bannerType === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {bannerMessage}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'seeding' && (
              <motion.div
                key="seeding"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="bg-white rounded-xl border border-[#185C20]/10 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#185C20]/50 font-bold">Users</p>
                    <p className="text-lg font-black text-[#185C20] mt-1">{stats.users}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#185C20]/10 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#185C20]/50 font-bold">Alumni</p>
                    <p className="text-lg font-black text-[#185C20] mt-1">{stats.alumni}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#185C20]/10 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#185C20]/50 font-bold">Events</p>
                    <p className="text-lg font-black text-[#185C20] mt-1">{stats.events}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#185C20]/10 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#185C20]/50 font-bold">Faculty</p>
                    <p className="text-lg font-black text-[#185C20] mt-1">{stats.faculty}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#185C20]/10 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#185C20]/50 font-bold">Departments</p>
                    <p className="text-lg font-black text-[#185C20] mt-1">{stats.departments}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#185C20]/10 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#185C20]/50 font-bold">School Years</p>
                    <p className="text-lg font-black text-[#185C20] mt-1">{stats.schoolYears}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#185C20]/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#185C20]/10">
                    <h3 className="text-lg font-bold text-[#185C20]">Data Seeding</h3>
                    <p className="text-sm text-[#185C20]/60 mt-1">
                      Add sample data or clear specific datasets with custom confirmation prompts.
                    </p>
                  </div>

                  <div className="divide-y divide-[#185C20]/10">
                    {seedItems.map((item) => (
                      <div key={item.key} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                        <div>
                          <p className="text-sm font-bold text-[#185C20]">{item.title}</p>
                          <p className="text-xs text-[#185C20]/55 mt-0.5">{item.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => requestSeedAction(item, 'add-sample')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#185C20] text-white hover:bg-[#144a1a]"
                          >
                            <RefreshCw size={13} />
                            {item.addLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestSeedAction(item, 'delete-all')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={13} />
                            {item.deleteLabel}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl border border-[#185C20]/10 p-5 space-y-4">
                  <h3 className="text-lg font-bold text-[#185C20]">Admin Account Settings</h3>
                  <p className="text-sm text-[#185C20]/60">
                    Update your admin username and password for the current developer account.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Username</label>
                      <input
                        value={settingsUsername}
                        onChange={(event) => setSettingsUsername(event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                        placeholder="Admin username"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">New Password</label>
                      <input
                        type="password"
                        value={settingsPassword}
                        onChange={(event) => setSettingsPassword(event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                        placeholder="Leave blank to keep current"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Confirm Password</label>
                      <input
                        type="password"
                        value={settingsPasswordConfirm}
                        onChange={(event) => setSettingsPasswordConfirm(event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={updateAdminCredentials}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a]"
                    >
                      <Save size={14} />
                      Save account changes
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#185C20]/10 p-5 space-y-4">
                  <h3 className="text-lg font-bold text-[#185C20]">News & Updates Facebook Token</h3>
                  <p className="text-sm text-[#185C20]/60">
                    Paste a Facebook Page access token used by the News & Updates feed. This is saved locally in this browser.
                  </p>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Access Token</label>
                    <input
                      type="password"
                      value={facebookAccessToken}
                      onChange={(event) => setFacebookAccessToken(event.target.value)}
                      className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      placeholder="Paste token here"
                    />
                    <p className="text-xs text-[#185C20]/50 mt-2">
                      Status: {facebookTokenSaved ? 'Token is set' : 'No token saved'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveFacebookAccessToken}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a]"
                    >
                      <Save size={14} />
                      Save token
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#185C20]/10 p-5">
                  <h3 className="text-lg font-bold text-[#185C20]">Session Info</h3>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-[#185C20]/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-[#185C20]/45 font-bold">Display Name</p>
                      <p className="text-[#185C20] font-semibold mt-1">{session?.displayName || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-[#185C20]/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-[#185C20]/45 font-bold">Role</p>
                      <p className="text-[#185C20] font-semibold mt-1">{session?.role || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-[#185C20]/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-[#185C20]/45 font-bold">Email</p>
                      <p className="text-[#185C20] font-semibold mt-1">{session?.email || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-[#185C20]/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-[#185C20]/45 font-bold">Login Time</p>
                      <p className="text-[#185C20] font-semibold mt-1">{session?.loginTime || '-'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <ModalConfirm state={confirmState} onClose={closeConfirm} />
    </div>
  );
};

export default Developer;
