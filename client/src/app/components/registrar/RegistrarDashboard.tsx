import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  Users, GraduationCap, ClipboardList, BookOpen, UserCheck, UserX,
  TrendingUp, RefreshCw, Clock, PieChart as PieChartIcon, BarChart3,
  ShieldCheck, CalendarDays, Star, Settings2,
} from 'lucide-react';
import { getAccounts, getAttendanceSummary, type AttendanceSummary } from '../../../utils/apiClient';
import { readDatabaseOnline } from '../../../utils/database';
import { DEFAULT_SUBJECTS, type MasterSubject } from '../principal/PrincipalSubjects';
import type { UserProfile } from '../../../utils/auth';
import { AnimatedCard, AnimatedStatCard, TONES } from '../librarian/dashboardKit';

interface DashboardStudent {
  uid: string;
  displayName: string;
  gradeLevel?: string;
  section?: string;
  status?: string;
  createdAt?: string;
  photoUrl?: string;
}

interface DashboardTeacher {
  uid: string;
  status?: string;
}

interface RegistrarDashboardProps {
  user: UserProfile;
  onNavigate: (section: string) => void;
}

const EMPTY_ATTENDANCE: AttendanceSummary = {
  date: '', totalStudents: 0, present: 0, absent: 0, attendanceRate: 0, byGrade: {}, records: [],
};

const getManilaDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getManilaWeekdayLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short' }).format(date);

const isActive = (status?: string) => (status ?? 'active') === 'active';

const normalizeEvaluationCount = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object' && Array.isArray((value as { evaluations?: unknown[] }).evaluations)) {
    return (value as { evaluations: unknown[] }).evaluations.length;
  }
  return 0;
};

const QUICK_ACTIONS = [
  { id: 'teachers',    label: 'Teachers',        icon: Users,        color: 'bg-green-50 text-green-700' },
  { id: 'students',    label: 'Students',        icon: GraduationCap, color: 'bg-blue-50 text-blue-700' },
  { id: 'subjects',    label: 'Subjects',        icon: BookOpen,     color: 'bg-amber-50 text-amber-700' },
  { id: 'attendance',  label: 'Attendance Logs', icon: CalendarDays, color: 'bg-purple-50 text-purple-700' },
  { id: 'evaluations', label: 'Evaluation',      icon: Star,         color: 'bg-orange-50 text-orange-700' },
  { id: 'settings',    label: 'Settings',        icon: Settings2,    color: 'bg-gray-100 text-gray-700' },
];

export const RegistrarDashboard: React.FC<RegistrarDashboardProps> = ({ user, onNavigate }) => {
  const [students, setStudents] = useState<DashboardStudent[]>([]);
  const [teachers, setTeachers] = useState<DashboardTeacher[]>([]);
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [evaluationCount, setEvaluationCount] = useState(0);
  const [todaySummary, setTodaySummary] = useState<AttendanceSummary>(EMPTY_ATTENDANCE);
  const [weekTrend, setWeekTrend] = useState<{ key: string; label: string; present: number; absent: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return date;
      });

      const safeSummary = async (date: Date): Promise<AttendanceSummary> => {
        const key = getManilaDateKey(date);
        try {
          return await getAttendanceSummary(key);
        } catch {
          return { ...EMPTY_ATTENDANCE, date: key };
        }
      };

      const [studentsRes, teachersRes, subjectsPayload, evaluationsPayload, ...summaries] = await Promise.all([
        getAccounts({ role: 'student' }),
        getAccounts({ role: 'teacher' }),
        readDatabaseOnline<{ subjects?: MasterSubject[] }>('master_subjects'),
        readDatabaseOnline<unknown>('teacher_evaluations'),
        ...days.map((date) => safeSummary(date)),
      ]);

      setStudents((studentsRes.users ?? []) as DashboardStudent[]);
      setTeachers((teachersRes.users ?? []) as DashboardTeacher[]);
      setSubjects(subjectsPayload?.subjects?.length ? subjectsPayload.subjects : DEFAULT_SUBJECTS);
      setEvaluationCount(normalizeEvaluationCount(evaluationsPayload));
      setTodaySummary(summaries[summaries.length - 1]);
      setWeekTrend(summaries.map((summary, index) => ({
        key: summary.date,
        label: getManilaWeekdayLabel(days[index]),
        present: summary.present,
        absent: summary.absent,
      })));
    } catch (error) {
      console.error('Failed to load registrar dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeStudents = useMemo(() => students.filter((student) => isActive(student.status)), [students]);
  const activeTeachers = useMemo(() => teachers.filter((teacher) => isActive(teacher.status)), [teachers]);

  const gradeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    activeStudents.forEach((student) => {
      const grade = student.gradeLevel || 'Unassigned';
      counts.set(grade, (counts.get(grade) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));
  }, [activeStudents]);

  const attendanceToday = useMemo(() => {
    const data = [
      { name: 'Present', value: todaySummary.present, color: '#16a34a' },
      { name: 'Absent', value: todaySummary.absent, color: '#dc2626' },
    ];
    return data.filter((entry) => entry.value > 0);
  }, [todaySummary]);

  const recentEnrollments = useMemo(
    () => [...activeStudents]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6),
    [activeStudents],
  );

  const hasTrendActivity = weekTrend.some((day) => day.present > 0 || day.absent > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Multi-Role Operations Dashboard</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AnimatedStatCard label="Total Students" value={activeStudents.length} icon={GraduationCap} tone={TONES.purple} index={0} />
        <AnimatedStatCard label="Total Teachers" value={activeTeachers.length} icon={Users} tone={TONES.blue} index={1} />
        <AnimatedStatCard label="Present Today" value={todaySummary.present} icon={UserCheck} tone={TONES.green} index={2} hint={`${todaySummary.attendanceRate}% attendance rate`} />
        <AnimatedStatCard label="Absent Today" value={todaySummary.absent} icon={UserX} tone={TONES.red} index={3} />
        <AnimatedStatCard label="Subjects Offered" value={subjects.length} icon={BookOpen} tone={TONES.amber} index={4} />
        <AnimatedStatCard label="Evaluations Logged" value={evaluationCount} icon={ClipboardList} tone={TONES.orange} index={5} />
      </div>

      {/* Attendance trend + today's split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard className="lg:col-span-2 p-4" index={0}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-semibold text-gray-900">Attendance Trend</h3>
            <span className="text-xs text-gray-400 ml-auto">Last 7 days</span>
          </div>
          {hasTrendActivity ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weekTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ stroke: '#e5e7eb' }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#16a34a" strokeWidth={2.5} fill="url(#gPresent)" animationDuration={900} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#dc2626" strokeWidth={2.5} fill="url(#gAbsent)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty icon={TrendingUp} text="Attendance activity will appear here." />
          )}
        </AnimatedCard>

        <AnimatedCard className="p-4" index={1}>
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Attendance</h3>
          </div>
          {attendanceToday.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={attendanceToday}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    animationDuration={900}
                  >
                    {attendanceToday.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {attendanceToday.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600">{entry.name}</span>
                    <span className="text-xs font-semibold text-gray-900 ml-auto tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ChartEmpty icon={ShieldCheck} text="No attendance scans logged today." />
          )}
        </AnimatedCard>
      </div>

      {/* Grade distribution + recent enrollments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard className="p-4" index={0}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-semibold text-gray-900">Students by Grade Level</h3>
          </div>
          {gradeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, gradeDistribution.length * 40)}>
              <BarChart data={gradeDistribution} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="grade" width={110} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#f3e8ff', opacity: 0.4 }} />
                <Bar dataKey="count" name="Students" fill="#7e22ce" radius={[0, 6, 6, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty icon={BarChart3} text="No students registered yet." />
          )}
        </AnimatedCard>

        <AnimatedCard className="p-4" index={1}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Enrollments</h3>
          </div>
          {recentEnrollments.length > 0 ? (
            <div className="space-y-2">
              {recentEnrollments.map((student) => (
                <div key={student.uid} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {student.photoUrl
                      ? <img src={student.photoUrl} alt={student.displayName} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold">{student.displayName?.slice(0, 2).toUpperCase() || 'ST'}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{student.displayName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[student.gradeLevel, student.section].filter(Boolean).join(' - ') || 'Grade / section unassigned'}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 flex-shrink-0 hidden sm:block">
                    {student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <ChartEmpty icon={Clock} text="No students registered yet." />
          )}
        </AnimatedCard>
      </div>

      {/* Quick actions */}
      <AnimatedCard className="p-4" index={0}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate(action.id)}
                className="rounded-lg border border-gray-100 p-3 text-left hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${action.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-gray-700">{action.label}</p>
              </button>
            );
          })}
        </div>
      </AnimatedCard>
    </div>
  );
};

const ChartEmpty: React.FC<{ icon: React.ComponentType<{ className?: string }>; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Icon className="w-10 h-10 text-gray-200 mb-2" />
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

export default RegistrarDashboard;
