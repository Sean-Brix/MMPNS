import { getTeachers } from './studentData';
import {
  getCloudTable,
  isCloudDatabaseConfigured,
  setCloudTable,
  subscribeCloudTable,
} from './firestoreDatabase';

export type CalendarEventType = 'academic' | 'meeting' | 'deadline' | 'holiday' | 'event' | 'task';
export type CalendarAssignment = 'all' | 'teachers' | string[];
export type CalendarPriority = 'low' | 'medium' | 'high';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  type: CalendarEventType;
  description?: string;
  location?: string;
  assignedTo: CalendarAssignment;
  createdBy: string;
  color: string;
  priority: CalendarPriority;
}

export interface CalendarTeacher {
  username: string;
  name: string;
  department: string;
  employeeId?: string;
}

export const SCHOOL_CALENDAR_STORAGE_KEY = 'mmpns_principal_calendar';
export const SCHOOL_CALENDAR_UPDATED_EVENT = 'mmpns-school-calendar-updated';
const SCHOOL_CALENDAR_CLOUD_TABLE = 'calendar';

interface SchoolCalendarStore {
  events: CalendarEvent[];
}

export const EVENT_TYPES: { id: CalendarEventType; label: string; color: string }[] = [
  { id: 'academic', label: 'Academic', color: '#3b82f6' },
  { id: 'meeting', label: 'Meeting', color: '#8b5cf6' },
  { id: 'deadline', label: 'Deadline', color: '#ef4444' },
  { id: 'holiday', label: 'Holiday', color: '#10b981' },
  { id: 'event', label: 'School Event', color: '#f59e0b' },
  { id: 'task', label: 'Task', color: '#185C20' },
];

export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ev1', title: 'Q3 Grading Period Ends', date: '2026-02-20', type: 'deadline', description: 'All Q3 grades must be submitted', assignedTo: 'teachers', createdBy: 'principal', color: '#ef4444', priority: 'high' },
  { id: 'ev2', title: 'Q4 Grading Period Starts', date: '2026-02-23', type: 'academic', description: '4th Quarter classes begin', assignedTo: 'all', createdBy: 'principal', color: '#3b82f6', priority: 'medium' },
  { id: 'ev3', title: 'Faculty Meeting', date: '2026-03-06', time: '3:00 PM', type: 'meeting', description: 'Monthly faculty meeting', location: 'Conference Room', assignedTo: 'teachers', createdBy: 'principal', color: '#8b5cf6', priority: 'medium' },
  { id: 'ev4', title: 'Science Fair', date: '2026-03-13', type: 'event', description: 'Annual school science fair', location: 'School Gymnasium', assignedTo: 'all', createdBy: 'principal', color: '#f59e0b', priority: 'medium' },
  { id: 'ev5', title: 'Report Card Distribution', date: '2026-03-20', type: 'academic', description: 'Q3 report cards released', assignedTo: 'teachers', createdBy: 'principal', color: '#3b82f6', priority: 'high' },
  { id: 'ev6', title: 'MAPEH Week Preparation', date: '2026-03-16', type: 'task', description: 'Prepare materials for MAPEH week', assignedTo: ['amendiola'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
  { id: 'ev7', title: 'Math Olympiad Coaching', date: '2026-03-18', time: '2:00 PM', type: 'task', description: 'Prepare students for regional Math Olympiad', assignedTo: ['jreyes'], createdBy: 'principal', color: '#185C20', priority: 'high' },
  { id: 'ev8', title: 'ICT Lab Inventory', date: '2026-03-25', type: 'task', description: 'Complete ICT lab equipment inventory', assignedTo: ['msantos'], createdBy: 'principal', color: '#185C20', priority: 'low' },
  { id: 'ev9', title: 'Holy Week Break', date: '2026-03-30', endDate: '2026-04-03', type: 'holiday', description: 'No classes - Holy Week', assignedTo: 'all', createdBy: 'principal', color: '#10b981', priority: 'low' },
  { id: 'ev10', title: 'Parent-Teacher Conference', date: '2026-03-27', time: '9:00 AM', type: 'meeting', description: 'End-of-Q3 parent-teacher conferences', location: 'Respective Classrooms', assignedTo: 'teachers', createdBy: 'principal', color: '#8b5cf6', priority: 'high' },
  { id: 'ev11', title: 'Grade Submission Deadline', date: '2026-04-03', type: 'deadline', description: 'Final Q4 grades must be encoded', assignedTo: 'teachers', createdBy: 'principal', color: '#ef4444', priority: 'high' },
  { id: 'ev12', title: 'Reading Program Update', date: '2026-03-14', type: 'task', description: 'Submit reading program progress report', assignedTo: ['lgonzales'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
  { id: 'ev13', title: 'Science Lab Safety Check', date: '2026-03-19', type: 'task', description: 'Conduct quarterly safety inspection', assignedTo: ['rcruz'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
];

const FALLBACK_TEACHERS: CalendarTeacher[] = [
  { username: 'msantos', name: 'Prof. Santos', department: 'Technology' },
  { username: 'jreyes', name: 'Prof. Reyes', department: 'Mathematics' },
  { username: 'lgonzales', name: 'Prof. Gonzales', department: 'English' },
  { username: 'rcruz', name: 'Prof. Cruz', department: 'Science' },
  { username: 'amendiola', name: 'Prof. Mendiola', department: 'Social Studies' },
];

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const getCalendarTeachers = (): CalendarTeacher[] => {
  const teachers = getTeachers()
    .filter((teacher) => teacher.username && teacher.displayName)
    .map((teacher) => ({
      username: teacher.username,
      name: teacher.displayName,
      department: teacher.department || 'Faculty',
      employeeId: teacher.employeeId,
    }));

  return teachers.length > 0 ? teachers : FALLBACK_TEACHERS;
};

export const loadSchoolCalendarEvents = () =>
  readJson<CalendarEvent[]>(SCHOOL_CALENDAR_STORAGE_KEY, DEFAULT_CALENDAR_EVENTS);

export const saveSchoolCalendarEvents = (events: CalendarEvent[]) => {
  window.localStorage.setItem(SCHOOL_CALENDAR_STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent(SCHOOL_CALENDAR_UPDATED_EVENT));

  if (isCloudDatabaseConfigured()) {
    void setCloudTable<SchoolCalendarStore>(SCHOOL_CALENDAR_CLOUD_TABLE, { events }).catch((error) => {
      console.error('Failed to sync school calendar to cloud:', error);
    });
  }
};

const normalizeCalendarStore = (value: unknown): CalendarEvent[] | null => {
  if (Array.isArray(value)) {
    return value as CalendarEvent[];
  }

  if (value && typeof value === 'object' && Array.isArray((value as Partial<SchoolCalendarStore>).events)) {
    return (value as SchoolCalendarStore).events;
  }

  return null;
};

const persistCalendarLocally = (events: CalendarEvent[]) => {
  window.localStorage.setItem(SCHOOL_CALENDAR_STORAGE_KEY, JSON.stringify(events));
};

export const loadSchoolCalendarEventsOnline = async () => {
  if (isCloudDatabaseConfigured()) {
    try {
      const cloudValue = await getCloudTable<SchoolCalendarStore | CalendarEvent[]>(SCHOOL_CALENDAR_CLOUD_TABLE);
      const cloudEvents = normalizeCalendarStore(cloudValue);
      if (cloudEvents) {
        persistCalendarLocally(cloudEvents);
        return cloudEvents;
      }
    } catch (error) {
      console.error('Failed to load school calendar from cloud:', error);
    }
  }

  return loadSchoolCalendarEvents();
};

export const subscribeSchoolCalendarEvents = (
  callback: (events: CalendarEvent[]) => void,
) => {
  const refreshFromLocal = () => callback(loadSchoolCalendarEvents());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SCHOOL_CALENDAR_STORAGE_KEY) {
      refreshFromLocal();
    }
  };

  window.addEventListener(SCHOOL_CALENDAR_UPDATED_EVENT, refreshFromLocal);
  window.addEventListener('storage', handleStorage);
  refreshFromLocal();

  const unsubscribeCloud = isCloudDatabaseConfigured()
    ? subscribeCloudTable<SchoolCalendarStore | CalendarEvent[]>(
      SCHOOL_CALENDAR_CLOUD_TABLE,
      (cloudValue) => {
        const cloudEvents = normalizeCalendarStore(cloudValue);
        if (!cloudEvents) return;
        persistCalendarLocally(cloudEvents);
        callback(cloudEvents);
      },
      (error) => {
        console.error('School calendar cloud listener failed:', error);
      },
    )
    : () => {};

  return () => {
    window.removeEventListener(SCHOOL_CALENDAR_UPDATED_EVENT, refreshFromLocal);
    window.removeEventListener('storage', handleStorage);
    unsubscribeCloud();
  };
};

export const getCalendarEventType = (type: CalendarEventType) =>
  EVENT_TYPES.find((eventType) => eventType.id === type) || EVENT_TYPES[0];

export const sortCalendarEvents = (events: CalendarEvent[]) =>
  [...events].sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));

export const isCalendarEventAssignedToTeacher = (event: CalendarEvent, teacherUsername: string) => {
  if (event.assignedTo === 'all' || event.assignedTo === 'teachers') return true;
  return Array.isArray(event.assignedTo) && event.assignedTo.includes(teacherUsername);
};

export const getCalendarAssignmentLabel = (
  assignedTo: CalendarAssignment,
  teachers = getCalendarTeachers(),
) => {
  if (assignedTo === 'all') return 'Everyone';
  if (assignedTo === 'teachers') return 'All Teachers';
  if (Array.isArray(assignedTo)) {
    return assignedTo
      .map((username) => teachers.find((teacher) => teacher.username === username)?.name || username)
      .join(', ');
  }
  return '';
};
