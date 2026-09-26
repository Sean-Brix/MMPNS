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
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { logout } from '../../../utils/auth';
// Legacy types kept for component compatibility (page is redirected to /superadmin)
type AdminCredential = { username: string; password: string };
type StudentCredential = { studentId: string; password: string };
type TeacherCredential = { username: string; password: string };
const authenticateAdminOnline = async (_u: string, _p: string) => ({ success: false, error: 'Redirected' });
const clearAdminSession = () => { void logout(); };
const getAdminSession = () => null;
const saveAdminSession = (_c: AdminCredential, _t: string) => undefined;
import { initializeDatabase, readDatabase, readSeedSnapshotOnline, writeDatabase } from '../../../utils/database';
import { HOME_IMAGE_EDIT_MODE_KEY, HOME_IMAGE_STORAGE_KEY } from '../../../utils/homeImageSlots';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { useRowSelection, SelectCheckbox, BulkEditField } from '../../components/common/BulkActions';

type DeveloperTab = 'seeding' | 'userManagement' | 'settings';
type BannerType = 'success' | 'error' | 'info';

type SeedKey = 'users' | 'alumni' | 'events' | 'faculty' | 'schoolYears';
type SeedAction = 'add-sample' | 'delete-all';
type AccountType = 'admins' | 'teachers' | 'students';
type AccountKind = 'teacher' | 'student' | 'librarian' | 'principal' | 'registrar' | 'systemAdmin' | 'superadmin';

interface AdminSession {
  id: number;
  displayName: string;
  initials: string;
  role: string;
  email: string;
  token?: string;
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

interface AccountFormState {
  accountType: AccountType;
  accountKind: AccountKind;
  username: string;
  studentId: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  position: string;
  employeeId: string;
  subjects: string;
  advisoryClass: string;
  gradeLevel: string;
  section: string;
  lrn: string;
  guardianName: string;
  guardianContact: string;
  status: string;
}

interface ManagedAccountRow {
  accountType: AccountType;
  account: AdminCredential | TeacherCredential | StudentCredential;
}

const ALLOWED_ROLES = new Set(['admin', 'superadmin']);

const FACEBOOK_TOKEN_STORAGE_KEY = 'mmpns_fb_page_access_token';

const accountTypeLabels: Record<AccountType, string> = {
  admins: 'Admins',
  teachers: 'Teachers',
  students: 'Students',
};

const accountKindOptions: Array<{ kind: AccountKind; label: string }> = [
  { kind: 'teacher', label: 'Teacher' },
  { kind: 'student', label: 'Student' },
  { kind: 'librarian', label: 'Librarian' },
  { kind: 'principal', label: 'Principal' },
  { kind: 'registrar', label: 'Multi-Role' },
  { kind: 'systemAdmin', label: 'System Admin' },
  { kind: 'superadmin', label: 'Dev/Superadmin' },
];

const accountTypes: AccountType[] = ['admins', 'teachers', 'students'];

const getAccountTypeForKind = (kind: AccountKind): AccountType => {
  if (kind === 'student') {
    return 'students';
  }

  if (kind === 'systemAdmin' || kind === 'superadmin') {
    return 'admins';
  }

  return 'teachers';
};

const getDefaultRoleForKind = (kind: AccountKind) => (kind === 'superadmin' ? 'superadmin' : 'admin');

const getDefaultDepartmentForKind = (kind: AccountKind) => {
  if (kind === 'librarian') return 'Library';
  if (kind === 'registrar') return 'Registrar';
  if (kind === 'principal') return 'Administration';
  return '';
};

const getDefaultPositionForKind = (kind: AccountKind) => {
  if (kind === 'librarian') return 'Librarian';
  if (kind === 'registrar') return 'Multi-Role';
  if (kind === 'principal') return 'Principal';
  if (kind === 'teacher') return 'Teacher';
  return '';
};

const getAccountKindLabel = (kind: AccountKind) => (
  accountKindOptions.find((option) => option.kind === kind)?.label || 'Account'
);

const deriveAccountKind = (accountType: AccountType, account: any): AccountKind => {
  if (accountType === 'students') return 'student';
  if (accountType === 'admins') return account.role === 'superadmin' ? 'superadmin' : 'systemAdmin';

  const position = String(account.position || '').toLowerCase();
  const department = String(account.department || '').toLowerCase();

  if (position.includes('principal')) return 'principal';
  if (position.includes('librarian') || department.includes('library')) return 'librarian';
  if (position.includes('registrar') || department.includes('registrar')) return 'registrar';
  return 'teacher';
};

const createEmptyAccountForm = (accountKind: AccountKind): AccountFormState => {
  const accountType = getAccountTypeForKind(accountKind);
  return {
  accountType,
  accountKind,
  username: '',
  studentId: '',
  password: '',
  firstName: '',
  lastName: '',
  displayName: '',
  initials: '',
  email: '',
  role: accountType === 'admins' ? getDefaultRoleForKind(accountKind) : '',
  department: getDefaultDepartmentForKind(accountKind),
  position: getDefaultPositionForKind(accountKind),
  employeeId: '',
  subjects: '',
  advisoryClass: '',
  gradeLevel: '',
  section: '',
  lrn: '',
  guardianName: '',
  guardianContact: '',
  status: 'active',
  };
};

const getNextId = (items: Array<{ id?: number }>) => {
  const ids = items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
  return ids.length ? Math.max(...ids) + 1 : 1;
};

const makeDisplayName = (form: AccountFormState, fallback: string) => {
  return form.displayName.trim() || [form.firstName, form.lastName].map((value) => value.trim()).filter(Boolean).join(' ') || fallback;
};

const makeInitials = (form: AccountFormState, displayName: string) => {
  return form.initials.trim() || displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const splitSubjects = (value: string) => value
  .split(',')
  .map((subject) => subject.trim())
  .filter(Boolean);

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
  const [activeTab, setActiveTab] = useState<DeveloperTab>('userManagement');
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
  const [accountForm, setAccountForm] = useState<AccountFormState>(() => createEmptyAccountForm('teacher'));
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Bulk selection / editing (composite ids: `${accountType}-${id}`)
  const selection = useRowSelection<string>();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [bulkEnabled, setBulkEnabled] = useState<Set<string>>(new Set());

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

    saveAdminSession(result.admin, result.token);
    await initializeDatabase();
    const nextSession = getAdminSession() as AdminSession | null;

    setSession(nextSession);
    setSettingsUsername(result.admin.username);
    setIsAuthenticated(true);
    setUsername('');
    setPassword('');
    refreshCounts();
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
        const credentialsSeed = await readSeedSnapshotOnline<CredentialsDb>('users');
        if (!credentialsSeed) {
          showBanner('error', 'Cloud seed snapshot for users is not available yet.');
          return;
        }

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
        const success = writeDatabase('credentials', {
          ...current,
          teachers: [],
          students: [],
          admins: current.admins || [],
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
        const alumniSeed = await readSeedSnapshotOnline<{ alumni?: any[] }>('alumni');
        if (!alumniSeed) {
          showBanner('error', 'Cloud seed snapshot for alumni is not available yet.');
          return;
        }

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

      if (action === 'add-sample') {
        const eventsSeed = await readSeedSnapshotOnline<{ heroSlides?: any[] }>('events');
        if (!eventsSeed) {
          showBanner('error', 'Cloud seed snapshot for events is not available yet.');
          return;
        }

        const seededEvents = Array.isArray(eventsSeed.heroSlides) ? eventsSeed.heroSlides : [];
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
        const facultySeed = await readSeedSnapshotOnline<{ staff?: any[] }>('faculty');
        if (!facultySeed) {
          showBanner('error', 'Cloud seed snapshot for faculty is not available yet.');
          return;
        }

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

      if (action === 'add-sample') {
        const schoolYearsSeed = await readSeedSnapshotOnline<{ school_years?: any[] }>('schoolYears');
        if (!schoolYearsSeed) {
          showBanner('error', 'Cloud seed snapshot for school years is not available yet.');
          return;
        }

        const seedYears = Array.isArray(schoolYearsSeed.school_years) ? schoolYearsSeed.school_years : [];
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

  const resetAccountForm = (accountKind = accountForm.accountKind) => {
    setAccountForm(createEmptyAccountForm(accountKind));
    setEditingAccountId(null);
  };

  const updateAccountFormField = (field: keyof AccountFormState, value: string) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  const setManagedAccountKind = (accountKind: AccountKind) => {
    setAccountForm(createEmptyAccountForm(accountKind));
    setEditingAccountId(null);
  };

  const openAddAccountModal = (accountKind: AccountKind = 'teacher') => {
    resetAccountForm(accountKind);
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    resetAccountForm();
  };

  const getAccountLogin = (accountType: AccountType, account: any) => (
    accountType === 'students' ? String(account.studentId || '') : String(account.username || '')
  );

  const getAccountSubtitle = (accountType: AccountType, account: any) => {
    if (accountType === 'admins') {
      return account.role || 'admin';
    }

    if (accountType === 'teachers') {
      return [account.department, account.position].filter(Boolean).join(' / ') || 'teacher';
    }

    return [account.gradeLevel, account.section].filter(Boolean).join(' / ') || 'student';
  };

  const startEditingAccount = (accountType: AccountType, account: any) => {
    const accountKind = deriveAccountKind(accountType, account);

    setAccountForm({
      accountType,
      accountKind,
      username: account.username || '',
      studentId: account.studentId || '',
      password: '',
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      displayName: account.displayName || '',
      initials: account.initials || '',
      email: account.email || '',
      role: account.role || (accountType === 'admins' ? 'admin' : ''),
      department: account.department || '',
      position: account.position || '',
      employeeId: account.employeeId || '',
      subjects: Array.isArray(account.subjects) ? account.subjects.join(', ') : '',
      advisoryClass: account.advisoryClass || '',
      gradeLevel: account.gradeLevel || '',
      section: account.section || '',
      lrn: account.lrn || '',
      guardianName: account.guardianName || '',
      guardianContact: account.guardianContact || '',
      status: account.status || 'active',
    });
    setEditingAccountId(Number(account.id));
    setAccountModalOpen(true);
  };

  const saveManagedAccount = () => {
    const credentials = getCredentialsDb();
    const accountType = getAccountTypeForKind(accountForm.accountKind);
    const accounts = [...(credentials[accountType] || [])] as any[];
    const existingIndex = editingAccountId === null ? -1 : accounts.findIndex((account) => account.id === editingAccountId);
    const currentAccount = existingIndex >= 0 ? accounts[existingIndex] : null;
    const loginValue = accountType === 'students' ? accountForm.studentId.trim() : accountForm.username.trim();

    if (!loginValue) {
      showBanner('error', accountType === 'students' ? 'Student ID is required.' : 'Username is required.');
      return;
    }

    if (!accountForm.password.trim() && !currentAccount?.password) {
      showBanner('error', 'Password is required for new accounts.');
      return;
    }

    const loginTaken = accounts.some((account) => {
      if (editingAccountId !== null && account.id === editingAccountId) {
        return false;
      }

      return getAccountLogin(accountType, account).trim().toLowerCase() === loginValue.toLowerCase();
    });

    if (loginTaken) {
      showBanner('error', accountType === 'students' ? 'That student ID is already used.' : 'That username is already used.');
      return;
    }

    const status = accountForm.status.trim() || 'active';
    const id = currentAccount?.id || getNextId(accounts);
    const password = accountForm.password.trim() || currentAccount?.password || '';
    const displayName = makeDisplayName(accountForm, loginValue);
    const initials = makeInitials(accountForm, displayName);
    let nextAccount: AdminCredential | TeacherCredential | StudentCredential;

    if (accountType === 'admins') {
      const role = getDefaultRoleForKind(accountForm.accountKind);

      if (!ALLOWED_ROLES.has(role)) {
        showBanner('error', 'Admin role must be admin or superadmin.');
        return;
      }

      if (session?.id === id && (status !== 'active' || !ALLOWED_ROLES.has(role))) {
        showBanner('error', 'You cannot remove developer access from the active session.');
        return;
      }

      nextAccount = {
        id,
        username: loginValue,
        password,
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        displayName,
        initials,
        email: accountForm.email.trim(),
        role,
        status,
        lastLogin: currentAccount?.lastLogin || null,
      };
    } else if (accountType === 'teachers') {
      nextAccount = {
        id,
        username: loginValue,
        password,
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        displayName,
        initials,
        email: accountForm.email.trim(),
        department: accountForm.department.trim() || getDefaultDepartmentForKind(accountForm.accountKind),
        position: accountForm.position.trim() || getDefaultPositionForKind(accountForm.accountKind),
        employeeId: accountForm.employeeId.trim(),
        subjects: splitSubjects(accountForm.subjects),
        advisoryClass: accountForm.advisoryClass.trim() || null,
        status,
        avatar: currentAccount?.avatar || null,
        lastLogin: currentAccount?.lastLogin || null,
      };
    } else {
      nextAccount = {
        id,
        studentId: loginValue,
        password,
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        displayName,
        initials,
        email: accountForm.email.trim(),
        gradeLevel: accountForm.gradeLevel.trim(),
        section: accountForm.section.trim(),
        lrn: accountForm.lrn.trim(),
        guardianName: accountForm.guardianName.trim(),
        guardianContact: accountForm.guardianContact.trim(),
        status,
        avatar: currentAccount?.avatar || null,
        lastLogin: currentAccount?.lastLogin || null,
      };
    }

    if (existingIndex >= 0) {
      accounts[existingIndex] = nextAccount;
    } else {
      accounts.push(nextAccount);
    }

    const nextCredentials: CredentialsDb = {
      ...credentials,
      admins: [...(credentials.admins || [])],
      teachers: [...(credentials.teachers || [])],
      students: [...(credentials.students || [])],
      [accountType]: accounts,
    };

    const success = writeDatabase('credentials', nextCredentials);
    if (!success) {
      showBanner('error', 'Failed to save account changes.');
      return;
    }

    if (accountType === 'admins' && session?.id === nextAccount.id) {
      saveAdminSession(nextAccount as AdminCredential, session.token);
      setSession(getAdminSession() as AdminSession | null);
      setSettingsUsername((nextAccount as AdminCredential).username);
    }

    showBanner('success', editingAccountId === null ? 'Account added.' : 'Account updated.');
    setAccountModalOpen(false);
    resetAccountForm(accountForm.accountKind);
    refreshCounts();
  };

  const deleteManagedAccount = (accountType: AccountType, accountId: number) => {
    const credentials = getCredentialsDb();
    const accounts = [...(credentials[accountType] || [])] as any[];

    if (accountType === 'admins' && session?.id === accountId) {
      showBanner('error', 'You cannot delete the admin account you are using.');
      return;
    }

    if (accountType === 'admins' && accounts.length <= 1) {
      showBanner('error', 'At least one admin account must remain.');
      return;
    }

    const nextCredentials: CredentialsDb = {
      ...credentials,
      admins: [...(credentials.admins || [])],
      teachers: [...(credentials.teachers || [])],
      students: [...(credentials.students || [])],
      [accountType]: accounts.filter((account) => account.id !== accountId),
    };

    const success = writeDatabase('credentials', nextCredentials);
    if (!success) {
      showBanner('error', 'Failed to delete account.');
      return;
    }

    showBanner('success', 'Account deleted.');
    resetAccountForm();
    refreshCounts();
  };

  const requestDeleteAccount = (accountType: AccountType, account: any) => {
    openConfirm({
      title: 'Delete account',
      message: `This will remove ${account.displayName || getAccountLogin(accountType, account)} from ${accountTypeLabels[accountType]}.`,
      confirmLabel: 'Delete account',
      intent: 'danger',
      action: () => deleteManagedAccount(accountType, account.id),
    });
  };

  // ─── Bulk selection / editing ───────────────────────────────────────────────
  // Composite row id keeps teachers/students/admins distinct (ids only unique
  // within their own array). The active admin can never be bulk-selected.
  const bulkRowId = (accountType: AccountType, account: any) => `${accountType}-${account.id}`;

  const isRowSelectable = (accountType: AccountType, account: any) =>
    !(accountType === 'admins' && session?.id === account.id);

  const parseRowId = (rowId: string): { accountType: AccountType; id: number } => {
    const idx = rowId.indexOf('-');
    return { accountType: rowId.slice(0, idx) as AccountType, id: Number(rowId.slice(idx + 1)) };
  };

  // Non-unique fields safe to share. Username / student ID / email / employee ID
  // are unique per account and are intentionally omitted.
  const bulkFieldsForType: Record<string, AccountType[]> = {
    status: ['admins', 'teachers', 'students'],
    department: ['teachers'],
    position: ['teachers'],
    gradeLevel: ['students'],
    section: ['students'],
  };

  const openBulkEdit = () => {
    setBulkValues({ status: 'active' });
    setBulkEnabled(new Set());
    setBulkEditOpen(true);
  };

  const toggleBulkField = (key: string, enabled: boolean) => {
    setBulkEnabled((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const applyBulkEdit = () => {
    const credentials = getCredentialsDb();
    const next: CredentialsDb = {
      ...credentials,
      admins: [...(credentials.admins || [])],
      teachers: [...(credentials.teachers || [])],
      students: [...(credentials.students || [])],
    };

    const selectedRows = selection.selected.map(parseRowId);
    let changed = 0;

    selectedRows.forEach(({ accountType, id }) => {
      if (!isRowSelectable(accountType, { id })) return;
      const arr = next[accountType] as any[];
      const index = arr.findIndex((account) => account.id === id);
      if (index < 0) return;

      const patch: Record<string, any> = {};
      bulkEnabled.forEach((key) => {
        if (!bulkFieldsForType[key]?.includes(accountType)) return;
        patch[key] = key === 'status' ? (bulkValues.status || 'active') : (bulkValues[key] || '').trim();
      });

      if (Object.keys(patch).length === 0) return;
      arr[index] = { ...arr[index], ...patch };
      changed += 1;
    });

    if (changed === 0) {
      showBanner('info', 'No matching fields to apply for the selected accounts.');
      return;
    }

    const success = writeDatabase('credentials', next);
    if (!success) {
      showBanner('error', 'Failed to apply bulk changes.');
      return;
    }

    showBanner('success', `Updated ${changed} account${changed === 1 ? '' : 's'}.`);
    setBulkEditOpen(false);
    selection.clear();
    refreshCounts();
  };

  const requestBulkEdit = () => {
    if (bulkEnabled.size === 0) return;
    openConfirm({
      title: 'Apply bulk changes',
      message: `Apply the selected field changes to ${selection.count} account${selection.count === 1 ? '' : 's'}? Fields that don't match an account type are skipped.`,
      confirmLabel: 'Apply changes',
      intent: 'primary',
      action: applyBulkEdit,
    });
  };

  const performBulkDelete = () => {
    const credentials = getCredentialsDb();
    const selectedRows = selection.selected.map(parseRowId)
        .filter(({ accountType, id }) => isRowSelectable(accountType, { id }));

    const removeIds: Record<AccountType, Set<number>> = {
      admins: new Set(),
      teachers: new Set(),
      students: new Set(),
    };
    selectedRows.forEach(({ accountType, id }) => removeIds[accountType].add(id));

    const remainingAdmins = (credentials.admins || []).filter((admin) => !removeIds.admins.has(admin.id));
    if (remainingAdmins.length === 0) {
      showBanner('error', 'At least one admin account must remain.');
      return;
    }

    const next: CredentialsDb = {
      ...credentials,
      admins: remainingAdmins,
      teachers: (credentials.teachers || []).filter((teacher: any) => !removeIds.teachers.has(teacher.id)),
      students: (credentials.students || []).filter((student: any) => !removeIds.students.has(student.id)),
    };

    const success = writeDatabase('credentials', next);
    if (!success) {
      showBanner('error', 'Failed to delete selected accounts.');
      return;
    }

    const total = removeIds.admins.size + removeIds.teachers.size + removeIds.students.size;
    showBanner('success', `Deleted ${total} account${total === 1 ? '' : 's'}.`);
    selection.clear();
    refreshCounts();
  };

  const requestBulkDelete = () => {
    openConfirm({
      title: 'Delete accounts',
      message: `Permanently delete ${selection.count} account${selection.count === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Delete accounts',
      intent: 'danger',
      action: performBulkDelete,
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

    saveAdminSession(updatedAdmin, session.token);
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
    { id: 'userManagement' as DeveloperTab, label: 'User Management', icon: User },
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

  const credentialsForAccounts = getCredentialsDb();
  const managedAccounts: ManagedAccountRow[] = accountTypes.flatMap((accountType) => (
    (credentialsForAccounts[accountType] || []).map((account) => ({
      accountType,
      account,
    }))
  ));

  const selectableRows = managedAccounts.filter(({ accountType, account }) => isRowSelectable(accountType, account));
  const selectableRowIds = selectableRows.map(({ accountType, account }) => bulkRowId(accountType, account));
  const allRowsSelected = selectableRowIds.length > 0 && selectableRowIds.every((id) => selection.isSelected(id));
  const someRowsSelected = selectableRowIds.some((id) => selection.isSelected(id));

  // Drop selections for rows that no longer exist (after edits / deletes / seeding).
  useEffect(() => {
    selection.retain(selectableRowIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectableRowIds.join('|')]);

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
                  {activeTab === 'seeding'
                    ? 'Seeding Controls'
                    : activeTab === 'userManagement'
                      ? 'User Management'
                      : 'Developer Settings'}
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

            {activeTab === 'userManagement' && (
              <motion.div
                key="userManagement"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl border border-[#185C20]/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#185C20]">User Management</h3>
                    <p className="text-sm text-[#185C20]/60 mt-1">
                      Manage every account in one place.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddAccountModal()}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a]"
                  >
                    <Plus size={14} />
                    Add account
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-[#185C20]/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#185C20]/10 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#185C20]">All Accounts</h3>
                      <p className="text-sm text-[#185C20]/60 mt-1">{managedAccounts.length} account{managedAccounts.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  {selection.count > 0 && (
                    <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-[#185C20]/5 border-b border-[#185C20]/10">
                      <span className="text-sm font-semibold text-[#185C20]">{selection.count} selected</span>
                      <button
                        type="button"
                        onClick={openBulkEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#185C20] text-white text-xs font-semibold hover:bg-[#144a1a]"
                      >
                        <Pencil size={13} /> Edit selected
                      </button>
                      <button
                        type="button"
                        onClick={requestBulkDelete}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                      >
                        <Trash2 size={13} /> Delete selected
                      </button>
                      <button
                        type="button"
                        onClick={() => selection.clear()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#185C20]/70 hover:bg-[#185C20]/10"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {managedAccounts.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-[#185C20]/50 font-semibold">
                      No accounts found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#185C20]/5 text-[#185C20]/60">
                          <tr>
                            <th className="w-10 px-5 py-3">
                              <SelectCheckbox
                                checked={allRowsSelected}
                                indeterminate={someRowsSelected}
                                onChange={() => selection.setMany(selectableRowIds, !allRowsSelected)}
                                disabled={selectableRowIds.length === 0}
                                className="accent-[#185C20]"
                                ariaLabel="Select all accounts"
                              />
                            </th>
                            <th className="text-left px-5 py-3 font-bold text-[11px] uppercase tracking-wider">Name</th>
                            <th className="text-left px-5 py-3 font-bold text-[11px] uppercase tracking-wider">Type</th>
                            <th className="text-left px-5 py-3 font-bold text-[11px] uppercase tracking-wider">Login</th>
                            <th className="text-left px-5 py-3 font-bold text-[11px] uppercase tracking-wider">Details</th>
                            <th className="text-left px-5 py-3 font-bold text-[11px] uppercase tracking-wider">Status</th>
                            <th className="text-right px-5 py-3 font-bold text-[11px] uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#185C20]/10">
                          {managedAccounts.map(({ accountType, account }) => {
                            const rowId = bulkRowId(accountType, account);
                            const selectable = isRowSelectable(accountType, account);
                            return (
                            <tr key={rowId} className={selection.isSelected(rowId) ? 'bg-[#185C20]/[0.04]' : ''}>
                              <td className="px-5 py-3">
                                <SelectCheckbox
                                  checked={selection.isSelected(rowId)}
                                  onChange={() => selection.toggle(rowId)}
                                  disabled={!selectable}
                                  className="accent-[#185C20]"
                                  title={selectable ? 'Select account' : 'You cannot bulk-edit the account you are signed in with'}
                                  ariaLabel={`Select ${account.displayName || getAccountLogin(accountType, account)}`}
                                />
                              </td>
                              <td className="px-5 py-3 min-w-[220px]">
                                <p className="font-bold text-[#185C20]">{account.displayName || getAccountLogin(accountType, account)}</p>
                                <p className="text-xs text-[#185C20]/50">{account.email || '-'}</p>
                              </td>
                              <td className="px-5 py-3 min-w-[120px]">
                                <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EDCD1F]/20 text-[#185C20] border border-[#EDCD1F]/40">
                                  {getAccountKindLabel(deriveAccountKind(accountType, account))}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-[#185C20]/70 font-semibold min-w-[150px]">
                                {getAccountLogin(accountType, account)}
                              </td>
                              <td className="px-5 py-3 text-[#185C20]/70 min-w-[180px]">
                                {getAccountSubtitle(accountType, account)}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  account.status === 'active'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>
                                  {account.status || 'active'}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditingAccount(accountType, account)}
                                    className="w-8 h-8 rounded-lg border border-[#185C20]/15 text-[#185C20] hover:bg-[#185C20]/5 inline-flex items-center justify-center"
                                    aria-label="Edit account"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteAccount(accountType, account)}
                                    className="w-8 h-8 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 inline-flex items-center justify-center"
                                    aria-label="Delete account"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
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

      {accountModalOpen && (
        <div className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeAccountModal}>
          <div
            className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#185C20]/10">
              <div>
                <h3 className="text-lg font-bold text-[#185C20]">
                  {editingAccountId === null ? 'Add Account' : 'Edit Account'}
                </h3>
                <p className="text-xs text-[#185C20]/60 mt-1">
                  {editingAccountId === null ? 'Choose an account type and enter login details.' : getAccountKindLabel(accountForm.accountKind)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAccountModal}
                className="w-8 h-8 rounded-lg hover:bg-[#185C20]/5 text-[#185C20]/50 hover:text-[#185C20] transition-colors flex items-center justify-center"
                aria-label="Close account modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Account Type</label>
                  <select
                    value={accountForm.accountKind}
                    onChange={(event) => setManagedAccountKind(event.target.value as AccountKind)}
                    disabled={editingAccountId !== null}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {accountKindOptions.map((option) => (
                      <option key={option.kind} value={option.kind}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">
                    {getAccountTypeForKind(accountForm.accountKind) === 'students' ? 'Student ID' : 'Username'}
                  </label>
                  <input
                    value={getAccountTypeForKind(accountForm.accountKind) === 'students' ? accountForm.studentId : accountForm.username}
                    onChange={(event) => updateAccountFormField(
                      getAccountTypeForKind(accountForm.accountKind) === 'students' ? 'studentId' : 'username',
                      event.target.value,
                    )}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Password</label>
                  <input
                    type="password"
                    value={accountForm.password}
                    onChange={(event) => updateAccountFormField('password', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                    placeholder={editingAccountId === null ? '' : 'Leave blank to keep'}
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Status</label>
                  <select
                    value={accountForm.status}
                    onChange={(event) => updateAccountFormField('status', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">First Name</label>
                  <input
                    value={accountForm.firstName}
                    onChange={(event) => updateAccountFormField('firstName', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Last Name</label>
                  <input
                    value={accountForm.lastName}
                    onChange={(event) => updateAccountFormField('lastName', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Display Name</label>
                  <input
                    value={accountForm.displayName}
                    onChange={(event) => updateAccountFormField('displayName', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Initials</label>
                  <input
                    value={accountForm.initials}
                    onChange={(event) => updateAccountFormField('initials', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Email</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(event) => updateAccountFormField('email', event.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  />
                </div>

                {getAccountTypeForKind(accountForm.accountKind) === 'teachers' && (
                  <>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Department</label>
                      <input
                        value={accountForm.department}
                        onChange={(event) => updateAccountFormField('department', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Position</label>
                      <input
                        value={accountForm.position}
                        onChange={(event) => updateAccountFormField('position', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Employee ID</label>
                      <input
                        value={accountForm.employeeId}
                        onChange={(event) => updateAccountFormField('employeeId', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Advisory Class</label>
                      <input
                        value={accountForm.advisoryClass}
                        onChange={(event) => updateAccountFormField('advisoryClass', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div className="md:col-span-2 xl:col-span-4">
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Subjects</label>
                      <input
                        value={accountForm.subjects}
                        onChange={(event) => updateAccountFormField('subjects', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                        placeholder="Comma-separated"
                      />
                    </div>
                  </>
                )}

                {accountForm.accountKind === 'student' && (
                  <>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Grade Level</label>
                      <input
                        value={accountForm.gradeLevel}
                        onChange={(event) => updateAccountFormField('gradeLevel', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Section</label>
                      <input
                        value={accountForm.section}
                        onChange={(event) => updateAccountFormField('section', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">LRN</label>
                      <input
                        value={accountForm.lrn}
                        onChange={(event) => updateAccountFormField('lrn', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Guardian Contact</label>
                      <input
                        value={accountForm.guardianContact}
                        onChange={(event) => updateAccountFormField('guardianContact', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] uppercase tracking-wider font-bold text-[#185C20]/60">Guardian Name</label>
                      <input
                        value={accountForm.guardianName}
                        onChange={(event) => updateAccountFormField('guardianName', event.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#185C20]/10 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeAccountModal}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#185C20]/15 text-[#185C20] hover:bg-[#185C20]/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveManagedAccount}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a]"
              >
                {editingAccountId === null ? <Plus size={14} /> : <Save size={14} />}
                {editingAccountId === null ? 'Add account' : 'Save account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkEditOpen && (
        <div className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBulkEditOpen(false)}>
          <div
            className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#185C20]/10">
              <div>
                <h3 className="text-lg font-bold text-[#185C20]">Edit {selection.count} account{selection.count === 1 ? '' : 's'}</h3>
                <p className="text-xs text-[#185C20]/60 mt-1">Enable a field to apply the same value to every selected account.</p>
              </div>
              <button
                type="button"
                onClick={() => setBulkEditOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#185C20]/5 text-[#185C20]/50 hover:text-[#185C20] transition-colors flex items-center justify-center"
                aria-label="Close bulk edit"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                Username / student ID, email and employee ID are unique per account and can't be bulk-edited.
                Fields only apply to the account types shown.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <BulkEditField
                  label="Status"
                  hint="All account types"
                  enabled={bulkEnabled.has('status')}
                  onToggle={(en) => toggleBulkField('status', en)}
                  accentClass="accent-[#185C20]"
                >
                  <select
                    value={bulkValues.status || 'active'}
                    onChange={(e) => setBulkValues((p) => ({ ...p, status: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </BulkEditField>

                {([
                  { key: 'department', label: 'Department', hint: 'Teachers only' },
                  { key: 'position', label: 'Position', hint: 'Teachers only' },
                  { key: 'gradeLevel', label: 'Grade Level', hint: 'Students only' },
                  { key: 'section', label: 'Section', hint: 'Students only' },
                ] as const).map((field) => (
                  <BulkEditField
                    key={field.key}
                    label={field.label}
                    hint={field.hint}
                    enabled={bulkEnabled.has(field.key)}
                    onToggle={(en) => toggleBulkField(field.key, en)}
                    accentClass="accent-[#185C20]"
                  >
                    <input
                      value={bulkValues[field.key] || ''}
                      onChange={(e) => setBulkValues((p) => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                    />
                  </BulkEditField>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#185C20]/10 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkEditOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#185C20]/15 text-[#185C20] hover:bg-[#185C20]/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestBulkEdit}
                disabled={bulkEnabled.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a] disabled:opacity-50"
              >
                <Save size={14} /> Apply to {selection.count} account{selection.count === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm state={confirmState} onClose={closeConfirm} />
    </div>
  );
};

export default Developer;
