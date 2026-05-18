import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Users, LogOut, Lock, GraduationCap, Eye, EyeOff,
  Bell, MoreHorizontal, Plus, Trash2, Download, ChevronRight,
  BarChart3, UserPlus, CheckCircle2, AlertTriangle, TrendingUp,
  Calculator, FileSpreadsheet, Settings, ClipboardList, ArrowUpDown,
  Search, X, ChevronDown, Layers, Award, LayoutGrid, Sparkles,
  Pencil, PencilOff, Check, SquareCheck, Square, MinusSquare,
  Shield, School, Calendar, UserCheck, Star, Target, Trophy, Clock, RefreshCw, ImagePlus, Tag, MapPin
} from 'lucide-react';
import {
  authenticateTeacherOnline,
  saveTeacherSession,
  getTeacherSession,
  clearTeacherSession,
  getTeacherAccounts,
} from '../../../utils/auth';
import { initializeDatabase, readDatabaseOnline, writeDatabaseOnline } from '../../../utils/database';
import { HOME_IMAGE_EDIT_MODE_KEY } from '../../../utils/homeImageSlots';
import {
  EVENT_TYPES,
  getCalendarAssignmentLabel,
  getCalendarEventType,
  getCalendarTeachers,
  isCalendarEventAssignedToTeacher,
  sortCalendarEvents,
  subscribeSchoolCalendarEvents,
  type CalendarEvent,
} from '../../../utils/schoolCalendar';
import {
  computeEvaluationOverall,
  getEvaluationRating,
  getEvaluationTeachers,
  loadEvaluationRubrics,
  loadTeacherEvaluations,
  resolveEvaluationTeacherUsername,
} from '../../../utils/teacherEvaluations';
import { PrincipalSubjects } from '../../components/principal/PrincipalSubjects';
import { PrincipalEvaluation } from '../../components/principal/PrincipalEvaluation';
import { PrincipalCalendar } from '../../components/principal/PrincipalCalendar';
import { PrincipalRegistration } from '../../components/principal/PrincipalRegistration';
import { PrincipalTeachers } from '../../components/principal/PrincipalTeachers';
import { PrincipalYearSetup } from '../../components/principal/PrincipalYearSetup';
import { Switch } from '../../components/ui/switch';
import onboardingHeroMain from '../../../../assets/homepage/hero1.png';
import onboardingHeroElementary from '../../../../assets/homepage/elementary.png';
import onboardingHeroStudentLife from '../../../../assets/student_life/hero.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __mmpnsDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const TEACHER_PORTAL_ONBOARDING_KEY = 'mmpns_teacher_portal_onboarding_seen_v1';
const APP_OPENING_LOADING_MS = 1500;

const isStandaloneDisplayMode = () => {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const inTwa = document.referrer.startsWith('android-app://');
  const inStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;

  if (iosStandalone || inTwa || inStandaloneMode) {
    return true;
  }

  const browserMode = window.matchMedia('(display-mode: browser)');
  if (browserMode.media !== 'not all' && !browserMode.matches) {
    return true;
  }

  return false;
};

/* ═══════════���══════════════════════════════════
   DepEd Transmutation Table
   ══════════════════════════════════════════════ */
const TRANSMUTATION_TABLE: [number, number, number][] = [
  [100, 100, 100], [98.40, 99.99, 99], [96.80, 98.39, 98], [95.20, 96.79, 97],
  [93.60, 95.19, 96], [92.00, 93.59, 95], [90.40, 91.99, 94], [88.80, 90.39, 93],
  [87.20, 88.79, 92], [85.60, 87.19, 91], [84.00, 85.59, 90], [82.40, 83.99, 89],
  [80.80, 82.39, 88], [79.20, 80.79, 87], [77.60, 79.19, 86], [76.00, 77.59, 85],
  [74.40, 75.99, 84], [72.80, 74.39, 83], [71.20, 72.79, 82], [69.60, 71.19, 81],
  [68.00, 69.59, 80], [66.40, 67.99, 79], [64.80, 66.39, 78], [63.20, 64.79, 77],
  [61.60, 63.19, 76], [60.00, 61.59, 75], [56.00, 59.99, 74], [52.00, 55.99, 73],
  [48.00, 51.99, 72], [44.00, 47.99, 71], [40.00, 43.99, 70], [36.00, 39.99, 69],
  [32.00, 35.99, 68], [28.00, 31.99, 67], [24.00, 27.99, 66], [20.00, 23.99, 65],
  [16.00, 19.99, 64], [12.00, 15.99, 63], [8.00, 11.99, 62], [4.00, 7.99, 61],
  [0, 3.99, 60],
];

function transmute(initialGrade: number): number {
  if (initialGrade >= 100) return 100;
  for (const [low, high, transmuted] of TRANSMUTATION_TABLE) {
    if (initialGrade >= low && initialGrade <= high) return transmuted;
  }
  return 60;
}

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Subject {
  id: string; name: string; type: 'major' | 'minor';
  weights: { written: number; performance: number; quarterly: number };
}
interface Student { id: string; name: string; gender: 'M' | 'F'; yearLevel: string; }
interface Activity { id: string; subjectId: string; quarterId: number; type: 'written' | 'performance' | 'quarterly'; title: string; maxScore: number; }
interface Grade { studentId: string; activityId: string; score: number | null; }
interface TeacherAssignment { subjectId: string; yearLevel: string; }
interface Quarter { id: number; label: string; startDate: string; endDate: string; isLocked: boolean; }
interface TeacherPortalClassData { activities: Activity[]; grades: Grade[]; }
interface TeacherPortalStore {
  classes?: Record<string, TeacherPortalClassData>;
  studentsByYear?: Record<string, Student[]>;
}

/* ══════════════════════════════════════════════
   Static Data
   ══════════════════════════════════════════════ */
const SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', type: 'major', weights: { written: 20, performance: 40, quarterly: 20 } },
  { id: 'science', name: 'Science', type: 'major', weights: { written: 20, performance: 40, quarterly: 20 } },
  { id: 'english', name: 'English', type: 'major', weights: { written: 20, performance: 50, quarterly: 20 } },
  { id: 'filipino', name: 'Filipino', type: 'major', weights: { written: 20, performance: 50, quarterly: 20 } },
  { id: 'ict', name: 'ICT', type: 'minor', weights: { written: 20, performance: 60, quarterly: 20 } },
  { id: 'mapeh', name: 'MAPEH', type: 'minor', weights: { written: 20, performance: 60, quarterly: 20 } },
  { id: 'tle', name: 'TLE', type: 'minor', weights: { written: 20, performance: 60, quarterly: 20 } },
  { id: 'ap', name: 'Araling Panlipunan', type: 'minor', weights: { written: 20, performance: 60, quarterly: 20 } },
  { id: 'esp', name: 'ESP', type: 'minor', weights: { written: 20, performance: 60, quarterly: 20 } },
];

const QUARTERS: Quarter[] = [
  { id: 1, label: '1st Quarter', startDate: '2025-06-05', endDate: '2025-08-22', isLocked: true },
  { id: 2, label: '2nd Quarter', startDate: '2025-08-25', endDate: '2025-11-14', isLocked: true },
  { id: 3, label: '3rd Quarter', startDate: '2025-11-17', endDate: '2026-02-20', isLocked: false },
  { id: 4, label: '4th Quarter', startDate: '2026-02-23', endDate: '2026-04-03', isLocked: false },
];

const TEACHER_PORTAL_TABLE = 'teacher_portal' as const;
const EMPTY_TEACHER_PORTAL_STORE: TeacherPortalStore = {
  classes: {},
  studentsByYear: {},
};

const normalizeTeacherPortalStore = (store: TeacherPortalStore | null | undefined): TeacherPortalStore => ({
  classes: store?.classes ?? {},
  studentsByYear: store?.studentsByYear ?? {},
});

const TEACHER_ASSIGNMENTS: Record<string, TeacherAssignment[]> = {
  'teacher.santos': [
    { subjectId: 'ict', yearLevel: 'Grade 7' }, { subjectId: 'ict', yearLevel: 'Grade 8' },
    { subjectId: 'tle', yearLevel: 'Grade 9' },
  ],
  'teacher.reyes': [
    { subjectId: 'math', yearLevel: 'Grade 7' }, { subjectId: 'math', yearLevel: 'Grade 8' },
    { subjectId: 'math', yearLevel: 'Grade 10' },
  ],
  'teacher.garcia': [
    { subjectId: 'english', yearLevel: 'Grade 6' }, { subjectId: 'english', yearLevel: 'Grade 9' },
    { subjectId: 'filipino', yearLevel: 'Grade 7' },
  ],
  'teacher.cruz': [
    { subjectId: 'science', yearLevel: 'Grade 8' }, { subjectId: 'science', yearLevel: 'Grade 9' },
    { subjectId: 'science', yearLevel: 'Grade 10' },
  ],
  'teacher.mendoza': [
    { subjectId: 'mapeh', yearLevel: 'Grade 6' }, { subjectId: 'mapeh', yearLevel: 'Grade 7' },
    { subjectId: 'esp', yearLevel: 'Grade 8' }, { subjectId: 'ap', yearLevel: 'Grade 9' },
  ],
};

const MOBILE_ONBOARDING_SLIDES = [
  {
    image: onboardingHeroMain,
    title: 'Welcome To MMPNS Mobile',
    description: 'See announcements, classes, and updates in one focused app.',
  },
  {
    image: onboardingHeroElementary,
    title: 'Track Every Learning Milestone',
    description: 'Keep up with classroom progress and student outcomes quickly.',
  },
  {
    image: onboardingHeroStudentLife,
    title: 'Stay Connected To School Life',
    description: 'From academics to activities, everything is within reach.',
  },
] as const;

/* ══════════════════════════════════════════════
   Data Generators
   ══════════════════════════════════════════════ */
function generateStudents(yearLevel: string): Student[] {
  const names: Record<string, { name: string; gender: 'M' | 'F' }[]> = {
    'Grade 6': [
      { name: 'Alcaraz, Maria C.', gender: 'F' }, { name: 'Bautista, John R.', gender: 'M' },
      { name: 'Cruz, Angelica D.', gender: 'F' }, { name: 'De Leon, Marco P.', gender: 'M' },
      { name: 'Estrada, Sofia L.', gender: 'F' }, { name: 'Fernandez, Luis A.', gender: 'M' },
      { name: 'Gonzales, Patricia M.', gender: 'F' }, { name: 'Hernandez, Carlos J.', gender: 'M' },
    ],
    'Grade 7': [
      { name: 'Aquino, Bianca R.', gender: 'F' }, { name: 'Bernardo, Miguel S.', gender: 'M' },
      { name: 'Castillo, Diana V.', gender: 'F' }, { name: 'Dela Cruz, Juan P.', gender: 'M' },
      { name: 'Enriquez, Samantha K.', gender: 'F' }, { name: 'Flores, Andrei J.', gender: 'M' },
      { name: 'Garcia, Kyla M.', gender: 'F' }, { name: 'Ignacio, Nathan A.', gender: 'M' },
      { name: 'Jimenez, Trisha L.', gender: 'F' }, { name: 'Lopez, Rafael D.', gender: 'M' },
    ],
    'Grade 8': [
      { name: 'Aguilar, Camille B.', gender: 'F' }, { name: 'Bello, Ethan R.', gender: 'M' },
      { name: 'Cordero, Janine S.', gender: 'F' }, { name: 'Domingo, Patrick A.', gender: 'M' },
      { name: 'Espinosa, Clara T.', gender: 'F' }, { name: 'Franco, Javier M.', gender: 'M' },
      { name: 'Gutierrez, Alyssa P.', gender: 'F' }, { name: 'Herrera, Dominic L.', gender: 'M' },
      { name: 'Ilagan, Mia G.', gender: 'F' },
    ],
    'Grade 9': [
      { name: 'Alvarez, Sophia N.', gender: 'F' }, { name: 'Buenaventura, James C.', gender: 'M' },
      { name: 'Chua, Isabelle R.', gender: 'F' }, { name: 'Dizon, Christian L.', gender: 'M' },
      { name: 'Evangelista, Nicole D.', gender: 'F' }, { name: 'Feliciano, Mark A.', gender: 'M' },
      { name: 'Galvez, Julia M.', gender: 'F' }, { name: 'Hidalgo, Gabriel S.', gender: 'M' },
      { name: 'Ison, Andrea P.', gender: 'F' }, { name: 'Javier, Roberto K.', gender: 'M' },
      { name: 'Kapunan, Elise J.', gender: 'F' },
    ],
    'Grade 10': [
      { name: 'Abella, Christine M.', gender: 'F' }, { name: 'Balagtas, Kenneth R.', gender: 'M' },
      { name: 'Campos, Alexa S.', gender: 'F' }, { name: 'Dalisay, Francis T.', gender: 'M' },
      { name: 'Escueta, Hannah L.', gender: 'F' }, { name: 'Fabian, Lorenzo A.', gender: 'M' },
      { name: 'Gomez, Beatrice V.', gender: 'F' }, { name: 'Henson, David C.', gender: 'M' },
      { name: 'Ibarra, Therese N.', gender: 'F' }, { name: 'Jacinto, Vincent P.', gender: 'M' },
    ],
  };
  return (names[yearLevel] || []).map((s, i) => ({
    id: `${yearLevel.replace(/\s/g, '')}-${String(i + 1).padStart(3, '0')}`,
    name: s.name, gender: s.gender, yearLevel,
  }));
}

function generateMockGrades(students: Student[], activities: Activity[]): Grade[] {
  const grades: Grade[] = [];
  const seededRandom = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  students.forEach((student, si) => {
    activities.forEach((activity, ai) => {
      const seed = si * 100 + ai + student.name.length;
      const ratio = 0.55 + seededRandom(seed) * 0.45;
      grades.push({ studentId: student.id, activityId: activity.id, score: Math.round(activity.maxScore * ratio) });
    });
  });
  return grades;
}

function generateDefaultActivities(subjectId: string, quarterId: number): Activity[] {
  return [
    { id: `${subjectId}-q${quarterId}-ww1`, subjectId, quarterId, type: 'written', title: 'Written Work 1', maxScore: 30 },
    { id: `${subjectId}-q${quarterId}-ww2`, subjectId, quarterId, type: 'written', title: 'Written Work 2', maxScore: 50 },
    { id: `${subjectId}-q${quarterId}-ww3`, subjectId, quarterId, type: 'written', title: 'Written Work 3', maxScore: 25 },
    { id: `${subjectId}-q${quarterId}-pt1`, subjectId, quarterId, type: 'performance', title: 'Performance Task 1', maxScore: 40 },
    { id: `${subjectId}-q${quarterId}-pt2`, subjectId, quarterId, type: 'performance', title: 'Performance Task 2', maxScore: 50 },
    { id: `${subjectId}-q${quarterId}-qa1`, subjectId, quarterId, type: 'quarterly', title: 'Quarterly Assessment', maxScore: 100 },
  ];
}

/* ══════════════════════════════════════════════
   Computation Engine
   ══════════════════════════════════════════════ */
function computeStudentGrade(
  studentId: string, activities: Activity[], grades: Grade[],
  weights: { written: number; performance: number; quarterly: number }
) {
  const types: ('written' | 'performance' | 'quarterly')[] = ['written', 'performance', 'quarterly'];
  const weightMap = { written: weights.written, performance: weights.performance, quarterly: weights.quarterly };
  let initialGrade = 0;
  const breakdown: Record<string, { avgPS: number; weighted: number }> = {};
  for (const type of types) {
    const typeActivities = activities.filter(a => a.type === type);
    if (typeActivities.length === 0) { breakdown[type] = { avgPS: 0, weighted: 0 }; continue; }
    const psValues = typeActivities.map(act => {
      const grade = grades.find(g => g.studentId === studentId && g.activityId === act.id);
      if (!grade || grade.score === null) return 0;
      return (grade.score / act.maxScore) * 100;
    });
    const avgPS = psValues.reduce((a, b) => a + b, 0) / psValues.length;
    const weighted = (avgPS * weightMap[type]) / 100;
    breakdown[type] = { avgPS, weighted };
    initialGrade += weighted;
  }
  return { initialGrade, transmutedGrade: transmute(initialGrade), breakdown };
}

/* ═══════════════════════════════════════════════════════
   HELPER: grade color
   ═══════════════════════════════════════════════════════ */
const gradeColor = (g: number) =>
  g >= 90 ? 'text-emerald-600' : g >= 85 ? 'text-sky-600' : g >= 80 ? 'text-blue-600' : g >= 75 ? 'text-amber-600' : 'text-red-600';
const gradeBg = (g: number) =>
  g >= 90 ? 'bg-emerald-50 border-emerald-200' : g >= 85 ? 'bg-sky-50 border-sky-200' : g >= 80 ? 'bg-blue-50 border-blue-200' : g >= 75 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
const gradePill = (g: number) =>
  g >= 90 ? 'bg-emerald-100 text-emerald-700' : g >= 85 ? 'bg-sky-100 text-sky-700' : g >= 80 ? 'bg-blue-100 text-blue-700' : g >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export const TeacherPortal: React.FC = () => {
  // ── Auth state ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [onboardingSlideIndex, setOnboardingSlideIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInstalledAppContext, setIsInstalledAppContext] = useState(isStandaloneDisplayMode());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState('');
  const [teacherInfo, setTeacherInfo] = useState<{ username?: string; displayName: string; initials: string; department: string; position: string; employeeId?: string } | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [homeImageEditModeEnabled, setHomeImageEditModeEnabled] = useState(false);
  const onboardingTouchStartX = useRef<number | null>(null);

  // ── Navigation ──
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Grading state ──
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<number>(3);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivityType, setNewActivityType] = useState<'written' | 'performance' | 'quarterly'>('written');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityMaxScore, setNewActivityMaxScore] = useState(50);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [sortField, setSortField] = useState<'name' | 'grade'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [gradingTab, setGradingTab] = useState<'written' | 'performance' | 'quarterly' | 'summary'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  // Multi-select & edit mode
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [bulkScore, setBulkScore] = useState('');
  const [bulkActivityId, setBulkActivityId] = useState('');
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActivityTitle, setEditActivityTitle] = useState('');
  const [editActivityMaxScore, setEditActivityMaxScore] = useState(0);
  const [mobileDetailStudentId, setMobileDetailStudentId] = useState<string | null>(null);
  const [mobileDetailSource, setMobileDetailSource] = useState<'grading' | 'students'>('grading');
  const teacherPortalStoreRef = useRef<TeacherPortalStore>(EMPTY_TEACHER_PORTAL_STORE);
  const [teacherCalendarEvents, setTeacherCalendarEvents] = useState<CalendarEvent[]>([]);

  // ── Init ──
  useEffect(() => {
    let isCancelled = false;

    initializeDatabase();
    // Force re-init credentials to pick up new accounts (e.g. principal)
    localStorage.removeItem('mmpns_db_credentials');
    initializeDatabase();
    setHomeImageEditModeEnabled(localStorage.getItem(HOME_IMAGE_EDIT_MODE_KEY) === 'true');

    const session = getTeacherSession();
    if (session) {
      if (session.position === 'Admin') {
        window.location.replace('/admin');
        return;
      }

      setIsAuthenticated(true);
      setTeacherInfo({
        username: session.username,
        displayName: session.displayName,
        initials: session.initials,
        department: session.department,
        position: session.position || '',
        employeeId: session.employeeId,
      });
      setIsPortalLoading(true);
      window.setTimeout(() => {
        if (isCancelled) {
          return;
        }
        setIsPortalLoading(false);
        setIsBootLoading(false);
      }, APP_OPENING_LOADING_MS);
      return;
    }

    const hasSeenOnboarding = localStorage.getItem(TEACHER_PORTAL_ONBOARDING_KEY) === 'true';
    setShowOnboarding(isStandaloneDisplayMode() && !hasSeenOnboarding);

    window.setTimeout(() => {
      if (isCancelled) {
        return;
      }
      setIsBootLoading(false);
    }, APP_OPENING_LOADING_MS);

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (window.__mmpnsDeferredInstallPrompt) {
      setDeferredInstallPrompt(window.__mmpnsDeferredInstallPrompt);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installPromptEvent = event as BeforeInstallPromptEvent;
      window.__mmpnsDeferredInstallPrompt = installPromptEvent;
      setDeferredInstallPrompt(installPromptEvent);
      setInstallHint('');
    };

    const handleAppInstalled = () => {
      setIsInstalledAppContext(true);
      window.__mmpnsDeferredInstallPrompt = null;
      setDeferredInstallPrompt(null);
      setInstallHint('App installed. You can now open it from your home screen or app list.');
    };

    const mediaQueries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: window-controls-overlay)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
      window.matchMedia('(display-mode: browser)'),
    ];

    const handleDisplayModeChange = () => {
      setIsInstalledAppContext(isStandaloneDisplayMode());
    };

    handleDisplayModeChange();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQueries.forEach((query) => query.addEventListener('change', handleDisplayModeChange));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQueries.forEach((query) => query.removeEventListener('change', handleDisplayModeChange));
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    return subscribeSchoolCalendarEvents(setTeacherCalendarEvents);
  }, [isAuthenticated]);

  const completeOnboarding = () => {
    localStorage.setItem(TEACHER_PORTAL_ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const goToNextOnboardingSlide = () => {
    if (onboardingSlideIndex === MOBILE_ONBOARDING_SLIDES.length - 1) {
      completeOnboarding();
      return;
    }
    setOnboardingSlideIndex((current) => Math.min(current + 1, MOBILE_ONBOARDING_SLIDES.length - 1));
  };

  const goToPreviousOnboardingSlide = () => {
    setOnboardingSlideIndex((current) => Math.max(current - 1, 0));
  };

  const handleOnboardingTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    onboardingTouchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleOnboardingTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (onboardingTouchStartX.current === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? onboardingTouchStartX.current;
    const deltaX = touchEndX - onboardingTouchStartX.current;
    onboardingTouchStartX.current = null;

    if (Math.abs(deltaX) < 40) {
      return;
    }

    if (deltaX < 0) {
      goToNextOnboardingSlide();
      return;
    }

    goToPreviousOnboardingSlide();
  };

  const handleInstallApp = async () => {
    const installPromptEvent = deferredInstallPrompt || window.__mmpnsDeferredInstallPrompt || null;

    if (installPromptEvent) {
      setInstallHint('');
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      window.__mmpnsDeferredInstallPrompt = null;
      setDeferredInstallPrompt(null);

      if (choice.outcome === 'accepted') {
        setInstallHint('Installing app... If prompted, approve installation to continue.');
        return;
      }

      setInstallHint('Installation was dismissed. You can try again anytime.');
      return;
    }

    setInstallHint('Install prompt is not ready yet. Refresh once, then tap Download App again. If still unavailable, use browser menu: Install App / Add to Home Screen.');
  };

  const teacherUsername = useMemo(() => {
    const session = getTeacherSession();
    return session?.employeeId ? Object.keys(TEACHER_ASSIGNMENTS).find(k => {
      const parts = k.split('.'); return session.displayName?.toLowerCase().includes(parts[1]);
    }) : Object.keys(TEACHER_ASSIGNMENTS)[0];
  }, [isAuthenticated]);

  const assignments = useMemo(() => {
    if (!teacherUsername) return [];
    return TEACHER_ASSIGNMENTS[teacherUsername] || TEACHER_ASSIGNMENTS[Object.keys(TEACHER_ASSIGNMENTS)[0]] || [];
  }, [teacherUsername]);

  useEffect(() => {
    if (!selectedSubjectId || !selectedYearLevel) return;
    let isCancelled = false;

    const loadTeacherPortalData = async () => {
      const key = `${selectedSubjectId}-${selectedYearLevel}-q${selectedQuarter}`;
      const store = normalizeTeacherPortalStore(
        await readDatabaseOnline<TeacherPortalStore>(TEACHER_PORTAL_TABLE),
      );

      if (isCancelled) {
        return;
      }

      teacherPortalStoreRef.current = store;

      const studentsByYear = store.studentsByYear ?? {};
      const classes = store.classes ?? {};
      const classData = classes[key];

      const hasStudents = Array.isArray(studentsByYear[selectedYearLevel]);
      const hasActivities = Array.isArray(classData?.activities);
      const hasGrades = Array.isArray(classData?.grades);

      const nextStudents = hasStudents
        ? (studentsByYear[selectedYearLevel] as Student[])
        : generateStudents(selectedYearLevel);
      const nextActivities = hasActivities
        ? (classData?.activities as Activity[])
        : generateDefaultActivities(selectedSubjectId, selectedQuarter);
      const nextGrades = hasGrades
        ? (classData?.grades as Grade[])
        : generateMockGrades(nextStudents, nextActivities);

      if (isCancelled) {
        return;
      }

      setStudents(nextStudents);
      setActivities(nextActivities);
      setGrades(nextGrades);

      if (hasStudents && hasActivities && hasGrades) {
        return;
      }

      const seededStore: TeacherPortalStore = {
        ...store,
        studentsByYear: {
          ...studentsByYear,
          [selectedYearLevel]: nextStudents,
        },
        classes: {
          ...classes,
          [key]: {
            activities: nextActivities,
            grades: nextGrades,
          },
        },
      };

      teacherPortalStoreRef.current = seededStore;
      await writeDatabaseOnline(TEACHER_PORTAL_TABLE, seededStore);
    };

    void loadTeacherPortalData().catch((loadError) => {
      console.error('Failed to load teacher portal data:', loadError);
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedSubjectId, selectedYearLevel, selectedQuarter]);

  useEffect(() => {
    if (assignments.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(assignments[0].subjectId);
      setSelectedYearLevel(assignments[0].yearLevel);
    }
  }, [assignments]);

  const saveData = useCallback(() => {
    if (!selectedSubjectId || !selectedYearLevel) return;
    const key = `${selectedSubjectId}-${selectedYearLevel}-q${selectedQuarter}`;
    const store = normalizeTeacherPortalStore(teacherPortalStoreRef.current);

    const nextStore: TeacherPortalStore = {
      ...store,
      studentsByYear: {
        ...store.studentsByYear,
        [selectedYearLevel]: students,
      },
      classes: {
        ...store.classes,
        [key]: {
          activities,
          grades,
        },
      },
    };

    teacherPortalStoreRef.current = nextStore;
    void writeDatabaseOnline(TEACHER_PORTAL_TABLE, nextStore).catch((persistError) => {
      console.error('Failed to persist teacher portal data:', persistError);
    });
  }, [selectedSubjectId, selectedYearLevel, selectedQuarter, activities, grades, students]);

  useEffect(() => { saveData(); }, [activities, grades, students, saveData]);

  const currentSubject = SUBJECTS.find(s => s.id === selectedSubjectId);
  const currentQuarter = QUARTERS.find(q => q.id === selectedQuarter);

  // ── Auth handlers ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSigningIn) {
      return;
    }

    setIsSigningIn(true);
    setError('');

    await new Promise((resolve) => window.setTimeout(resolve, 650));

    const result = await authenticateTeacherOnline(username, password);
    if (result.success && result.teacher) {
      saveTeacherSession(result.teacher);

      if (result.teacher.position === 'Admin') {
        setIsSigningIn(false);
        window.location.assign('/admin');
        return;
      }

      setIsPortalLoading(true);
      setIsAuthenticated(true);
      setTeacherInfo({
        username: result.teacher.username,
        displayName: result.teacher.displayName,
        initials: result.teacher.initials,
        department: result.teacher.department,
        position: result.teacher.position,
        employeeId: result.teacher.employeeId,
      });
      window.setTimeout(() => {
        setIsPortalLoading(false);
      }, 700);
      setIsSigningIn(false);
    } else {
      setError(result.error || 'Invalid credentials.');
      setIsSigningIn(false);
    }
  };
  const handleLogout = () => {
    clearTeacherSession(); setIsAuthenticated(false); setTeacherInfo(null);
    setUsername(''); setPassword(''); setActiveSection('dashboard');
  };

  const handlePrincipalImageEditToggle = (checked: boolean) => {
    setHomeImageEditModeEnabled(checked);
    localStorage.setItem(HOME_IMAGE_EDIT_MODE_KEY, String(checked));
    if (checked) {
      window.location.assign('/');
    }
  };

  const openPrincipalImageEditor = () => {
    setHomeImageEditModeEnabled(true);
    localStorage.setItem(HOME_IMAGE_EDIT_MODE_KEY, 'true');
    window.location.assign('/');
  };

  const isPrincipal = teacherInfo?.position === 'Principal';
  const isAdminRole = teacherInfo?.position === 'Admin';
  const demoAccounts = getTeacherAccounts();

  // ── Data handlers ──
  const updateGrade = (studentId: string, activityId: string, score: number | null) => {
    setGrades(prev => {
      const idx = prev.findIndex(g => g.studentId === studentId && g.activityId === activityId);
      if (idx >= 0) { const u = [...prev]; u[idx] = { ...u[idx], score }; return u; }
      return [...prev, { studentId, activityId, score }];
    });
  };
  const addActivity = () => {
    if (!newActivityTitle.trim() || !selectedSubjectId) return;
    const id = `${selectedSubjectId}-q${selectedQuarter}-${newActivityType[0]}${Date.now()}`;
    const newAct: Activity = { id, subjectId: selectedSubjectId, quarterId: selectedQuarter, type: newActivityType, title: newActivityTitle.trim(), maxScore: newActivityMaxScore };
    setActivities(prev => [...prev, newAct]);
    setGrades(prev => [...prev, ...students.map(s => ({ studentId: s.id, activityId: id, score: null }))]);
    setNewActivityTitle(''); setNewActivityMaxScore(50); setShowAddActivity(false);
  };
  const removeActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
    setGrades(prev => prev.filter(g => g.activityId !== activityId));
  };
  const addStudent = () => {
    if (!newStudentName.trim() || !selectedYearLevel) return;
    const id = `${selectedYearLevel.replace(/\s/g, '')}-${Date.now()}`;
    const newStudent: Student = { id, name: newStudentName.trim(), gender: newStudentGender, yearLevel: selectedYearLevel };
    setStudents(prev => [...prev, newStudent]);
    setGrades(prev => [...prev, ...activities.map(a => ({ studentId: id, activityId: a.id, score: null }))]);
    setNewStudentName(''); setShowAddStudent(false);
  };

  // ── Multi-select helpers ──
  const toggleStudentSelect = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === sortedGrades.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(sortedGrades.map(g => g.student.id)));
    }
  };

  const openMobileStudentDetail = (studentId: string, source: 'grading' | 'students') => {
    setMobileDetailSource(source);
    setMobileDetailStudentId(studentId);
  };
  const applyBulkScore = () => {
    if (!bulkActivityId || bulkScore === '' || selectedStudentIds.size === 0) return;
    const act = activities.find(a => a.id === bulkActivityId);
    if (!act) return;
    const score = Math.min(Math.max(0, Number(bulkScore)), act.maxScore);
    selectedStudentIds.forEach(sid => updateGrade(sid, bulkActivityId, score));
    setBulkScore(''); setSelectedStudentIds(new Set());
  };

  // ── Edit activity helpers ──
  const startEditActivity = (act: Activity) => {
    setEditingActivityId(act.id);
    setEditActivityTitle(act.title);
    setEditActivityMaxScore(act.maxScore);
  };
  const saveEditActivity = () => {
    if (!editingActivityId || !editActivityTitle.trim()) return;
    setActivities(prev => prev.map(a =>
      a.id === editingActivityId ? { ...a, title: editActivityTitle.trim(), maxScore: editActivityMaxScore } : a
    ));
    setEditingActivityId(null);
  };
  const cancelEditActivity = () => { setEditingActivityId(null); };

  // ── Computed grades ──
  const computedGrades = useMemo(() => {
    if (!currentSubject) return [];
    return students.map(student => ({ student, ...computeStudentGrade(student.id, activities, grades, currentSubject.weights) }));
  }, [students, activities, grades, currentSubject]);

  const sortedGrades = useMemo(() => {
    let filtered = [...computedGrades];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => g.student.name.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      if (sortField === 'name') return sortAsc ? a.student.name.localeCompare(b.student.name) : b.student.name.localeCompare(a.student.name);
      return sortAsc ? a.transmutedGrade - b.transmutedGrade : b.transmutedGrade - a.transmutedGrade;
    });
    return filtered;
  }, [computedGrades, sortField, sortAsc, searchQuery]);

  const mobileDetailEntry = useMemo(
    () => computedGrades.find((entry) => entry.student.id === mobileDetailStudentId) || null,
    [computedGrades, mobileDetailStudentId],
  );

  const detailTabActivities = useMemo(
    () => (gradingTab === 'summary' ? [] : activities.filter((activity) => activity.type === gradingTab)),
    [activities, gradingTab],
  );

  const isCurrentQuarterLocked = Boolean(currentQuarter?.isLocked);

  useEffect(() => {
    setMobileDetailStudentId(null);
  }, [activeSection, gradingTab, selectedSubjectId, selectedYearLevel, selectedQuarter]);

  const analytics = useMemo(() => {
    if (computedGrades.length === 0) return null;
    const t = computedGrades.map(g => g.transmutedGrade);
    const avg = t.reduce((a, b) => a + b, 0) / t.length;
    return {
      avg, highest: Math.max(...t), lowest: Math.min(...t),
      passing: t.filter(g => g >= 75).length, failing: t.filter(g => g < 75).length,
      distribution: {
        '90-100': t.filter(g => g >= 90).length, '85-89': t.filter(g => g >= 85 && g < 90).length,
        '80-84': t.filter(g => g >= 80 && g < 85).length, '75-79': t.filter(g => g >= 75 && g < 80).length,
        'Below 75': t.filter(g => g < 75).length,
      },
      total: t.length,
    };
  }, [computedGrades]);

  const exportToCSV = () => {
    if (!currentSubject || computedGrades.length === 0) return;
    const ww = activities.filter(a => a.type === 'written');
    const pt = activities.filter(a => a.type === 'performance');
    const qa = activities.filter(a => a.type === 'quarterly');
    let csv = `Grading Sheet - ${currentSubject.name} - ${selectedYearLevel} - ${currentQuarter?.label}\n\n`;
    csv += `Student Name,`;
    ww.forEach(a => csv += `${a.title} (${a.maxScore}),`);
    csv += `WW Avg %,WW Weighted,`;
    pt.forEach(a => csv += `${a.title} (${a.maxScore}),`);
    csv += `PT Avg %,PT Weighted,`;
    qa.forEach(a => csv += `${a.title} (${a.maxScore}),`);
    csv += `QA Avg %,QA Weighted,Initial Grade,Transmuted Grade,Remarks\n`;
    sortedGrades.forEach(({ student, initialGrade, transmutedGrade, breakdown }) => {
      csv += `"${student.name}",`;
      ww.forEach(a => { const g = grades.find(g => g.studentId === student.id && g.activityId === a.id); csv += `${g?.score ?? ''},`; });
      csv += `${breakdown.written.avgPS.toFixed(2)},${breakdown.written.weighted.toFixed(2)},`;
      pt.forEach(a => { const g = grades.find(g => g.studentId === student.id && g.activityId === a.id); csv += `${g?.score ?? ''},`; });
      csv += `${breakdown.performance.avgPS.toFixed(2)},${breakdown.performance.weighted.toFixed(2)},`;
      qa.forEach(a => { const g = grades.find(g => g.studentId === student.id && g.activityId === a.id); csv += `${g?.score ?? ''},`; });
      csv += `${breakdown.quarterly.avgPS.toFixed(2)},${breakdown.quarterly.weighted.toFixed(2)},`;
      csv += `${initialGrade.toFixed(2)},${transmutedGrade},${transmutedGrade >= 75 ? 'Passed' : 'Failed'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `GradingSheet_${currentSubject.name}_${selectedYearLevel}_Q${selectedQuarter}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Nav items ──
  const sidebarItems = isPrincipal ? [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'teachers', label: 'Teachers', icon: UserCheck },
    { id: 'registration', label: 'Students', icon: Users },
    { id: 'evaluation', label: 'Evaluation', icon: ClipboardList },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'academics', label: 'Academics', icon: Target },
    { id: 'yearly-rollover', label: 'SY Rollover', icon: RefreshCw },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] : isAdminRole ? [
    { id: 'dashboard', label: 'Admin Dashboard', icon: Shield },
    { id: 'settings', label: 'Portal Settings', icon: Settings },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'grading', label: 'Grade Book', icon: Calculator },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'evaluation', label: 'Evaluation', icon: ClipboardList },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const bottomNavItems = isPrincipal ? [
    { id: 'dashboard', label: 'Home', icon: LayoutGrid },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'teachers', label: 'Teachers', icon: UserCheck },
    { id: 'registration', label: 'Students', icon: Users },
  ] : isAdminRole ? [
    { id: 'dashboard', label: 'Admin', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] : [
    { id: 'dashboard', label: 'Home', icon: LayoutGrid },
    { id: 'grading', label: 'Grades', icon: Calculator },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
  ];
  const moreMenuItems = isPrincipal ? [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'evaluation', label: 'Teacher Evaluation', icon: ClipboardList },
    { id: 'academics', label: 'Academics & Analytics', icon: Target },
    { id: 'yearly-rollover', label: 'SY Rollover', icon: RefreshCw },
    { id: 'settings', label: 'School Settings', icon: Settings },
  ] : isAdminRole ? [
    { id: 'settings', label: 'Portal Settings', icon: Settings },
  ] : [
    { id: 'calendar', label: 'My Calendar', icon: Calendar },
    { id: 'evaluation', label: 'My Evaluation', icon: ClipboardList },
    { id: 'settings', label: 'Quarter Settings', icon: Settings },
  ];
  const isInMoreMenu = moreMenuItems.some(item => item.id === activeSection);

  if (isBootLoading || isSigningIn || (isAuthenticated && isPortalLoading)) {
    const loadingTitle = isSigningIn
      ? 'Signing In'
      : isAuthenticated
        ? 'Loading Teacher Portal'
        : 'Preparing Portal';
    const loadingSubtitle = isSigningIn
      ? 'Verifying your account and permissions...'
      : isAuthenticated
        ? 'Setting up your dashboard and classes...'
        : 'Syncing school data and getting things ready...';

    return (
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#124217] via-[#185C20] to-[#1e6a28] flex items-center justify-center px-6">
        <div className="absolute top-[-15%] right-[-10%] w-[440px] h-[440px] rounded-full bg-[#EDCD1F]/12 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[-8%] w-[420px] h-[420px] rounded-full bg-white/[0.06] blur-3xl" />

        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/icons/icon-512-maskable.png?v=20260407g"
              alt="MMPNS logo"
              className="w-18 h-18 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
              loading="eager"
            />
            <div>
              <p className="text-white font-serif text-[1.35rem] font-bold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">Madre Maria Pia Notari School</p>
              <p className="text-white/85 font-sans text-[11px] uppercase tracking-[0.22em] font-semibold mt-2">Teacher Portal</p>
            </div>
          </div>

          <div className="mt-9 bg-white/8 border border-white/15 rounded-2xl px-6 py-5 backdrop-blur-md">
            <p className="text-[#EDCD1F] text-sm font-bold tracking-wide">{loadingTitle}</p>
            <p className="text-white/85 text-xs leading-relaxed mt-2">{loadingSubtitle}</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EDCD1F] animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-[#EDCD1F]/80 animate-pulse [animation-delay:120ms]" />
              <span className="w-2 h-2 rounded-full bg-[#EDCD1F]/60 animate-pulse [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     LOGIN SCREEN
     ═══════════════════════════════════════════════════════ */
  if (!isAuthenticated) {
    const activeOnboardingSlide = MOBILE_ONBOARDING_SLIDES[onboardingSlideIndex];

    if (showOnboarding) {
      return (
        <div
          className="fixed inset-0 bg-black overflow-hidden flex flex-col"
          onTouchStart={handleOnboardingTouchStart}
          onTouchEnd={handleOnboardingTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeOnboardingSlide.image}
              src={activeOnboardingSlide.image}
              alt={activeOnboardingSlide.title}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />

          {/* Top Header with Logo */}
          <div className="relative z-10 w-full pt-10 px-7 sm:px-8 flex items-center gap-3">
            <div className="p-0.5">
              <img
                src="/icons/icon-512-maskable.png?v=20260407g"
                alt="MMPNS logo"
                className="w-11 h-11 object-contain drop-shadow-[0_5px_16px_rgba(0,0,0,0.5)]"
                loading="eager"
              />
            </div>
            <div className="flex flex-col drop-shadow-md">
              <span className="text-white font-serif text-[1.35rem] font-bold leading-none tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">MMPNS</span>
              <span className="text-white/90 text-[10px] font-sans uppercase tracking-[0.2em] font-bold mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Mobile Portal</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="relative z-10 w-full flex-1 flex flex-col px-7 sm:px-8 pb-11 sm:pb-12">
            <div className="flex-1 flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingSlideIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="max-w-[350px]"
                >
                  <h1 className="text-white font-serif text-[2.25rem] md:text-5xl font-bold leading-[1.16] mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    {activeOnboardingSlide.title}
                  </h1>
                  <p className="text-white/92 font-sans text-[1.02rem] max-w-[340px] leading-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    {activeOnboardingSlide.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-2">
                {MOBILE_ONBOARDING_SLIDES.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setOnboardingSlideIndex(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === onboardingSlideIndex ? 'w-8 bg-[#EDCD1F]' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Show slide ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                {onboardingSlideIndex > 0 && (
                  <button
                    type="button"
                    onClick={goToPreviousOnboardingSlide}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all font-sans"
                  >
                    <ChevronRight size={20} className="rotate-180" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={goToNextOnboardingSlide}
                  className="px-6 h-12 flex items-center justify-center rounded-full bg-[#EDCD1F] text-[#185C20] font-sans font-bold tracking-wide hover:bg-[#f0d84f] transition-all shadow-[0_0_20px_rgba(237,205,31,0.3)]"
                >
                  {onboardingSlideIndex === MOBILE_ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 overflow-hidden overscroll-none bg-gradient-to-br from-[#185C20] via-[#1a6925] to-[#0f4517] flex items-center justify-center p-4 md:p-6">
        {/* Decorative circles */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#EDCD1F]/5 pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.02] pointer-events-none" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[420px]">

          {/* Card */}
          <div className="bg-white rounded-[28px] shadow-2xl shadow-black/30 overflow-hidden">
            {/* Top accent */}
            <div className="h-1.5 bg-gradient-to-r from-[#EDCD1F] via-[#f0d84f] to-[#EDCD1F]" />

            <div className="p-7 pt-8">
              {/* Logo */}
              <div className="flex flex-col items-center mb-7">
                <div className="w-14 h-14 rounded-2xl bg-[#185C20] flex items-center justify-center mb-3 shadow-lg shadow-[#185C20]/30">
                  <GraduationCap size={28} className="text-[#EDCD1F]" />
                </div>
                <h1 className="font-serif text-[#185C20] text-xl">Teacher's Portal</h1>
                <p className="text-xs text-gray-400 mt-1">Grading Management System</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-[#185C20]/40 focus:ring-2 focus:ring-[#185C20]/10 transition-all"
                    placeholder="Enter your username" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-4 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-[#185C20]/40 focus:ring-2 focus:ring-[#185C20]/10 transition-all"
                      placeholder="Enter your password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                      <AlertTriangle size={14} className="flex-shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit"
                  className="w-full h-11 bg-[#185C20] text-white rounded-xl font-bold text-sm hover:bg-[#1a6925] active:scale-[0.98] transition-all shadow-lg shadow-[#185C20]/20">
                  Sign In
                </button>

                {!isInstalledAppContext && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.location.href = '/'}
                      className="w-full h-11 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center"
                    >
                      Back to Site
                    </button>
                    <button
                      type="button"
                      onClick={handleInstallApp}
                      className="w-full h-11 border border-[#185C20]/20 text-[#185C20] rounded-xl font-bold text-sm hover:bg-[#185C20]/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={15} />
                      Download App
                    </button>
                  </div>
                )}
              </form>

              {installHint && (
                <p className="mt-3 text-[11px] text-gray-500 text-center leading-relaxed">{installHint}</p>
              )}

              {/* Demo credentials */}
              <div className="mt-5">
                <button type="button" onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="w-full flex items-center justify-center gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-wider hover:text-[#185C20] transition-colors py-2">
                  <Sparkles size={12} />
                  {showDemoAccounts ? 'Hide' : 'Show'} Demo Credentials
                  <ChevronDown size={12} className={`transition-transform ${showDemoAccounts ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showDemoAccounts && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <div className="pt-2 space-y-1.5">
                        {demoAccounts.map((acc, idx) => (
                          <button key={idx} type="button"
                            onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all text-left group ${
                              acc.position === 'Principal' || acc.position === 'Admin'
                                ? 'bg-[#EDCD1F]/10 hover:bg-[#EDCD1F]/20 hover:border-[#EDCD1F]/30'
                                : 'bg-gray-50 hover:bg-[#185C20]/5 hover:border-[#185C20]/10'
                            }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              acc.position === 'Principal' || acc.position === 'Admin'
                                ? 'bg-[#EDCD1F]/20 group-hover:bg-[#EDCD1F]'
                                : 'bg-[#185C20]/10 group-hover:bg-[#185C20]'
                            }`}>
                              {acc.position === 'Principal' || acc.position === 'Admin'
                                ? <Shield size={14} className="text-[#185C20] group-hover:text-[#185C20]" />
                                : <span className="text-[10px] font-bold text-[#185C20] group-hover:text-[#EDCD1F] transition-colors">
                                    {acc.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </span>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-700 truncate">{acc.displayName}</p>
                              <p className="text-[10px] text-gray-400">
                                {acc.position === 'Principal'
                                  ? 'School Principal'
                                  : acc.position === 'Admin'
                                    ? 'Portal Administrator'
                                    : `${acc.department} Dept.`}
                              </p>
                            </div>
                            {(acc.position === 'Principal' || acc.position === 'Admin') && (
                              <span className="text-[9px] font-bold bg-[#EDCD1F] text-[#185C20] px-1.5 py-0.5 rounded-full">
                                {acc.position.toUpperCase()}
                              </span>
                            )}
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-[#185C20] transition-colors" />
                          </button>
                        ))}
                        <p className="text-[10px] text-gray-400 text-center pt-1">
                          Click any account to auto-fill credentials
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SECTION: DASHBOARD
     ═══════════════════════════════════════════════════════ */
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* ─── Unified top card: Hero + Stats ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Hero banner */}
        <div className="relative bg-[#185C20] p-5 lg:p-7 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-60 h-60 bg-[#EDCD1F] rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-white rounded-full translate-y-1/2" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8">
            <div className="flex-1">
              <p className="text-[#EDCD1F] text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] mb-0.5">SY 2025–2026 &bull; {currentQuarter?.label}</p>
              <h2 className="text-lg lg:text-2xl font-bold">Hello, {teacherInfo?.displayName?.split(',')[0] || 'Teacher'}!</h2>
              <p className="text-white/60 text-xs lg:text-sm mt-0.5">You have {assignments.length} assigned classes this quarter.</p>
            </div>
            <button onClick={() => setActiveSection('grading')}
              className="self-start lg:self-center flex items-center gap-2 bg-[#EDCD1F] text-[#185C20] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#f0d84f] transition-colors shadow-lg shadow-black/20">
              <Calculator size={16} /> Open Grade Book
            </button>
          </div>
        </div>
        {/* Stats row — inline inside the same card */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
          {[
            { val: String(assignments.length), lbl: 'My Classes', icon: BookOpen, accent: '#3b82f6' },
            { val: String(students.length), lbl: 'Students', icon: Users, accent: '#10b981' },
            { val: analytics ? `${analytics.passing}/${analytics.total}` : '--', lbl: 'Passing', icon: CheckCircle2, accent: '#EDCD1F' },
            { val: analytics ? analytics.avg.toFixed(1) : '--', lbl: 'Class Avg', icon: TrendingUp, accent: '#8b5cf6' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 lg:py-4 first:border-l-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.accent + '14' }}>
                  <Icon size={16} style={{ color: s.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg lg:text-xl font-bold text-gray-900 tabular-nums">{s.val}</p>
                  <p className="text-[10px] text-gray-400 -mt-0.5">{s.lbl}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Unified content card: Classes + Quarters ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Classes section */}
        <div className="p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">My Classes</h3>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{assignments.length} assigned</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {assignments.map((a, i) => {
              const sub = SUBJECTS.find(s => s.id === a.subjectId);
              const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
              const c = colors[i % colors.length];
              return (
                <button key={i} onClick={() => { setSelectedSubjectId(a.subjectId); setSelectedYearLevel(a.yearLevel); setActiveSection('grading'); }}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 border border-transparent hover:border-gray-200 transition-all text-left">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c + '18' }}>
                    <BookOpen size={16} style={{ color: c }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-gray-800 truncate group-hover:text-[#185C20] transition-colors">{sub?.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400">{a.yearLevel}</span>
                      <span className="text-gray-200">&middot;</span>
                      <span className="text-[10px] text-gray-300">WW {sub?.weights.written} &middot; PT {sub?.weights.performance} &middot; QA {sub?.weights.quarterly}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#185C20] flex-shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Quarters section */}
        <div className="p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">Quarters</h3>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">SY 2025–2026</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {QUARTERS.map(q => (
              <button key={q.id} onClick={() => setSelectedQuarter(q.id)}
                className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                  selectedQuarter === q.id
                    ? 'border-[#EDCD1F] bg-[#EDCD1F]/5'
                    : q.isLocked
                      ? 'border-gray-100 bg-gray-50/50 opacity-60'
                      : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50'
                }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">Q{q.id}</span>
                  {q.isLocked
                    ? <Lock size={11} className="text-gray-400" />
                    : <CheckCircle2 size={11} className="text-emerald-500" />
                  }
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">
                  {new Date(q.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – {new Date(q.endDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
                <span className={`inline-block mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  q.isLocked ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {q.isLocked ? 'Locked' : 'Open'}
                </span>
                {selectedQuarter === q.id && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#EDCD1F]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     SECTION: GRADING
     ═══════════════════════════════════════════════════════ */
  const renderGrading = () => {
    const writtenActs = activities.filter(a => a.type === 'written');
    const perfActs = activities.filter(a => a.type === 'performance');
    const qaActs = activities.filter(a => a.type === 'quarterly');
    const isLocked = currentQuarter?.isLocked || false;

    const tabActivities = gradingTab === 'written' ? writtenActs : gradingTab === 'performance' ? perfActs : gradingTab === 'quarterly' ? qaActs : [];
    const hasSelection = selectedStudentIds.size > 0;
    const allSelected = sortedGrades.length > 0 && selectedStudentIds.size === sortedGrades.length;
    const someSelected = selectedStudentIds.size > 0 && selectedStudentIds.size < sortedGrades.length;

    return (
      <div className="space-y-4">
        {/* Sticky class selector bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Class & Quarter selectors */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <select value={`${selectedSubjectId}|${selectedYearLevel}`}
                onChange={(e) => { const [s, y] = e.target.value.split('|'); setSelectedSubjectId(s); setSelectedYearLevel(y); }}
                className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/30 transition-all">
                {assignments.map((a, i) => { const sub = SUBJECTS.find(s => s.id === a.subjectId); return <option key={i} value={`${a.subjectId}|${a.yearLevel}`}>{sub?.name} — {a.yearLevel}</option>; })}
              </select>
              <div className="flex bg-gray-100 rounded-xl p-0.5">
                {QUARTERS.map(q => (
                  <button key={q.id} onClick={() => setSelectedQuarter(q.id)}
                    className={`px-3 h-8 rounded-lg text-[11px] font-bold transition-all ${
                      selectedQuarter === q.id ? 'bg-white text-[#185C20] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    Q{q.id} {q.isLocked && <Lock size={8} className="inline ml-0.5 -mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isLocked && gradingTab !== 'summary' && (
                <button onClick={() => { setEditMode(!editMode); setEditingActivityId(null); }}
                  className={`h-9 flex items-center gap-1.5 px-3 rounded-xl text-[11px] font-bold transition-all ${
                    editMode ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {editMode ? <><PencilOff size={14} /> Done Editing</> : <><Pencil size={14} /> Edit Activities</>}
                </button>
              )}
              <button onClick={exportToCSV}
                className="h-9 flex items-center gap-1.5 px-3 bg-gray-100 text-gray-600 rounded-xl text-[11px] font-bold hover:bg-gray-200 transition-colors">
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* Lock banner */}
          {isLocked && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700 font-semibold">
              <Lock size={13} /> Quarter is locked — grades are read-only.
            </div>
          )}

          {/* Weight reference */}
          {currentSubject && (
            <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-400">
              <span className="font-bold text-gray-500">{currentSubject.name}</span>
              <span className="w-px h-3 bg-gray-200" />
              <span>Written {currentSubject.weights.written}%</span>
              <span>Performance {currentSubject.weights.performance}%</span>
              <span>Quarterly {currentSubject.weights.quarterly}%</span>
            </div>
          )}
        </div>

        {/* Add Activity form — shown when edit mode is on and user clicks Add */}
        <AnimatePresence>
          {showAddActivity && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="bg-white rounded-2xl border-2 border-dashed border-[#185C20]/20 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800">New Activity</h4>
                  <button onClick={() => setShowAddActivity(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={newActivityType} onChange={(e) => setNewActivityType(e.target.value as any)}
                    className="h-10 px-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
                    <option value="written">Written Work</option>
                    <option value="performance">Performance Task</option>
                    <option value="quarterly">Quarterly Assessment</option>
                  </select>
                  <input value={newActivityTitle} onChange={(e) => setNewActivityTitle(e.target.value)}
                    placeholder="Title (e.g. Quiz 4)" className="h-10 px-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15" />
                  <div className="flex gap-2">
                    <input type="number" value={newActivityMaxScore} onChange={(e) => setNewActivityMaxScore(Number(e.target.value))}
                      placeholder="Max" min={1} className="h-10 px-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 w-24" />
                    <button onClick={addActivity}
                      className="h-10 px-5 bg-[#185C20] text-white rounded-xl text-sm font-bold hover:bg-[#1a6925] transition-colors flex-shrink-0">Add</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk action bar — visible when students are selected on a component tab */}
        <AnimatePresence>
          {hasSelection && gradingTab !== 'summary' && !isLocked && (
            <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }}
              className="overflow-hidden">
              <div className="bg-[#185C20] rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-lg shadow-[#185C20]/15">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-[#EDCD1F] flex items-center justify-center">
                    <SquareCheck size={14} className="text-[#185C20]" />
                  </div>
                  <span className="text-white text-xs font-bold">{selectedStudentIds.size} student{selectedStudentIds.size > 1 ? 's' : ''} selected</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <select value={bulkActivityId} onChange={(e) => setBulkActivityId(e.target.value)}
                    className="h-8 px-2.5 bg-white/10 border border-white/20 rounded-lg text-[11px] text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/40 [&>option]:text-gray-800">
                    <option value="">Select column...</option>
                    {tabActivities.map(act => (
                      <option key={act.id} value={act.id}>
                        {act.title} (/{act.maxScore})
                      </option>
                    ))}
                  </select>
                  <input type="number" value={bulkScore} onChange={(e) => setBulkScore(e.target.value)}
                    placeholder="Score" min={0}
                    className="h-8 w-20 px-2.5 bg-white/10 border border-white/20 rounded-lg text-[11px] text-white font-semibold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/40 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <button onClick={applyBulkScore} disabled={!bulkActivityId || bulkScore === ''}
                    className="h-8 px-3.5 bg-[#EDCD1F] text-[#185C20] rounded-lg text-[11px] font-bold hover:bg-[#f0d84f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                    <Check size={12} /> Apply
                  </button>
                </div>
                <button onClick={() => setSelectedStudentIds(new Set())}
                  className="h-8 px-2.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px]">
                  <X size={12} /> Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grading tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 p-1 gap-1">
            {[
              { key: 'summary', label: 'Summary', count: students.length },
              { key: 'written', label: 'Written Works', count: writtenActs.length },
              { key: 'performance', label: 'Performance Tasks', count: perfActs.length },
              { key: 'quarterly', label: 'Quarterly Exam', count: qaActs.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => { setGradingTab(tab.key as any); setSelectedStudentIds(new Set()); setEditMode(false); setEditingActivityId(null); }}
                className={`relative flex items-center justify-between gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  gradingTab === tab.key ? 'text-[#185C20] bg-[#185C20]/5 border border-[#185C20]/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${gradingTab === tab.key ? 'bg-[#185C20] text-white' : 'bg-gray-100 text-gray-400'}`}>{tab.count}</span>
                {gradingTab === tab.key && <motion.div layoutId="grading-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#185C20] rounded-full" />}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student..." className="w-full h-8 pl-8 pr-3 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/30 transition-all" />
            </div>
            <button onClick={() => { setSortField(sortField === 'name' ? 'grade' : 'name'); setSortAsc(!sortAsc); }}
              className="h-8 flex items-center gap-1 px-2.5 bg-gray-50 border border-gray-100 rounded-lg text-[11px] text-gray-500 hover:bg-gray-100 transition-colors font-semibold">
              <ArrowUpDown size={12} /> {sortField === 'name' ? 'A-Z' : 'Grade'}
            </button>
          </div>

          {/* SUMMARY TAB */}
          {gradingTab === 'summary' && (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/80 z-10 min-w-[180px]">#  Student</th>
                      <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">WW<br/><span className="text-gray-300 font-normal normal-case">({currentSubject?.weights.written}%)</span></th>
                      <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">PT<br/><span className="text-gray-300 font-normal normal-case">({currentSubject?.weights.performance}%)</span></th>
                      <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">QA<br/><span className="text-gray-300 font-normal normal-case">({currentSubject?.weights.quarterly}%)</span></th>
                      <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Initial</th>
                      <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Final</th>
                      <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGrades.map(({ student, initialGrade, transmutedGrade, breakdown }, idx) => (
                      <tr key={student.id} className="border-t border-gray-50 hover:bg-[#185C20]/[0.02] transition-colors">
                        <td className="py-2.5 px-4 sticky left-0 bg-white z-10 min-w-[180px]">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-gray-300 w-4 text-right tabular-nums">{idx + 1}</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${student.gender === 'M' ? 'bg-sky-50 text-sky-500' : 'bg-pink-50 text-pink-500'}`}>
                              {student.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-700 truncate">{student.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-2.5 px-3 text-gray-500 tabular-nums">{breakdown.written.weighted.toFixed(1)}</td>
                        <td className="text-center py-2.5 px-3 text-gray-500 tabular-nums">{breakdown.performance.weighted.toFixed(1)}</td>
                        <td className="text-center py-2.5 px-3 text-gray-500 tabular-nums">{breakdown.quarterly.weighted.toFixed(1)}</td>
                        <td className="text-center py-2.5 px-3 text-gray-600 font-semibold tabular-nums">{initialGrade.toFixed(1)}</td>
                        <td className="text-center py-2.5 px-3">
                          <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg font-bold ${gradePill(transmutedGrade)} tabular-nums`}>{transmutedGrade}</span>
                        </td>
                        <td className="text-center py-2.5 px-3">
                          <span className={`text-[10px] font-bold ${transmutedGrade >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {transmutedGrade >= 75 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
                {sortedGrades.map(({ student, transmutedGrade }) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => openMobileStudentDetail(student.id, 'grading')}
                    className="w-full text-left px-4 py-3 active:bg-[#185C20]/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{student.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Tap to view breakdown</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center min-w-[42px] h-7 px-2 rounded-lg text-xs font-bold ${gradePill(transmutedGrade)} tabular-nums`}>
                          {transmutedGrade}
                        </span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {students.length === 0 && (
                <div className="py-16 text-center text-gray-300">
                  <Users size={36} className="mx-auto mb-2" /><p className="text-sm font-bold">No students</p>
                </div>
              )}
            </>
          )}

          {/* COMPONENT TAB (Written / Performance / Quarterly) */}
          {gradingTab !== 'summary' && (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/80">
                    {/* Checkbox header — only on component tabs when not locked */}
                    {!isLocked && (
                      <th className="py-2.5 px-2 w-8 sticky left-0 bg-gray-50/80 z-10">
                        <button onClick={toggleSelectAll} className="flex items-center justify-center w-full text-gray-400 hover:text-[#185C20] transition-colors">
                          {allSelected ? <SquareCheck size={16} className="text-[#185C20]" /> : someSelected ? <MinusSquare size={16} className="text-[#185C20]" /> : <Square size={16} />}
                        </button>
                      </th>
                    )}
                    <th className={`text-left py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider ${isLocked ? 'sticky left-0' : ''} bg-gray-50/80 z-10 min-w-[160px]`}>Student</th>
                    {tabActivities.map(act => {
                      const isEditing = editingActivityId === act.id;
                      return (
                        <th key={act.id} className="text-center py-2 px-2 min-w-[70px]">
                          {isEditing ? (
                            /* Inline editing for activity title & max score */
                            <div className="flex flex-col items-center gap-1">
                              <input value={editActivityTitle} onChange={(e) => setEditActivityTitle(e.target.value)}
                                className="w-[72px] text-center text-[10px] font-bold bg-white border border-[#185C20]/30 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#185C20]/30" autoFocus />
                              <div className="flex items-center gap-0.5">
                                <span className="text-[9px] text-gray-300">/</span>
                                <input type="number" value={editActivityMaxScore} onChange={(e) => setEditActivityMaxScore(Number(e.target.value))}
                                  className="w-10 text-center text-[9px] bg-white border border-[#185C20]/30 rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#185C20]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" min={1} />
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <button onClick={saveEditActivity} className="text-emerald-500 hover:text-emerald-600 transition-colors" title="Save"><Check size={11} /></button>
                                <button onClick={cancelEditActivity} className="text-gray-400 hover:text-gray-600 transition-colors" title="Cancel"><X size={11} /></button>
                              </div>
                            </div>
                          ) : (
                            /* Normal column header */
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-gray-500 truncate max-w-[60px]" title={act.title}>
                                {act.title.replace('Written Work ', 'WW ').replace('Performance Task ', 'PT ').replace('Quarterly Assessment', 'QA')}
                              </span>
                              <span className="text-[9px] text-gray-300">/{act.maxScore}</span>
                              {/* Edit mode icons: edit + delete */}
                              {editMode && !isLocked && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <button onClick={() => startEditActivity(act)} className="text-gray-300 hover:text-amber-500 transition-colors" title="Edit activity">
                                    <Pencil size={10} />
                                  </button>
                                  <button onClick={() => removeActivity(act.id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete activity">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                    {/* Add column button in edit mode */}
                    {editMode && !isLocked && (
                      <th className="py-2 px-2 min-w-[50px]">
                        <button onClick={() => setShowAddActivity(true)}
                          className="w-full flex flex-col items-center gap-0.5 text-gray-300 hover:text-[#185C20] transition-colors group" title="Add activity">
                          <div className="w-7 h-7 rounded-lg border-2 border-dashed border-gray-200 group-hover:border-[#185C20]/30 flex items-center justify-center transition-colors">
                            <Plus size={12} />
                          </div>
                          <span className="text-[9px] font-bold">Add</span>
                        </button>
                      </th>
                    )}
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Avg %</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGrades.map(({ student, breakdown }, idx) => {
                    const bd = breakdown[gradingTab] || { avgPS: 0, weighted: 0 };
                    const isSelected = selectedStudentIds.has(student.id);
                    return (
                      <tr key={student.id} className={`border-t transition-colors ${
                        isSelected ? 'bg-[#185C20]/[0.04] border-[#185C20]/10' : 'border-gray-50 hover:bg-[#185C20]/[0.02]'
                      }`}>
                        {/* Checkbox */}
                        {!isLocked && (
                          <td className={`py-2 px-2 w-8 sticky left-0 z-10 ${isSelected ? 'bg-[#185C20]/[0.04]' : 'bg-white'}`}>
                            <button onClick={() => toggleStudentSelect(student.id)} className="flex items-center justify-center w-full">
                              {isSelected
                                ? <SquareCheck size={15} className="text-[#185C20]" />
                                : <Square size={15} className="text-gray-300 hover:text-gray-400 transition-colors" />
                              }
                            </button>
                          </td>
                        )}
                        <td className={`py-2 px-3 ${isLocked ? 'sticky left-0' : ''} z-10 min-w-[160px] ${isSelected ? 'bg-[#185C20]/[0.04]' : 'bg-white'}`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-gray-300 w-4 text-right tabular-nums">{idx + 1}</span>
                            <span className="font-semibold text-gray-700 truncate">{student.name}</span>
                          </div>
                        </td>
                        {tabActivities.map(act => {
                          const g = grades.find(g => g.studentId === student.id && g.activityId === act.id);
                          return (
                            <td key={act.id} className="text-center px-1 py-1">
                              <input type="number" value={g?.score ?? ''} disabled={isLocked}
                                onChange={(e) => updateGrade(student.id, act.id, e.target.value === '' ? null : Math.min(Number(e.target.value), act.maxScore))}
                                min={0} max={act.maxScore}
                                className={`w-full text-center text-xs py-1.5 rounded-lg border focus:border-[#185C20]/30 focus:bg-[#185C20]/[0.03] focus:outline-none disabled:text-gray-400 disabled:hover:border-transparent tabular-nums transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  isSelected ? 'bg-transparent border-[#185C20]/10 hover:border-[#185C20]/20' : 'bg-transparent border-transparent hover:border-gray-200'
                                }`} />
                            </td>
                          );
                        })}
                        {editMode && !isLocked && <td />}
                        <td className="text-center py-2 px-3 text-gray-500 font-semibold tabular-nums bg-gray-50/40">{bd.avgPS.toFixed(1)}</td>
                        <td className="text-center py-2 px-3 font-bold text-[#185C20] tabular-nums bg-gray-50/40">{bd.weighted.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
                {sortedGrades.map(({ student, breakdown }) => {
                  const bd = breakdown[gradingTab] || { avgPS: 0, weighted: 0 };
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => openMobileStudentDetail(student.id, 'grading')}
                      className="w-full text-left px-4 py-3 active:bg-[#185C20]/[0.03]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate">{student.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Avg {bd.avgPS.toFixed(1)}%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#185C20] tabular-nums">{bd.weighted.toFixed(2)}</span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {tabActivities.length === 0 && !editMode && (
                <div className="py-12 text-center text-gray-300">
                  <Plus size={28} className="mx-auto mb-2" />
                  <p className="text-sm font-bold">No activities yet</p>
                  <p className="text-[11px] mt-1">Turn on "Edit Activities" to add one.</p>
                </div>
              )}
              {tabActivities.length === 0 && editMode && (
                <div className="py-12 text-center text-gray-300">
                  <Plus size={28} className="mx-auto mb-2" />
                  <p className="text-sm font-bold">No activities yet</p>
                  <button onClick={() => setShowAddActivity(true)} className="mt-2 text-xs font-bold text-[#185C20] hover:underline">+ Add your first activity</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     SECTION: STUDENTS
     ═══════════════════════════════════════════════════════ */
  const renderStudents = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">Student Roster</h3>
            <p className="text-[11px] text-gray-400">{selectedYearLevel} &bull; {students.length} enrolled</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={`${selectedSubjectId}|${selectedYearLevel}`}
              onChange={(e) => { const [s, y] = e.target.value.split('|'); setSelectedSubjectId(s); setSelectedYearLevel(y); }}
              className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 transition-all">
              {assignments.map((a, i) => { const sub = SUBJECTS.find(s => s.id === a.subjectId); return <option key={i} value={`${a.subjectId}|${a.yearLevel}`}>{sub?.name} — {a.yearLevel}</option>; })}
            </select>
            <button onClick={() => setShowAddStudent(true)}
              className="h-9 flex items-center gap-1.5 px-3 bg-[#185C20] text-white rounded-xl text-[11px] font-bold hover:bg-[#1a6925] transition-colors">
              <UserPlus size={14} /> Add Student
            </button>
          </div>
        </div>

        {/* Add student form */}
        <AnimatePresence>
          {showAddStudent && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="px-4 py-3 bg-[#185C20]/[0.03] border-b border-gray-100 flex flex-wrap items-center gap-3">
                <input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Full Name (Last, First M.)" className="h-9 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 flex-1 min-w-[200px]" />
                <select value={newStudentGender} onChange={(e) => setNewStudentGender(e.target.value as 'M' | 'F')}
                  className="h-9 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
                  <option value="M">Male</option><option value="F">Female</option>
                </select>
                <button onClick={addStudent} className="h-9 px-4 bg-[#185C20] text-white rounded-xl text-xs font-bold hover:bg-[#1a6925]">Add</button>
                <button onClick={() => setShowAddStudent(false)} className="h-9 px-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-200">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">#</th>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">ID</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Level</th>
                <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.sort((a, b) => a.name.localeCompare(b.name)).map((student, idx) => {
                const computed = computedGrades.find(g => g.student.id === student.id);
                return (
                  <tr key={student.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-gray-300 tabular-nums">{idx + 1}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${student.gender === 'M' ? 'bg-sky-50 text-sky-500' : 'bg-pink-50 text-pink-500'}`}>
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-700">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 font-mono hidden sm:table-cell">{student.id}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold ${student.gender === 'M' ? 'text-sky-500' : 'text-pink-500'}`}>
                        {student.gender === 'M' ? 'M' : 'F'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-500">{student.yearLevel}</td>
                    <td className="py-2.5 px-3 text-center">
                      {computed && (
                        <span className={`inline-flex items-center justify-center w-9 h-6 rounded-md text-[10px] font-bold ${gradePill(computed.transmutedGrade)} tabular-nums`}>
                          {computed.transmutedGrade}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {students.sort((a, b) => a.name.localeCompare(b.name)).map((student) => {
            const computed = computedGrades.find(g => g.student.id === student.id);
            return (
              <button
                key={student.id}
                type="button"
                onClick={() => openMobileStudentDetail(student.id, 'students')}
                className="w-full text-left px-4 py-3 active:bg-[#185C20]/[0.03]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{student.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{student.id} • {student.yearLevel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {computed && (
                      <span className={`inline-flex items-center justify-center min-w-[42px] h-7 px-2 rounded-lg text-xs font-bold ${gradePill(computed.transmutedGrade)} tabular-nums`}>
                        {computed.transmutedGrade}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     SECTION: ANALYTICS
     ═══════════════════════════════════════════════════════ */
  const renderAnalytics = () => {
    if (!analytics || !currentSubject) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <BarChart3 size={48} className="mb-3" />
          <p className="font-bold text-gray-400">No data yet</p>
          <p className="text-sm text-gray-300 mt-1">Select a class to view analytics</p>
        </div>
      );
    }
    const atRisk = computedGrades.filter(g => g.transmutedGrade < 75);
    const top5 = [...computedGrades].sort((a, b) => b.transmutedGrade - a.transmutedGrade).slice(0, 5);
    const distEntries = Object.entries(analytics.distribution);
    const maxDist = Math.max(...Object.values(analytics.distribution), 1);

    return (
      <div className="space-y-4">
        {/* Class selector */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={`${selectedSubjectId}|${selectedYearLevel}`}
            onChange={(e) => { const [s, y] = e.target.value.split('|'); setSelectedSubjectId(s); setSelectedYearLevel(y); }}
            className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
            {assignments.map((a, i) => { const sub = SUBJECTS.find(s => s.id === a.subjectId); return <option key={i} value={`${a.subjectId}|${a.yearLevel}`}>{sub?.name} — {a.yearLevel}</option>; })}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { val: analytics.avg.toFixed(1), lbl: 'Class Average', color: 'text-[#185C20]', bg: 'bg-[#185C20]/5' },
            { val: String(analytics.highest), lbl: 'Highest', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { val: String(analytics.lowest), lbl: 'Lowest', color: 'text-red-500', bg: 'bg-red-50' },
            { val: `${analytics.passing}`, lbl: `Passed (${((analytics.passing / analytics.total) * 100).toFixed(0)}%)`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { val: `${analytics.failing}`, lbl: `Failed (${((analytics.failing / analytics.total) * 100).toFixed(0)}%)`, color: 'text-red-500', bg: 'bg-red-50' },
          ].map((c, i) => (
            <div key={i} className={`${c.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${c.color} tabular-nums`}>{c.val}</p>
              <p className="text-[10px] text-gray-500 mt-1">{c.lbl}</p>
            </div>
          ))}
        </div>

        {/* Pass/Fail bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-600 mb-2">Pass / Fail Ratio</p>
          <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-400 h-full transition-all duration-500 rounded-l-full flex items-center justify-end pr-2"
              style={{ width: `${(analytics.passing / analytics.total) * 100}%` }}>
              {analytics.passing > 0 && <span className="text-[9px] font-bold text-white">{analytics.passing}</span>}
            </div>
            <div className="bg-red-400 h-full transition-all duration-500 rounded-r-full flex items-center justify-start pl-2"
              style={{ width: `${(analytics.failing / analytics.total) * 100}%` }}>
              {analytics.failing > 0 && <span className="text-[9px] font-bold text-white">{analytics.failing}</span>}
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
            <span>Passed ({((analytics.passing / analytics.total) * 100).toFixed(0)}%)</span>
            <span>Failed ({((analytics.failing / analytics.total) * 100).toFixed(0)}%)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-700 mb-4">Grade Distribution</h3>
            <div className="space-y-2.5">
              {distEntries.map(([range, count]) => {
                const colors: Record<string, string> = { '90-100': '#10b981', '85-89': '#0ea5e9', '80-84': '#3b82f6', '75-79': '#f59e0b', 'Below 75': '#ef4444' };
                return (
                  <div key={range} className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-gray-500 w-16 text-right">{range}</span>
                    <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max((count / maxDist) * 100, count > 0 ? 8 : 0)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{ backgroundColor: colors[range] || '#9ca3af' }}>
                        {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top students */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-700 mb-4">Top Performers</h3>
            <div className="space-y-2">
              {top5.map((entry, idx) => (
                <div key={entry.student.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-[#EDCD1F] text-[#185C20]' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                  }`}>{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{entry.student.name}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${gradeColor(entry.transmutedGrade)}`}>{entry.transmutedGrade}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* At-risk */}
        {atRisk.length > 0 && (
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="text-xs font-bold text-red-700">Students At Risk ({atRisk.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {atRisk.map(entry => (
                <div key={entry.student.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-red-700 truncate">{entry.student.name}</p>
                    <p className="text-[10px] text-red-400">Initial: {entry.initialGrade.toFixed(1)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 tabular-nums">{entry.transmutedGrade}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     SECTION: EVALUATION
     ═══════════════════════════════════════════════════════ */
  const renderTeacherCalendar = () => {
    const calendarTeachers = getCalendarTeachers();
    const session = getTeacherSession();
    const currentTeacherUsername = resolveEvaluationTeacherUsername({
      username: session?.username || teacherInfo?.username,
      displayName: session?.displayName || teacherInfo?.displayName,
      employeeId: session?.employeeId || teacherInfo?.employeeId,
    }, calendarTeachers);
    const teacherRecord = calendarTeachers.find((teacher) => teacher.username === currentTeacherUsername);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parseEventDate = (date: string) => new Date(`${date}T00:00:00`);
    const formatEventDate = (event: CalendarEvent) => {
      const start = parseEventDate(event.date);
      const startLabel = start.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
      if (!event.endDate) return startLabel;
      const end = parseEventDate(event.endDate);
      return `${startLabel} - ${end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };
    const myEvents = sortCalendarEvents(
      teacherCalendarEvents.filter((event) => isCalendarEventAssignedToTeacher(event, currentTeacherUsername)),
    );
    const upcomingEvents = myEvents.filter((event) => parseEventDate(event.date) >= today);
    const highPriorityEvents = upcomingEvents.filter((event) => event.priority === 'high');
    const thisMonthEvents = upcomingEvents.filter((event) => {
      const eventDate = parseEventDate(event.date);
      return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
    });
    const groupedEvents = myEvents.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
      const monthLabel = parseEventDate(event.date).toLocaleDateString('en', { month: 'long', year: 'numeric' });
      return {
        ...groups,
        [monthLabel]: [...(groups[monthLabel] || []), event],
      };
    }, {});

    const renderEventCard = (event: CalendarEvent) => {
      const typeInfo = getCalendarEventType(event.type);
      const isPast = parseEventDate(event.date) < today;
      return (
        <div key={event.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isPast ? 'border-gray-100 opacity-70' : 'border-gray-100'}`}>
          <div className="p-4 flex gap-3">
            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{event.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatEventDate(event)}{event.time ? ` - ${event.time}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                  event.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100'
                    : event.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  {event.priority}
                </span>
              </div>

              {event.description && <p className="text-xs text-gray-600 mt-3 leading-relaxed">{event.description}</p>}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: typeInfo.color + '10', color: typeInfo.color, borderColor: typeInfo.color + '30' }}>
                  {typeInfo.label}
                </span>
                {event.location && (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 flex items-center gap-1">
                    <MapPin size={10} /> {event.location}
                  </span>
                )}
                <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 flex items-center gap-1">
                  <Users size={10} /> {getCalendarAssignmentLabel(event.assignedTo, calendarTeachers)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="relative bg-[#185C20] p-5 lg:p-6 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#EDCD1F] rounded-full -translate-y-1/2 translate-x-1/3" />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <p className="text-[#EDCD1F] text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em]">My School Calendar</p>
                <h2 className="text-xl lg:text-2xl font-bold mt-1">{teacherRecord?.name || teacherInfo?.displayName}</h2>
                <p className="text-white/65 text-xs lg:text-sm mt-1">{teacherRecord?.department || teacherInfo?.department} Department</p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
                <Bell size={15} className="text-[#EDCD1F]" />
                <span className="text-xs font-bold">{upcomingEvents.length} upcoming</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
            {[
              { value: String(myEvents.length), label: 'Received', icon: Calendar },
              { value: String(upcomingEvents.length), label: 'Upcoming', icon: Clock },
              { value: String(highPriorityEvents.length), label: 'High Priority', icon: AlertTriangle },
              { value: String(thisMonthEvents.length), label: 'This Month', icon: Tag },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#185C20]/8 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-[#185C20]" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{item.value}</p>
                    <p className="text-[10px] text-gray-400 -mt-0.5">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 lg:px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-800">Upcoming Events</h3>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Assigned to me</span>
              </div>
              <div className="p-4 space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.slice(0, 8).map(renderEventCard)
                ) : (
                  <div className="py-12 text-center text-gray-300">
                    <Calendar size={36} className="mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-400">No upcoming assigned events</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 lg:px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Full Assigned Schedule</h3>
              </div>
              <div className="p-4 space-y-5">
                {Object.keys(groupedEvents).length > 0 ? Object.entries(groupedEvents).map(([month, events]) => (
                  <div key={month} className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{month}</p>
                    <div className="space-y-2">
                      {events.map(renderEventCard)}
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-gray-300">
                    <Calendar size={36} className="mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-400">No assigned events yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Event Types</h3>
              <div className="space-y-2">
                {EVENT_TYPES.map((type) => {
                  const count = myEvents.filter((event) => event.type === type.id).length;
                  return (
                    <div key={type.id} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                      <span className="flex-1 text-xs font-semibold text-gray-600">{type.label}</span>
                      <span className="text-[10px] font-bold text-gray-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {highPriorityEvents.length > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-red-500" />
                  <h3 className="text-sm font-bold text-red-700">High Priority</h3>
                </div>
                <div className="space-y-2">
                  {highPriorityEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="bg-white rounded-xl border border-red-100 px-3 py-2">
                      <p className="text-xs font-bold text-gray-800">{event.title}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">{formatEventDate(event)}{event.time ? ` - ${event.time}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherEvaluation = () => {
    const rubrics = loadEvaluationRubrics();
    const evaluations = loadTeacherEvaluations();
    const roster = getEvaluationTeachers();
    const session = getTeacherSession();
    const currentTeacherUsername = resolveEvaluationTeacherUsername({
      username: session?.username || teacherInfo?.username,
      displayName: session?.displayName || teacherInfo?.displayName,
      employeeId: session?.employeeId || teacherInfo?.employeeId,
    }, roster);
    const teacherRecord = roster.find((teacher) => teacher.username === currentTeacherUsername);
    const myEvaluations = [...evaluations]
      .filter((evaluation) => evaluation.teacherUsername === currentTeacherUsername)
      .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));
    const latestEvaluation = myEvaluations[0];
    const latestRubric = latestEvaluation ? rubrics.find((rubric) => rubric.id === latestEvaluation.rubricId) : undefined;
    const latestOverall = latestEvaluation ? computeEvaluationOverall(latestEvaluation, latestRubric) : 0;
    const latestRating = getEvaluationRating(latestOverall);
    const averageOverall = myEvaluations.length > 0
      ? myEvaluations.reduce((sum, evaluation) => sum + computeEvaluationOverall(evaluation, rubrics.find((rubric) => rubric.id === evaluation.rubricId)), 0) / myEvaluations.length
      : 0;
    const previousOverall = myEvaluations[1]
      ? computeEvaluationOverall(myEvaluations[1], rubrics.find((rubric) => rubric.id === myEvaluations[1].rubricId))
      : null;
    const trendDelta = previousOverall === null ? null : latestOverall - previousOverall;
    const latestCriterionScores = latestRubric && latestEvaluation
      ? latestRubric.criteria.map((criterion) => ({
        criterion,
        score: latestEvaluation.scores[criterion.id] || 0,
        pct: ((latestEvaluation.scores[criterion.id] || 0) / criterion.maxScore) * 100,
      }))
      : [];
    const strongestCriterion = [...latestCriterionScores].sort((a, b) => b.pct - a.pct)[0];
    const focusCriterion = [...latestCriterionScores].sort((a, b) => a.pct - b.pct)[0];

    if (!latestEvaluation || !latestRubric) {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#185C20]/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={24} className="text-[#185C20]" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No principal evaluation yet</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
              Once the principal submits an evaluation, your score, comments, and criterion breakdown will appear here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border ${latestRating.border} ${latestRating.bg} shadow-sm overflow-hidden`}>
          <div className="p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] lg:text-xs font-bold text-[#185C20] uppercase tracking-[0.18em]">Principal Evaluation</p>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{teacherRecord?.name || teacherInfo?.displayName}</h2>
              <p className="text-xs lg:text-sm text-gray-500 mt-1">
                {latestRubric.name} &middot; Q{latestEvaluation.quarter} &middot; Evaluated by {latestEvaluation.evaluatedBy}
              </p>
            </div>
            <div className="lg:text-right">
              <p className={`text-5xl font-bold tabular-nums ${latestRating.color}`}>{latestOverall.toFixed(0)}%</p>
              <p className={`text-sm font-bold ${latestRating.color}`}>{latestRating.label}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Latest Score', value: `${latestOverall.toFixed(0)}%`, icon: Award },
            { label: 'Average Score', value: `${averageOverall.toFixed(0)}%`, icon: BarChart3 },
            { label: 'Evaluations', value: String(myEvaluations.length), icon: FileSpreadsheet },
            { label: 'Change', value: trendDelta === null ? '--' : `${trendDelta >= 0 ? '+' : ''}${trendDelta.toFixed(1)}%`, icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <Icon size={17} className="text-[#185C20] mb-2" />
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{item.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-gray-800">Criteria Breakdown</h3>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Latest</span>
            </div>
            <div className="space-y-3">
              {latestCriterionScores.map(({ criterion, score, pct }) => (
                <div key={criterion.id}>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700">{criterion.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{criterion.description}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-600 tabular-nums">{score}/{criterion.maxScore}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#185C20]" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Principal Comments</h3>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">
                {latestEvaluation.comments || 'No comments recorded for this evaluation.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Strongest Area</p>
                <p className="text-sm font-bold text-emerald-800">{strongestCriterion?.criterion.name || '--'}</p>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Growth Focus</p>
                <p className="text-sm font-bold text-amber-800">{focusCriterion?.criterion.name || '--'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">My Evaluation History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quarter</th>
                  <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Comments</th>
                </tr>
              </thead>
              <tbody>
                {myEvaluations.map((evaluation) => {
                  const rubric = rubrics.find((item) => item.id === evaluation.rubricId);
                  const score = computeEvaluationOverall(evaluation, rubric);
                  const rating = getEvaluationRating(score);
                  return (
                    <tr key={evaluation.id} className="border-b border-gray-50 last:border-b-0">
                      <td className="py-2.5 px-4 text-gray-500">{evaluation.evaluatedAt}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-gray-600">Q{evaluation.quarter}</td>
                      <td className="py-2.5 px-4 text-center"><span className={`font-bold ${rating.color}`}>{score.toFixed(0)}%</span></td>
                      <td className="py-2.5 px-4 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rating.bg} ${rating.color}`}>{rating.label}</span></td>
                      <td className="py-2.5 px-4 text-gray-500 hidden md:table-cell max-w-[280px] truncate">{evaluation.comments}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     SECTION: SETTINGS
     ═══════════════════════════════════════════════════════ */
  const renderSettings = () => (
    <div className="space-y-4">
      {isPrincipal && (
        <div className="bg-white rounded-2xl border border-[#185C20]/15 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <h3 className="font-bold text-gray-800 mb-1">Site Image Editor</h3>
              <p className="text-[11px] text-gray-500">
                Enable edit mode across user-side pages to update page images, including the alumni registration QR.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-xs font-bold text-gray-700">
                {homeImageEditModeEnabled ? 'Image edit enabled' : 'Image edit disabled'}
              </span>
              <Switch
                checked={homeImageEditModeEnabled}
                onCheckedChange={handlePrincipalImageEditToggle}
                className="h-6 w-11 data-[state=checked]:bg-[#185C20] data-[state=unchecked]:bg-gray-300"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openPrincipalImageEditor}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EDCD1F]/25 text-[#185C20] text-xs font-bold hover:bg-[#EDCD1F]/35 transition-colors"
            >
              <ImagePlus size={14} />
              Open site image editor
            </button>
            <p className="text-[11px] text-gray-400">Opens the public site with edit controls enabled.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-1">Quarter Schedule</h3>
        <p className="text-[11px] text-gray-400 mb-4">Managed by administration. Contact admin for changes.</p>
        <div className="space-y-2">
          {QUARTERS.map(q => (
            <div key={q.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
              selectedQuarter === q.id ? 'border-[#EDCD1F] bg-[#EDCD1F]/5' : q.isLocked ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-white'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${q.isLocked ? 'bg-gray-200 text-gray-500' : 'bg-[#EDCD1F] text-[#185C20]'}`}>Q{q.id}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{q.label}</p>
                <p className="text-[11px] text-gray-400">{new Date(q.startDate).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} — {new Date(q.endDate).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${q.isLocked ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{q.isLocked ? 'Locked' : 'Open'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Weight Distribution Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">WW</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">PT</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">QA</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map(sub => (
                <tr key={sub.id} className="border-t border-gray-50">
                  <td className="py-2 px-3 font-semibold text-gray-700">{sub.name}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.type === 'major' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {sub.type === 'major' ? 'Major' : 'Minor'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-gray-600">{sub.weights.written}%</td>
                  <td className="py-2 px-3 text-center font-bold text-gray-600">{sub.weights.performance}%</td>
                  <td className="py-2 px-3 text-center font-bold text-gray-600">{sub.weights.quarterly}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     PRINCIPAL: DATA
     ═══════════════════════════════════════════════════════ */
  const SCHOOL_STATS = {
    totalStudents: 152, totalClasses: 16,
    schoolAvg: 85.2, passingRate: 94.7, honorStudents: 23, atRiskStudents: 12,
    maleStudents: 78, femaleStudents: 74,
    gradeLevels: [
      { level: 'Grade 6', students: 16, avg: 86.1, passing: 100, male: 9, female: 7, honors: 4, atRisk: 0 },
      { level: 'Grade 7', students: 38, avg: 84.8, passing: 92.1, male: 20, female: 18, honors: 5, atRisk: 3 },
      { level: 'Grade 8', students: 36, avg: 85.5, passing: 94.4, male: 18, female: 18, honors: 6, atRisk: 2 },
      { level: 'Grade 9', students: 33, avg: 86.0, passing: 96.9, male: 16, female: 17, honors: 5, atRisk: 1 },
      { level: 'Grade 10', students: 29, avg: 84.3, passing: 93.1, male: 15, female: 14, honors: 3, atRisk: 6 },
    ],
    subjectPerformance: [
      { name: 'Mathematics', avg: 83.6, passing: 91.4, highest: 98, lowest: 68, students: 152, color: '#3b82f6',
        byGrade: [{ gl: 'Gr 6', avg: 85.2 }, { gl: 'Gr 7', avg: 82.4 }, { gl: 'Gr 8', avg: 84.1 }, { gl: 'Gr 9', avg: 83.8 }, { gl: 'Gr 10', avg: 82.5 }] },
      { name: 'Science', avg: 84.1, passing: 93.0, highest: 97, lowest: 70, students: 152, color: '#10b981',
        byGrade: [{ gl: 'Gr 6', avg: 86.0 }, { gl: 'Gr 7', avg: 83.5 }, { gl: 'Gr 8', avg: 84.8 }, { gl: 'Gr 9', avg: 84.2 }, { gl: 'Gr 10', avg: 82.0 }] },
      { name: 'English', avg: 87.2, passing: 96.7, highest: 99, lowest: 72, students: 152, color: '#8b5cf6',
        byGrade: [{ gl: 'Gr 6', avg: 88.5 }, { gl: 'Gr 7', avg: 86.8 }, { gl: 'Gr 8', avg: 87.4 }, { gl: 'Gr 9', avg: 87.9 }, { gl: 'Gr 10', avg: 85.4 }] },
      { name: 'Filipino', avg: 85.8, passing: 94.1, highest: 98, lowest: 71, students: 152, color: '#f59e0b',
        byGrade: [{ gl: 'Gr 6', avg: 87.0 }, { gl: 'Gr 7', avg: 85.2 }, { gl: 'Gr 8', avg: 86.1 }, { gl: 'Gr 9', avg: 85.6 }, { gl: 'Gr 10', avg: 85.1 }] },
      { name: 'Araling Panlipunan', avg: 85.6, passing: 95.4, highest: 97, lowest: 69, students: 152, color: '#ec4899',
        byGrade: [{ gl: 'Gr 6', avg: 86.8 }, { gl: 'Gr 7', avg: 85.0 }, { gl: 'Gr 8', avg: 85.9 }, { gl: 'Gr 9', avg: 86.2 }, { gl: 'Gr 10', avg: 84.1 }] },
      { name: 'MAPEH', avg: 88.4, passing: 98.0, highest: 99, lowest: 74, students: 152, color: '#06b6d4',
        byGrade: [{ gl: 'Gr 6', avg: 89.2 }, { gl: 'Gr 7', avg: 88.0 }, { gl: 'Gr 8', avg: 88.6 }, { gl: 'Gr 9', avg: 88.9 }, { gl: 'Gr 10', avg: 87.3 }] },
      { name: 'TLE/ICT', avg: 86.9, passing: 96.1, highest: 98, lowest: 73, students: 152, color: '#84cc16',
        byGrade: [{ gl: 'Gr 6', avg: 88.0 }, { gl: 'Gr 7', avg: 86.4 }, { gl: 'Gr 8', avg: 87.2 }, { gl: 'Gr 9', avg: 87.0 }, { gl: 'Gr 10', avg: 85.9 }] },
      { name: 'Values Education', avg: 89.1, passing: 98.7, highest: 99, lowest: 76, students: 152, color: '#a855f7',
        byGrade: [{ gl: 'Gr 6', avg: 90.0 }, { gl: 'Gr 7', avg: 88.6 }, { gl: 'Gr 8', avg: 89.4 }, { gl: 'Gr 9', avg: 89.5 }, { gl: 'Gr 10', avg: 88.0 }] },
    ],
    recentActivities: [
      { text: 'Q3 grades submitted for Mathematics Grade 7', time: '2 hours ago', icon: CheckCircle2 },
      { text: 'Q2 grades locked for English Grade 8', time: '5 hours ago', icon: Lock },
      { text: '3 new activities added in Science Grade 9', time: '1 day ago', icon: Plus },
      { text: 'Grade 10 Filipino CSV export completed', time: '1 day ago', icon: Download },
      { text: 'Grade 6 class roster updated — 2 new enrollees', time: '2 days ago', icon: Users },
    ],
    atRiskStudentsList: [
      { name: 'Marco V.', grade: 'Grade 10', avg: 73.2, failingSubjects: ['Mathematics', 'Science'], status: 'critical' as const },
      { name: 'Ana S.', grade: 'Grade 10', avg: 74.1, failingSubjects: ['Mathematics'], status: 'critical' as const },
      { name: 'Jose R.', grade: 'Grade 7', avg: 74.5, failingSubjects: ['Mathematics', 'Filipino'], status: 'critical' as const },
      { name: 'Maria C.', grade: 'Grade 10', avg: 74.8, failingSubjects: ['Science'], status: 'critical' as const },
      { name: 'Luis T.', grade: 'Grade 8', avg: 76.1, failingSubjects: ['Mathematics'], status: 'warning' as const },
      { name: 'Carmen G.', grade: 'Grade 10', avg: 76.4, failingSubjects: [], status: 'warning' as const },
      { name: 'Pedro A.', grade: 'Grade 7', avg: 76.8, failingSubjects: [], status: 'warning' as const },
      { name: 'Sofia M.', grade: 'Grade 10', avg: 77.0, failingSubjects: [], status: 'warning' as const },
      { name: 'Gabriel D.', grade: 'Grade 7', avg: 77.2, failingSubjects: [], status: 'warning' as const },
      { name: 'Elena F.', grade: 'Grade 8', avg: 77.5, failingSubjects: [], status: 'warning' as const },
      { name: 'Rafael B.', grade: 'Grade 10', avg: 77.8, failingSubjects: [], status: 'warning' as const },
      { name: 'Isabella L.', grade: 'Grade 9', avg: 78.0, failingSubjects: [], status: 'warning' as const },
    ],
    honorStudentsList: [
      { name: 'Patricia D.', grade: 'Grade 6', avg: 96.8, award: 'With Highest Honors' },
      { name: 'Miguel A.', grade: 'Grade 9', avg: 96.2, award: 'With Highest Honors' },
      { name: 'Clara R.', grade: 'Grade 8', avg: 95.7, award: 'With Highest Honors' },
      { name: 'Daniel L.', grade: 'Grade 6', avg: 95.1, award: 'With High Honors' },
      { name: 'Angela M.', grade: 'Grade 7', avg: 94.8, award: 'With High Honors' },
      { name: 'Roberto S.', grade: 'Grade 9', avg: 94.3, award: 'With High Honors' },
      { name: 'Teresa G.', grade: 'Grade 8', avg: 93.9, award: 'With Honors' },
      { name: 'Francisco C.', grade: 'Grade 7', avg: 93.5, award: 'With Honors' },
      { name: 'Lucia V.', grade: 'Grade 10', avg: 93.2, award: 'With Honors' },
      { name: 'Antonio B.', grade: 'Grade 6', avg: 92.8, award: 'With Honors' },
    ],
  };

  /* ═══════════════════════════════════════════════════════
     PRINCIPAL: DASHBOARD
     ═══════════════════════════════════════════════════════ */
  const renderPrincipalDashboard = () => (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#185C20] via-[#1a6925] to-[#0f4517] p-5 lg:p-7 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#EDCD1F] rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-[#EDCD1F]" />
              <p className="text-[#EDCD1F] text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em]">Principal&apos;s Dashboard &bull; SY 2025–2026</p>
            </div>
            <h2 className="text-lg lg:text-2xl font-bold">Good day, {teacherInfo?.displayName?.split(' ').slice(0, 2).join(' ') || 'Principal'}!</h2>
            <p className="text-white/60 text-xs lg:text-sm mt-0.5">School overview for {currentQuarter?.label || '3rd Quarter'}</p>
          </div>
        </div>
        {/* Key stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
          {[
            { val: String(SCHOOL_STATS.totalStudents), lbl: 'Total Students', icon: GraduationCap, accent: '#10b981' },
            { val: `${SCHOOL_STATS.passingRate}%`, lbl: 'Passing Rate', icon: Target, accent: '#185C20' },
            { val: SCHOOL_STATS.schoolAvg.toFixed(1), lbl: 'School Average', icon: TrendingUp, accent: '#3b82f6' },
            { val: String(SCHOOL_STATS.honorStudents), lbl: 'Honor Students', icon: Trophy, accent: '#EDCD1F' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 lg:py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.accent + '14' }}>
                  <Icon size={16} style={{ color: s.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg lg:text-xl font-bold text-gray-900 tabular-nums">{s.val}</p>
                  <p className="text-[10px] text-gray-400 -mt-0.5">{s.lbl}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column: Subject snapshot + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Subject performance snapshot */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Subject Performance</h3>
            <button onClick={() => setActiveSection('academics')} className="text-[10px] font-bold text-[#185C20] hover:underline">View All</button>
          </div>
          <div className="px-4 lg:px-5 pb-4 lg:pb-5 space-y-2">
            {SCHOOL_STATS.subjectPerformance.slice(0, 5).map((sub, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: sub.color + '18' }}>
                  <BookOpen size={14} style={{ color: sub.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-800 truncate">{sub.name}</p>
                  <p className="text-[10px] text-gray-400">{sub.passing}% passing &middot; Range: {sub.lowest}–{sub.highest}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${sub.avg >= 85 ? 'text-emerald-600' : sub.avg >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>{sub.avg.toFixed(1)}</p>
                  <p className="text-[9px] text-gray-400">avg</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-800">Recent Activity</h3>
          </div>
          <div className="px-4 lg:px-5 pb-4 lg:pb-5 space-y-1">
            {SCHOOL_STATS.recentActivities.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-[#185C20]/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={13} className="text-[#185C20]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-700 leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={10} /> {a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grade levels */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Grade Level Overview</h3>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{currentQuarter?.label}</span>
        </div>
        <div className="px-4 lg:px-5 pb-4 lg:pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {SCHOOL_STATS.gradeLevels.map((gl, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">{gl.level}</span>
                  <School size={13} className="text-gray-300" />
                </div>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{gl.avg.toFixed(1)}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-400">{gl.students} students</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${gl.passing >= 95 ? 'bg-emerald-50 text-emerald-600' : gl.passing >= 90 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                    {gl.passing}% passing
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-risk students alert */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h3 className="text-sm font-bold text-gray-800">At-Risk Students</h3>
          </div>
          <button onClick={() => setActiveSection('registration')} className="text-[10px] font-bold text-[#185C20] hover:underline">View All</button>
        </div>
        <div className="px-4 lg:px-5 pb-4 lg:pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCHOOL_STATS.atRiskStudentsList.filter(s => s.status === 'critical').map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100/80">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-red-600">{s.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-gray-800 truncate">{s.name}</p>
                  <p className="text-[10px] text-gray-400">{s.grade} &middot; {s.failingSubjects.join(', ')}</p>
                </div>
                <span className="text-sm font-bold text-red-600 tabular-nums">{s.avg.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quarter progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 lg:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Quarter Status</h3>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">SY 2025–2026</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {QUARTERS.map(q => {
            const isCurrentQ = selectedQuarter === q.id;
            return (
              <div key={q.id} className={`relative p-3 rounded-xl border-2 transition-all ${
                isCurrentQ ? 'border-[#EDCD1F] bg-[#EDCD1F]/5' : q.isLocked ? 'border-gray-100 bg-gray-50/50 opacity-60' : 'border-gray-100 bg-gray-50/50'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">Q{q.id}</span>
                  {q.isLocked ? <Lock size={11} className="text-gray-400" /> : <CheckCircle2 size={11} className="text-emerald-500" />}
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">
                  {new Date(q.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – {new Date(q.endDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
                <span className={`inline-block mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${q.isLocked ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                  {q.isLocked ? 'Locked' : 'Open'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     PRINCIPAL: ENROLLMENT
     ═══════════════════════════════════════════════════════ */
  const renderPrincipalEnrollment = () => (
    <div className="space-y-4">
      {/* Enrollment summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
          <h3 className="text-sm font-bold text-gray-800">Student Enrollment Summary</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">SY 2025–2026 &middot; {SCHOOL_STATS.totalStudents} total enrolled</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
          {[
            { val: String(SCHOOL_STATS.totalStudents), lbl: 'Total Enrolled', icon: Users, accent: '#185C20' },
            { val: String(SCHOOL_STATS.maleStudents), lbl: 'Male', icon: Users, accent: '#3b82f6' },
            { val: String(SCHOOL_STATS.femaleStudents), lbl: 'Female', icon: Users, accent: '#ec4899' },
            { val: String(SCHOOL_STATS.atRiskStudents), lbl: 'At Risk', icon: AlertTriangle, accent: '#ef4444' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.accent + '14' }}>
                  <Icon size={16} style={{ color: s.accent }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{s.val}</p>
                  <p className="text-[10px] text-gray-400 -mt-0.5">{s.lbl}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per grade level enrollment table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
          <h3 className="text-sm font-bold text-gray-800">Enrollment by Grade Level</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-y border-gray-100">
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade Level</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Male</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Female</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Average</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Passing</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Honors</th>
                <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">At Risk</th>
              </tr>
            </thead>
            <tbody>
              {SCHOOL_STATS.gradeLevels.map((gl, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <School size={13} className="text-[#185C20]" />
                      <span className="font-bold text-gray-700">{gl.level}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-800">{gl.students}</td>
                  <td className="py-3 px-4 text-center text-blue-600">{gl.male}</td>
                  <td className="py-3 px-4 text-center text-pink-600">{gl.female}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-bold ${gl.avg >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>{gl.avg.toFixed(1)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${gl.passing >= 95 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {gl.passing}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-bold bg-[#EDCD1F]/15 text-[#185C20] px-1.5 py-0.5 rounded-full">{gl.honors}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {gl.atRisk > 0 ? (
                      <span className="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">{gl.atRisk}</span>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#185C20]/5 border-t-2 border-[#185C20]/10">
                <td className="py-3 px-4 font-bold text-[#185C20]">Total</td>
                <td className="py-3 px-4 text-center font-bold text-[#185C20]">{SCHOOL_STATS.totalStudents}</td>
                <td className="py-3 px-4 text-center font-bold text-blue-600">{SCHOOL_STATS.maleStudents}</td>
                <td className="py-3 px-4 text-center font-bold text-pink-600">{SCHOOL_STATS.femaleStudents}</td>
                <td className="py-3 px-4 text-center font-bold text-emerald-600">{SCHOOL_STATS.schoolAvg.toFixed(1)}</td>
                <td className="py-3 px-4 text-center font-bold text-emerald-600">{SCHOOL_STATS.passingRate}%</td>
                <td className="py-3 px-4 text-center font-bold text-[#185C20]">{SCHOOL_STATS.honorStudents}</td>
                <td className="py-3 px-4 text-center font-bold text-red-600">{SCHOOL_STATS.atRiskStudents}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Honor students */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3 flex items-center gap-2">
          <Trophy size={14} className="text-[#EDCD1F]" />
          <h3 className="text-sm font-bold text-gray-800">Honor Students</h3>
          <span className="text-[10px] font-bold text-gray-300 ml-auto">{SCHOOL_STATS.honorStudentsList.length} students</span>
        </div>
        <div className="px-4 lg:px-5 pb-4 lg:pb-5 space-y-1.5">
          {SCHOOL_STATS.honorStudentsList.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/70 hover:bg-gray-100/60 transition-colors">
              <span className={`text-[11px] font-bold w-5 text-center flex-shrink-0 ${i < 3 ? 'text-[#EDCD1F]' : 'text-gray-400'}`}>{i + 1}</span>
              <div className="w-8 h-8 rounded-lg bg-[#EDCD1F]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#185C20]">{s.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-gray-800 truncate">{s.name}</p>
                <p className="text-[10px] text-gray-400">{s.grade}</p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                s.award === 'With Highest Honors' ? 'bg-[#EDCD1F]/20 text-[#185C20]' :
                s.award === 'With High Honors' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
              }`}>{s.award}</span>
              <span className="text-sm font-bold text-emerald-600 tabular-nums flex-shrink-0">{s.avg.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* At-risk students */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          <h3 className="text-sm font-bold text-gray-800">At-Risk Students</h3>
          <span className="text-[10px] font-bold text-red-400 ml-auto">{SCHOOL_STATS.atRiskStudentsList.length} students below 80</span>
        </div>
        <div className="px-4 lg:px-5 pb-4 lg:pb-5 space-y-1.5">
          {SCHOOL_STATS.atRiskStudentsList.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
              s.status === 'critical' ? 'bg-red-50/60 border border-red-100/80' : 'bg-amber-50/40 border border-amber-100/60'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                s.status === 'critical' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <span className={`text-[10px] font-bold ${s.status === 'critical' ? 'text-red-600' : 'text-amber-700'}`}>
                  {s.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-gray-800 truncate">{s.name}</p>
                <p className="text-[10px] text-gray-400">
                  {s.grade}
                  {s.failingSubjects.length > 0 && <> &middot; Failing: <span className="text-red-500">{s.failingSubjects.join(', ')}</span></>}
                </p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                s.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>{s.status === 'critical' ? 'Critical' : 'Watch'}</span>
              <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${s.status === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{s.avg.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     PRINCIPAL: ACADEMICS
     ═══════════════════════════════════════════════════════ */
  const renderPrincipalAcademics = () => {
    const allClasses: { subject: string; yearLevel: string; students: number; avg: number; color: string }[] = [];
    Object.entries(TEACHER_ASSIGNMENTS).forEach(([_key, assigns]) => {
      assigns.forEach(a => {
        const sub = SUBJECTS.find(s => s.id === a.subjectId);
        const studs = generateStudents(a.yearLevel);
        const subPerf = SCHOOL_STATS.subjectPerformance.find(sp => sub?.name?.includes(sp.name.split(' ')[0]) || sp.name.includes(sub?.name?.split(' ')[0] || ''));
        allClasses.push({
          subject: sub?.name || a.subjectId,
          yearLevel: a.yearLevel,
          students: studs.length,
          avg: 80 + ((a.subjectId + a.yearLevel).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100) / 10,
          color: subPerf?.color || '#999',
        });
      });
    });

    return (
      <div className="space-y-4">
        {/* Subject performance cards */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-800">Subject Performance Overview</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{SCHOOL_STATS.subjectPerformance.length} subjects &middot; {currentQuarter?.label}</p>
          </div>
          <div className="px-4 lg:px-5 pb-4 lg:pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SCHOOL_STATS.subjectPerformance.map((sub, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100/80 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: sub.color + '18' }}>
                      <BookOpen size={13} style={{ color: sub.color }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 truncate">{sub.name}</span>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${sub.avg >= 85 ? 'text-emerald-600' : sub.avg >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>{sub.avg.toFixed(1)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sub.passing >= 95 ? 'bg-emerald-50 text-emerald-600' : sub.passing >= 90 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {sub.passing}% pass
                    </span>
                    <span className="text-[10px] text-gray-400">{sub.lowest}–{sub.highest}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject × Grade Level heatmap */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-800">Subject × Grade Level Performance</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Average grades per subject across all grade levels</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-y border-gray-100">
                  <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">Subject</th>
                  {SCHOOL_STATS.subjectPerformance[0].byGrade.map((g, i) => (
                    <th key={i} className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{g.gl}</th>
                  ))}
                  <th className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100/50">Avg</th>
                </tr>
              </thead>
              <tbody>
                {SCHOOL_STATS.subjectPerformance.map((sub, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                        <span className="font-bold text-gray-700 truncate">{sub.name}</span>
                      </div>
                    </td>
                    {sub.byGrade.map((g, j) => {
                      const bg = g.avg >= 88 ? 'bg-emerald-100 text-emerald-800' : g.avg >= 85 ? 'bg-emerald-50 text-emerald-700' : g.avg >= 82 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700';
                      return (
                        <td key={j} className="py-2.5 px-3 text-center">
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${bg}`}>{g.avg.toFixed(1)}</span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center bg-gray-50/50">
                      <span className={`text-[11px] font-bold ${sub.avg >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>{sub.avg.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All classes table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-800">All Class Sections</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{allClasses.length} sections across all subjects</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-y border-gray-100">
                  <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade Level</th>
                  <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Students</th>
                  <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Class Avg</th>
                </tr>
              </thead>
              <tbody>
                {allClasses.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="font-semibold text-gray-700">{c.subject}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{c.yearLevel}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-600">{c.students}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`font-bold ${c.avg >= 85 ? 'text-emerald-600' : c.avg >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {c.avg.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════
     PRINCIPAL: ANALYTICS
     ═══════════════════════════════════════════════════════ */
  const renderPrincipalAnalytics = () => {
    const distribution = { 'Outstanding (90–100)': 34, 'Very Satisfactory (85–89)': 42, 'Satisfactory (80–84)': 38, 'Fairly Satisfactory (75–79)': 26, 'Did Not Meet (Below 75)': 12 };
    const totalStudents = Object.values(distribution).reduce((a, b) => a + b, 0);
    const barColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

    return (
      <div className="space-y-4">
        {/* School-wide stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3">
            <h3 className="text-sm font-bold text-gray-800">School-Wide Student Analytics</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{currentQuarter?.label} &middot; {totalStudents} students across all grade levels</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
            {[
              { val: SCHOOL_STATS.schoolAvg.toFixed(1), lbl: 'School Average', icon: TrendingUp, accent: '#185C20' },
              { val: `${SCHOOL_STATS.passingRate}%`, lbl: 'Passing Rate', icon: Target, accent: '#10b981' },
              { val: String(SCHOOL_STATS.honorStudents), lbl: 'Honor Students', icon: Trophy, accent: '#EDCD1F' },
              { val: String(SCHOOL_STATS.atRiskStudents), lbl: 'At Risk', icon: AlertTriangle, accent: '#ef4444' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.accent + '14' }}>
                    <Icon size={16} style={{ color: s.accent }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{s.val}</p>
                    <p className="text-[10px] text-gray-400 -mt-0.5">{s.lbl}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grade distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 lg:p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Student Grade Distribution (School-Wide)</h3>
          <div className="space-y-3">
            {Object.entries(distribution).map(([label, count], i) => {
              const pct = (count / totalStudents) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-600">{label}</span>
                    <span className="text-[11px] font-bold text-gray-800">{count} students ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColors[i] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-grade level comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 lg:p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Grade Level Comparison</h3>
          <div className="space-y-2.5">
            {SCHOOL_STATS.gradeLevels.map((gl, i) => {
              const barWidth = ((gl.avg - 75) / 25) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-600 w-16 flex-shrink-0">{gl.level}</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${Math.min(barWidth, 100)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-lg flex items-center justify-end pr-2"
                      style={{ backgroundColor: gl.avg >= 86 ? '#10b981' : gl.avg >= 84 ? '#3b82f6' : '#f59e0b' }}
                    >
                      <span className="text-[10px] font-bold text-white">{gl.avg.toFixed(1)}</span>
                    </motion.div>
                  </div>
                  <div className="flex-shrink-0 w-12 text-right">
                    <span className={`text-[10px] font-bold ${gl.passing >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>{gl.passing}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">Legend:</span>
            {[{ color: '#10b981', label: '≥86' }, { color: '#3b82f6', label: '84–85' }, { color: '#f59e0b', label: '<84' }].map((l, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject performance comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 lg:p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Subject-Level Student Performance</h3>
          <div className="space-y-2.5">
            {[...SCHOOL_STATS.subjectPerformance].sort((a, b) => b.avg - a.avg).map((sub, i) => {
              const barWidth = ((sub.avg - 75) / 25) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="text-[11px] font-bold text-gray-600 truncate">{sub.name}</span>
                    </div>
                    <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${Math.min(barWidth, 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{ backgroundColor: sub.color }}
                      >
                        <span className="text-[10px] font-bold text-white">{sub.avg.toFixed(1)}</span>
                      </motion.div>
                    </div>
                    <div className="flex-shrink-0 w-14 text-right">
                      <span className={`text-[10px] font-bold ${sub.passing >= 95 ? 'text-emerald-600' : sub.passing >= 90 ? 'text-blue-600' : 'text-amber-600'}`}>{sub.passing}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top performers and bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top-performing grade levels */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-[#EDCD1F]" />
              <h3 className="text-sm font-bold text-gray-800">Top Grade Levels</h3>
            </div>
            <div className="space-y-2">
              {[...SCHOOL_STATS.gradeLevels].sort((a, b) => b.avg - a.avg).map((gl, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/60">
                  <span className={`text-[11px] font-bold w-5 text-center ${i === 0 ? 'text-[#EDCD1F]' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>{i + 1}</span>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#185C20]/8">
                    <School size={13} className="text-[#185C20]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-700">{gl.level}</p>
                    <p className="text-[10px] text-gray-400">{gl.students} students &middot; {gl.passing}% passing</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">{gl.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highest-performing subjects */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-[#EDCD1F]" />
              <h3 className="text-sm font-bold text-gray-800">Top Subjects by Student Avg</h3>
            </div>
            <div className="space-y-2">
              {[...SCHOOL_STATS.subjectPerformance].sort((a, b) => b.avg - a.avg).map((sub, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/60">
                  <span className={`text-[11px] font-bold w-5 text-center ${i === 0 ? 'text-[#EDCD1F]' : i === 1 ? 'text-gray-400' : 'text-amber-700'}`}>{i + 1}</span>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: sub.color + '18' }}>
                    <BookOpen size={13} style={{ color: sub.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-700 truncate">{sub.name}</p>
                    <p className="text-[10px] text-gray-400">{sub.passing}% passing &middot; Range: {sub.lowest}–{sub.highest}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">{sub.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subjects needing attention */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Subjects Needing Attention</h3>
          </div>
          <div className="space-y-2.5">
            {[...SCHOOL_STATS.subjectPerformance].filter(s => s.passing < 95).sort((a, b) => a.passing - b.passing).map((sub, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100/60">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: sub.color + '18' }}>
                  <BookOpen size={14} style={{ color: sub.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-800">{sub.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-[10px] text-gray-400">Avg: <span className="font-bold text-gray-600">{sub.avg.toFixed(1)}</span></span>
                    <span className="text-[10px] text-gray-400">Lowest: <span className="font-bold text-red-500">{sub.lowest}</span></span>
                    <span className="text-[10px] text-gray-400">Pass Rate: <span className={`font-bold ${sub.passing < 93 ? 'text-red-500' : 'text-amber-600'}`}>{sub.passing}%</span></span>
                  </div>
                  {/* Show which grade levels struggle most */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sub.byGrade.filter(g => g.avg < 84).map((g, j) => (
                      <span key={j} className="text-[9px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">{g.gl}: {g.avg.toFixed(1)}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-lg font-bold tabular-nums ${sub.passing < 93 ? 'text-red-600' : 'text-amber-600'}`}>{sub.passing}%</span>
                  <span className="text-[9px] text-gray-400">pass rate</span>
                </div>
              </div>
            ))}
            {SCHOOL_STATS.subjectPerformance.filter(s => s.passing < 95).length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">All subjects have ≥95% passing rate!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isAdminRole) {
      switch (activeSection) {
        case 'dashboard':
          return (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[11px] font-bold text-[#185C20] uppercase tracking-wider">Admin Role</p>
                    <h2 className="mt-1 text-2xl font-bold text-gray-900">Administrative Dashboard Access</h2>
                    <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">
                      This account can manage faculty and staff, alumni records, page content, and site settings with full CRUD controls.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.assign('/admin')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a] transition-colors"
                  >
                    <Shield size={15} />
                    Open Admin Dashboard
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  'Faculty and staff setup',
                  'Alumni records and listings',
                  'Website pages and content updates',
                ].map((capability) => (
                  <div key={capability} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-sm font-semibold text-gray-800">{capability}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        case 'settings':
          return renderSettings();
        default:
          return null;
      }
    }

    if (isPrincipal) {
      switch (activeSection) {
        case 'dashboard': return renderPrincipalDashboard();
        case 'subjects': return <PrincipalSubjects />;
        case 'teachers': return <PrincipalTeachers />;
        case 'registration': return <PrincipalRegistration />;
        case 'evaluation': return <PrincipalEvaluation />;
        case 'calendar': return <PrincipalCalendar />;
        case 'yearly-rollover': return <PrincipalYearSetup />;
        case 'academics': return (
          <div className="space-y-6">
            {renderPrincipalAcademics()}
            {renderPrincipalAnalytics()}
          </div>
        );
        case 'settings': return renderSettings();
        default: return renderPrincipalDashboard();
      }
    }
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'grading': return renderGrading();
      case 'students': return renderStudents();
      case 'calendar': return renderTeacherCalendar();
      case 'analytics': return renderAnalytics();
      case 'evaluation': return renderTeacherEvaluation();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  /* ═══════════════════════════════════════════════════════
     LAYOUT
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f8f8f6] selection:bg-[#EDCD1F] selection:text-[#185C20] flex">

      {/* ── Mobile: More bottom sheet ── */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden" onClick={() => setMoreMenuOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-[28px] shadow-2xl">
              <div className="p-2 flex justify-center"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="px-5 pb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 px-1">More</p>
                {moreMenuItems.map(item => {
                  const Icon = item.icon; const isActive = activeSection === item.id;
                  return (
                    <button key={item.id} onClick={() => { setActiveSection(item.id); setMoreMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-0.5 ${isActive ? 'bg-[#185C20] text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Icon size={18} /><span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  );
                })}
                <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
                  <button onClick={() => { setMoreMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all">
                    <LogOut size={18} /><span className="text-sm font-semibold">Sign Out</span>
                  </button>
                </div>
              </div>
              <div className="pb-[env(safe-area-inset-bottom,8px)]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 bg-white border-r border-gray-100 sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#185C20] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#185C20]/20">
              {isPrincipal || isAdminRole ? <Shield size={20} className="text-[#EDCD1F]" /> : <GraduationCap size={20} className="text-[#EDCD1F]" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">MMPNS</p>
              <p className="text-[10px] text-gray-400">{isPrincipal ? "Principal's Office" : isAdminRole ? 'Admin Portal' : 'Grading System'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sidebarItems.map(item => {
            const Icon = item.icon; const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group ${
                  isActive ? 'bg-[#185C20] text-white shadow-md shadow-[#185C20]/15' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}>
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-[#EDCD1F]' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span className="text-[13px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile & actions */}
        <div className="border-t border-gray-100 px-3 py-3 space-y-0.5">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#185C20] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-[#EDCD1F]">{teacherInfo?.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-gray-700 truncate">{teacherInfo?.displayName}</p>
              <p className="text-[10px] text-gray-400">{isPrincipal ? 'School Principal' : isAdminRole ? 'Portal Administrator' : `${teacherInfo?.department} Dept.`}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer">
            <LogOut size={16} className="flex-shrink-0" /><span className="text-[12px] font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 lg:px-8 h-14 lg:h-16 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile avatar */}
            <div className="flex lg:hidden items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#185C20] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#EDCD1F]">{teacherInfo?.initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{teacherInfo?.displayName}</p>
                <p className="text-[10px] text-gray-400 -mt-0.5">{isPrincipal ? 'School Principal' : isAdminRole ? 'Portal Administrator' : `${teacherInfo?.department} Dept.`}</p>
              </div>
            </div>
            {/* Desktop title */}
            <div className="hidden lg:block">
              <p className="text-lg font-bold text-gray-800">
                {sidebarItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto px-4 lg:px-8 py-5 lg:py-6 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {mobileDetailEntry && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileDetailStudentId(null)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 360 }}
                className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[28px] shadow-2xl md:hidden max-h-[85dvh] overflow-y-auto"
              >
                <div className="p-2 flex justify-center">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <div className="px-4 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{mobileDetailEntry.student.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {mobileDetailSource === 'students' ? 'Student details' : gradingTab === 'summary' ? 'Grade summary' : 'Activity scores'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDetailStudentId(null)}
                    className="w-10 h-10 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-4 py-4 space-y-4">
                  {mobileDetailSource === 'students' && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student ID</p>
                          <p className="text-xs font-semibold text-gray-700 mt-1 break-all">{mobileDetailEntry.student.id}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gender • Level</p>
                          <p className="text-xs font-semibold text-gray-700 mt-1">{mobileDetailEntry.student.gender} • {mobileDetailEntry.student.yearLevel}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="rounded-xl bg-gray-50 p-3 text-center">
                          <p className="text-[10px] text-gray-400">WW</p>
                          <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.breakdown.written.weighted.toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 text-center">
                          <p className="text-[10px] text-gray-400">PT</p>
                          <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.breakdown.performance.weighted.toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 text-center">
                          <p className="text-[10px] text-gray-400">QA</p>
                          <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.breakdown.quarterly.weighted.toFixed(1)}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {mobileDetailSource === 'grading' && gradingTab === 'summary' && (
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl bg-gray-50 p-3 text-center">
                        <p className="text-[10px] text-gray-400">WW</p>
                        <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.breakdown.written.weighted.toFixed(1)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 text-center">
                        <p className="text-[10px] text-gray-400">PT</p>
                        <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.breakdown.performance.weighted.toFixed(1)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 text-center">
                        <p className="text-[10px] text-gray-400">QA</p>
                        <p className="text-sm font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.breakdown.quarterly.weighted.toFixed(1)}</p>
                      </div>
                    </div>
                  )}

                  {mobileDetailSource === 'grading' && gradingTab !== 'summary' && (
                    <div className="space-y-2.5">
                      {detailTabActivities.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                          No activities available for this tab.
                        </div>
                      ) : (
                        detailTabActivities.map((activity) => {
                          const currentScore = grades.find(
                            (grade) => grade.studentId === mobileDetailEntry.student.id && grade.activityId === activity.id,
                          )?.score;
                          return (
                            <div key={activity.id} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-700 truncate">{activity.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Max score: {activity.maxScore}</p>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={activity.maxScore}
                                value={currentScore ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value === '' ? null : Math.min(Number(event.target.value), activity.maxScore);
                                  updateGrade(mobileDetailEntry.student.id, activity.id, value);
                                }}
                                disabled={isCurrentQuarterLocked}
                                className="w-20 h-9 text-center text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-gray-100 p-3 text-center">
                      <p className="text-[10px] text-gray-400">Initial Grade</p>
                      <p className="text-base font-bold text-gray-700 tabular-nums mt-1">{mobileDetailEntry.initialGrade.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3 text-center">
                      <p className="text-[10px] text-gray-400">Final Grade</p>
                      <span className={`inline-flex items-center justify-center min-w-[48px] h-8 px-2 mt-1 rounded-lg text-sm font-bold ${gradePill(mobileDetailEntry.transmutedGrade)} tabular-nums`}>
                        {mobileDetailEntry.transmutedGrade}
                      </span>
                    </div>
                  </div>

                  {isCurrentQuarterLocked && mobileDetailSource === 'grading' && gradingTab !== 'summary' && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      This quarter is locked. Scores are read-only.
                    </p>
                  )}
                </div>

                <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom nav (mobile/tablet) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-gray-100 lg:hidden">
        <div className="flex items-center justify-around px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {bottomNavItems.map(item => {
            const Icon = item.icon; const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveSection(item.id); setMoreMenuOpen(false); }}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[56px]">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-[#185C20] shadow-md shadow-[#185C20]/20' : ''}`}>
                  <Icon size={18} className={isActive ? 'text-[#EDCD1F]' : 'text-gray-400'} />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#185C20]' : 'text-gray-400'}`}>{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-[56px]">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isInMoreMenu || moreMenuOpen ? 'bg-[#185C20] shadow-md shadow-[#185C20]/20' : ''}`}>
              <MoreHorizontal size={18} className={isInMoreMenu || moreMenuOpen ? 'text-[#EDCD1F]' : 'text-gray-400'} />
            </div>
            <span className={`text-[10px] font-bold ${isInMoreMenu || moreMenuOpen ? 'text-[#185C20]' : 'text-gray-400'}`}>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
