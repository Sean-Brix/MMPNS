import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Calendar, FileText, Clock, Award, TrendingUp, LogOut, Lock,
  LayoutDashboard, GraduationCap, ClipboardCheck, CalendarDays, MessageSquare,
  Library, Menu, X, ChevronRight, Bell, AlertCircle, CheckCircle2, Star,
  Download, Users, BarChart3, Home, MoreHorizontal, ArrowLeft
} from 'lucide-react';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { loginWithCredentials, getStoredSession, logout } from '../../../utils/auth';
import { initializeDatabase } from '../../../utils/database';

export const StudentPortal: React.FC = () => {
  const goTo = useAppNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ displayName: string; initials: string; gradeLevel?: string } | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    void initializeDatabase();
    const session = getStoredSession();
    if (session?.role === 'student') {
      setIsAuthenticated(true);
      setStudentInfo({
        displayName: session.displayName,
        initials: session.initials || '',
        gradeLevel: session.gradeLevel,
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSigningIn) {
      return;
    }

    setIsSigningIn(true);
    setError('');

    const result = await loginWithCredentials(studentCode, password);
    if (result.success && result.user && result.role === 'student') {
      setIsAuthenticated(true);
      setStudentInfo({
        displayName: result.user.displayName,
        initials: result.user.initials,
      });
      setError('');
    } else {
      setError(result.error || 'Invalid access code or password. Please try again.');
    }

    setIsSigningIn(false);
  };

  const handleLogout = () => {
    void logout();
    setIsAuthenticated(false);
    setStudentInfo(null);
    setStudentCode('');
    setPassword('');
    setActiveSection('dashboard');
    setIsSigningIn(false);
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'grades', label: 'My Grades', icon: BarChart3 },
    { id: 'classes', label: 'My Classes', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'library', label: 'Library', icon: Library },
  ];

  // Bottom nav: 4 primary items + More
  const bottomNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'grades', label: 'Grades', icon: BarChart3 },
    { id: 'assignments', label: 'Tasks', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  const moreMenuItems = [
    { id: 'classes', label: 'My Classes', icon: BookOpen },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'library', label: 'Library', icon: Library },
  ];

  const isInMoreMenu = moreMenuItems.some(item => item.id === activeSection);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 relative">
        {/* Back button */}
        <div className="absolute top-8 left-8">
          <button onClick={() => goTo('home')} className="flex items-center gap-2 text-[#185C20] hover:text-[#1a6925] transition-colors text-sm font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-[#185C20]/10">
            <ArrowLeft size={16} /> Back to Website
          </button>
        </div>

        <div className="container mx-auto px-4 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-[#185C20]/10 p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#185C20] rounded-2xl flex items-center justify-center">
                <Lock size={32} className="text-[#EDCD1F]" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#185C20] mb-2">Student Portal</h1>
              <p className="text-sm text-[#185C20]/50">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#185C20]/70 mb-2 uppercase tracking-wider">Student Access Code</label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  disabled={isSigningIn}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20 font-mono tracking-widest"
                  placeholder="e.g. A4X7KM9P"
                  maxLength={8}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#185C20]/70 mb-2 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSigningIn}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isSigningIn}
                className={`w-full py-3 bg-[#185C20] text-white rounded-xl font-bold transition-colors ${
                  isSigningIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#185C20]/90'
                }`}
              >
                {isSigningIn ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

          </motion.div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────
  const renderDashboard = () => (
    <>
      {/* ── Mobile / Tablet Dashboard (< lg) ── */}
      <div className="lg:hidden space-y-4">
        {/* Horizontal scroll stats */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {[
            { value: '92.5', label: 'GPA', icon: TrendingUp, bg: 'bg-green-100', color: 'text-green-600' },
            { value: '8', label: 'Subjects', icon: BookOpen, bg: 'bg-blue-100', color: 'text-blue-600' },
            { value: '3', label: 'Pending', icon: FileText, bg: 'bg-purple-100', color: 'text-purple-600' },
            { value: '96%', label: 'Attendance', icon: Award, bg: 'bg-[#EDCD1F]/20', color: 'text-[#185C20]' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="flex-shrink-0 w-[130px] bg-white rounded-2xl p-3 border border-[#185C20]/10">
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <Icon size={16} className={stat.color} />
                </div>
                <p className="text-xl font-bold text-[#185C20]">{stat.value}</p>
                <p className="text-[10px] text-[#185C20]/50">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Today's Classes — compact horizontal */}
        <div className="bg-white rounded-2xl p-4 border border-[#185C20]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#185C20]">Today's Classes</h3>
            <button onClick={() => setActiveSection('schedule')} className="text-[10px] font-bold text-[#185C20]/50">View All</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {[
              { time: '8:00 AM', subject: 'Mathematics', room: 'Room 203' },
              { time: '9:00 AM', subject: 'Science', room: 'Lab 1' },
              { time: '10:30 AM', subject: 'English', room: 'Room 105' },
              { time: '1:00 PM', subject: 'Filipino', room: 'Room 204' },
            ].map((cls, idx) => (
              <div key={idx} className="flex-shrink-0 w-[140px] bg-[#185C20]/5 rounded-xl p-3">
                <span className="text-[10px] font-bold text-[#185C20] bg-[#EDCD1F] px-2 py-0.5 rounded-full">{cls.time}</span>
                <p className="font-bold text-sm text-[#185C20] mt-2 truncate">{cls.subject}</p>
                <p className="text-[10px] text-[#185C20]/50">{cls.room}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements banner */}
        <div className="bg-[#185C20] rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={14} className="text-[#EDCD1F]" />
            <span className="text-xs font-bold">Announcements</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex-shrink-0 p-2.5 bg-white/10 rounded-lg">
              <p className="text-[10px] text-white/60">Today</p>
              <p className="text-xs font-semibold">Science Fair entries due Friday</p>
            </div>
            <div className="flex-shrink-0 p-2.5 bg-white/10 rounded-lg">
              <p className="text-[10px] text-white/60">Tomorrow</p>
              <p className="text-xs font-semibold">Club recruitment starts</p>
            </div>
            <div className="flex-shrink-0 p-2.5 bg-white/10 rounded-lg">
              <p className="text-[10px] text-white/60">Mar 7</p>
              <p className="text-xs font-semibold">Quarterly exams begin</p>
            </div>
          </div>
        </div>

        {/* Upcoming Assignments — compact */}
        <div className="bg-white rounded-2xl p-4 border border-[#185C20]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#185C20]">Upcoming Tasks</h3>
            <button onClick={() => setActiveSection('assignments')} className="text-[10px] font-bold text-[#185C20]/50">View All</button>
          </div>
          <div className="space-y-2">
            {[
              { title: 'Math Quiz - Chapter 5', subject: 'Mathematics', due: 'Tomorrow', priority: 'high' },
              { title: 'Science Lab Report', subject: 'Science', due: 'Mar 5', priority: 'medium' },
              { title: 'English Essay - My Hero', subject: 'English', due: 'Mar 8', priority: 'low' },
            ].map((task, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                {task.priority === 'high' && <AlertCircle size={14} className="text-red-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-[#185C20] truncate">{task.title}</p>
                  <p className="text-[10px] text-[#185C20]/50">{task.subject}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                }`}>{task.due}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Grades — compact */}
        <div className="bg-white rounded-2xl p-4 border border-[#185C20]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#185C20]">Recent Grades</h3>
            <button onClick={() => setActiveSection('grades')} className="text-[10px] font-bold text-[#185C20]/50">View All</button>
          </div>
          <div className="space-y-2">
            {[
              { activity: 'Quiz 4 - Polynomials', subject: 'Mathematics', grade: 95 },
              { activity: 'Lab Experiment 3', subject: 'Science', grade: 90 },
              { activity: 'Book Report', subject: 'English', grade: 88 },
              { activity: 'Pagsusuri', subject: 'Filipino', grade: 92 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-[#185C20] truncate">{item.activity}</p>
                  <p className="text-[10px] text-[#185C20]/50">{item.subject}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                  item.grade >= 90 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>{item.grade}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions — compact grid */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setActiveSection('grades')} className="bg-white rounded-xl p-3 border border-[#185C20]/10 text-center">
            <BarChart3 size={20} className="text-[#185C20] mx-auto mb-1" />
            <p className="text-[10px] font-bold text-[#185C20]">Grades</p>
          </button>
          <button onClick={() => setActiveSection('assignments')} className="bg-white rounded-xl p-3 border border-[#185C20]/10 text-center">
            <FileText size={20} className="text-[#185C20] mx-auto mb-1" />
            <p className="text-[10px] font-bold text-[#185C20]">Tasks</p>
          </button>
          <button onClick={() => setActiveSection('schedule')} className="bg-white rounded-xl p-3 border border-[#185C20]/10 text-center">
            <CalendarDays size={20} className="text-[#185C20] mx-auto mb-1" />
            <p className="text-[10px] font-bold text-[#185C20]">Schedule</p>
          </button>
        </div>
      </div>

      {/* ── Desktop Dashboard (lg+) ── */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { value: '92.5', label: 'Overall GPA', icon: TrendingUp, bg: 'bg-green-100', color: 'text-green-600' },
            { value: '8', label: 'Active Subjects', icon: BookOpen, bg: 'bg-blue-100', color: 'text-blue-600' },
            { value: '3', label: 'Pending Tasks', icon: FileText, bg: 'bg-purple-100', color: 'text-purple-600' },
            { value: '96%', label: 'Attendance', icon: Award, bg: 'bg-[#EDCD1F]/20', color: 'text-[#185C20]' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                    <Icon size={24} className={stat.color} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#185C20]">{stat.value}</p>
                    <p className="text-xs text-[#185C20]/50">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => setActiveSection('grades')} className="bg-white rounded-2xl p-6 border border-[#185C20]/10 hover:border-[#185C20]/30 transition-all text-left">
            <div className="flex items-center gap-3 mb-2"><BarChart3 className="text-[#185C20]" size={24} /><h3 className="font-bold text-[#185C20]">View Grades</h3></div>
            <p className="text-sm text-[#185C20]/50">Check your latest scores</p>
          </button>
          <button onClick={() => setActiveSection('assignments')} className="bg-white rounded-2xl p-6 border border-[#185C20]/10 hover:border-[#185C20]/30 transition-all text-left">
            <div className="flex items-center gap-3 mb-2"><FileText className="text-[#185C20]" size={24} /><h3 className="font-bold text-[#185C20]">My Assignments</h3></div>
            <p className="text-sm text-[#185C20]/50">View pending homework & tasks</p>
          </button>
          <button onClick={() => setActiveSection('schedule')} className="bg-white rounded-2xl p-6 border border-[#185C20]/10 hover:border-[#185C20]/30 transition-all text-left">
            <div className="flex items-center gap-3 mb-2"><CalendarDays className="text-[#185C20]" size={24} /><h3 className="font-bold text-[#185C20]">Today's Schedule</h3></div>
            <p className="text-sm text-[#185C20]/50">See your upcoming classes</p>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
              <h2 className="text-xl font-bold text-[#185C20] mb-4">Upcoming Assignments</h2>
              <div className="space-y-3">
                {[
                  { title: 'Math Quiz - Chapter 5', subject: 'Mathematics', due: 'Tomorrow', priority: 'high' },
                  { title: 'Science Lab Report', subject: 'Science', due: 'Mar 5, 2026', priority: 'medium' },
                  { title: 'English Essay - My Hero', subject: 'English', due: 'Mar 8, 2026', priority: 'low' },
                  { title: 'Filipino Reaction Paper', subject: 'Filipino', due: 'Mar 10, 2026', priority: 'low' },
                ].map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-[#185C20]/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 flex-1">
                      {task.priority === 'high' && <AlertCircle size={16} className="text-red-500 flex-shrink-0" />}
                      <div className="flex-1"><p className="font-bold text-sm text-[#185C20]">{task.title}</p><p className="text-xs text-[#185C20]/50">{task.subject}</p></div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.due}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
              <h2 className="text-xl font-bold text-[#185C20] mb-4">Recent Grades</h2>
              <div className="space-y-3">
                {[
                  { subject: 'Mathematics', activity: 'Quiz 4 - Polynomials', grade: 95, date: 'Feb 28', status: 'excellent' },
                  { subject: 'Science', activity: 'Lab Experiment 3', grade: 90, date: 'Feb 27', status: 'excellent' },
                  { subject: 'English', activity: 'Book Report', grade: 88, date: 'Feb 25', status: 'good' },
                  { subject: 'Filipino', activity: 'Pagsusuri', grade: 92, date: 'Feb 24', status: 'excellent' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl hover:bg-[#185C20]/5 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1"><h3 className="font-bold text-[#185C20]">{item.activity}</h3><p className="text-xs text-[#185C20]/50 mt-1">{item.subject} &bull; {item.date}</p></div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === 'excellent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{item.grade}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
              <h2 className="text-lg font-bold text-[#185C20] mb-4">Today's Classes</h2>
              <div className="space-y-3">
                {[
                  { time: '8:00 AM', subject: 'Mathematics', room: 'Room 203' },
                  { time: '9:00 AM', subject: 'Science', room: 'Lab 1' },
                  { time: '10:30 AM', subject: 'English', room: 'Room 105' },
                  { time: '1:00 PM', subject: 'Filipino', room: 'Room 204' },
                ].map((cls, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-[#185C20]/5 rounded-xl">
                    <div className="w-14 h-14 bg-[#EDCD1F] rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-[#185C20]">{cls.time}</span></div>
                    <div className="flex-1"><p className="font-bold text-sm text-[#185C20]">{cls.subject}</p><p className="text-xs text-[#185C20]/50">{cls.room}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#185C20] rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4"><Bell size={20} className="text-[#EDCD1F]" /><h2 className="font-bold">Announcements</h2></div>
              <div className="space-y-3">
                <div className="p-3 bg-white/10 rounded-xl"><p className="text-xs text-white/60 mb-1">Today</p><p className="text-sm font-semibold">Science Fair entries due Friday</p></div>
                <div className="p-3 bg-white/10 rounded-xl"><p className="text-xs text-white/60 mb-1">Tomorrow</p><p className="text-sm font-semibold">Club recruitment starts</p></div>
                <div className="p-3 bg-white/10 rounded-xl"><p className="text-xs text-white/60 mb-1">Mar 7</p><p className="text-sm font-semibold">Quarterly exams begin</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── My Grades ──────────────────────────────────────────────
  const renderGrades = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-[#185C20]">92.5</p>
          <p className="text-xs text-[#185C20]/50 mt-1">General Average</p>
          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">With Honors</span>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-[#185C20]">95</p>
          <p className="text-xs text-[#185C20]/50 mt-1">Highest Grade</p>
          <p className="text-xs text-[#185C20]/40 mt-1">Mathematics</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-[#185C20]">2nd</p>
          <p className="text-xs text-[#185C20]/50 mt-1">Class Rank</p>
          <p className="text-xs text-[#185C20]/40 mt-1">Out of 35 students</p>
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#185C20]">Subject Grades</h2>
          <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#185C20]/20">
            <option>Quarter 3 (Current)</option>
            <option>Quarter 2</option>
            <option>Quarter 1</option>
          </select>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#185C20]/10">
                <th className="text-left py-3 px-4 text-sm font-bold text-[#185C20]">Subject</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-[#185C20]">Teacher</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#185C20]">Q1</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#185C20]">Q2</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#185C20]">Q3</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#185C20]">Average</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#185C20]">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { subject: 'Mathematics', teacher: 'Mr. Santos', q1: 94, q2: 96, q3: 95, avg: 95.0, color: 'bg-blue-500' },
                { subject: 'Science', teacher: 'Ms. Garcia', q1: 91, q2: 90, q3: 92, avg: 91.0, color: 'bg-green-500' },
                { subject: 'English', teacher: 'Mrs. Reyes', q1: 89, q2: 88, q3: 90, avg: 89.0, color: 'bg-purple-500' },
                { subject: 'Filipino', teacher: 'Mr. Cruz', q1: 93, q2: 94, q3: 94, avg: 93.7, color: 'bg-yellow-500' },
                { subject: 'Social Studies', teacher: 'Ms. Lim', q1: 88, q2: 90, q3: 89, avg: 89.0, color: 'bg-red-500' },
                { subject: 'MAPEH', teacher: 'Mr. Torres', q1: 95, q2: 93, q3: 94, avg: 94.0, color: 'bg-pink-500' },
                { subject: 'TLE', teacher: 'Mrs. Bautista', q1: 92, q2: 91, q3: 93, avg: 92.0, color: 'bg-orange-500' },
                { subject: 'Values Education', teacher: 'Sr. Lucia', q1: 96, q2: 95, q3: 96, avg: 95.7, color: 'bg-teal-500' },
              ].map((subj, idx) => (
                <tr key={idx} className="border-b border-[#185C20]/5 hover:bg-[#185C20]/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 ${subj.color} rounded-full`} />
                      <span className="font-semibold text-[#185C20]">{subj.subject}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#185C20]/70 text-sm">{subj.teacher}</td>
                  <td className="py-3 px-4 text-center text-[#185C20]/70">{subj.q1}</td>
                  <td className="py-3 px-4 text-center text-[#185C20]/70">{subj.q2}</td>
                  <td className="py-3 px-4 text-center text-[#185C20]/70">{subj.q3}</td>
                  <td className="py-3 px-4 text-center font-bold text-[#185C20]">{subj.avg.toFixed(1)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      subj.avg >= 95 ? 'bg-green-100 text-green-700' :
                      subj.avg >= 90 ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {subj.avg >= 95 ? 'Outstanding' : subj.avg >= 90 ? 'Excellent' : 'Good'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {[
            { subject: 'Mathematics', teacher: 'Mr. Santos', q3: 95, avg: 95.0, color: 'bg-blue-500' },
            { subject: 'Science', teacher: 'Ms. Garcia', q3: 92, avg: 91.0, color: 'bg-green-500' },
            { subject: 'English', teacher: 'Mrs. Reyes', q3: 90, avg: 89.0, color: 'bg-purple-500' },
            { subject: 'Filipino', teacher: 'Mr. Cruz', q3: 94, avg: 93.7, color: 'bg-yellow-500' },
            { subject: 'Social Studies', teacher: 'Ms. Lim', q3: 89, avg: 89.0, color: 'bg-red-500' },
            { subject: 'MAPEH', teacher: 'Mr. Torres', q3: 94, avg: 94.0, color: 'bg-pink-500' },
            { subject: 'TLE', teacher: 'Mrs. Bautista', q3: 93, avg: 92.0, color: 'bg-orange-500' },
            { subject: 'Values Education', teacher: 'Sr. Lucia', q3: 96, avg: 95.7, color: 'bg-teal-500' },
          ].map((subj, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-6 ${subj.color} rounded-full`} />
                  <p className="font-bold text-[#185C20]">{subj.subject}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  subj.avg >= 95 ? 'bg-green-100 text-green-700' :
                  subj.avg >= 90 ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {subj.avg.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-[#185C20]/50">{subj.teacher} &bull; Current: {subj.q3}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── My Classes ─────────────────────────────────────────────
  const renderClasses = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
        <h2 className="text-2xl font-bold text-[#185C20] mb-6">My Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { subject: 'Mathematics', teacher: 'Mr. Santos', section: 'Grade 9 - Section A', schedule: 'Mon, Wed, Fri 8:00 AM', room: 'Room 203', students: 35, color: 'bg-blue-500' },
            { subject: 'Science', teacher: 'Ms. Garcia', section: 'Grade 9 - Section A', schedule: 'Tue, Thu 9:00 AM', room: 'Lab 1', students: 35, color: 'bg-green-500' },
            { subject: 'English', teacher: 'Mrs. Reyes', section: 'Grade 9 - Section A', schedule: 'Mon, Wed, Fri 10:30 AM', room: 'Room 105', students: 35, color: 'bg-purple-500' },
            { subject: 'Filipino', teacher: 'Mr. Cruz', section: 'Grade 9 - Section A', schedule: 'Tue, Thu 1:00 PM', room: 'Room 204', students: 35, color: 'bg-yellow-500' },
            { subject: 'Social Studies', teacher: 'Ms. Lim', section: 'Grade 9 - Section A', schedule: 'Mon, Wed 2:00 PM', room: 'Room 301', students: 35, color: 'bg-red-500' },
            { subject: 'MAPEH', teacher: 'Mr. Torres', section: 'Grade 9 - Section A', schedule: 'Fri 1:00 PM', room: 'Gym / Room 102', students: 35, color: 'bg-pink-500' },
            { subject: 'TLE', teacher: 'Mrs. Bautista', section: 'Grade 9 - Section A', schedule: 'Tue, Thu 3:00 PM', room: 'TLE Room', students: 35, color: 'bg-orange-500' },
            { subject: 'Values Education', teacher: 'Sr. Lucia', section: 'Grade 9 - Section A', schedule: 'Wed 3:00 PM', room: 'Room 108', students: 35, color: 'bg-teal-500' },
          ].map((cls, idx) => (
            <div key={idx} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer border border-[#185C20]/5">
              <div className={`w-full h-2 ${cls.color} rounded-full mb-4`}></div>
              <h3 className="font-bold text-[#185C20] text-lg mb-1">{cls.subject}</h3>
              <p className="text-sm text-[#185C20]/70 mb-4">{cls.teacher}</p>
              <div className="space-y-2 text-sm text-[#185C20]/50">
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{cls.students} classmates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>{cls.schedule}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{cls.room}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Assignments ────────────────────────────────────────────
  const renderAssignments = () => (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
        <h2 className="text-2xl font-bold text-[#185C20] mb-6">Assignments</h2>

        {/* Pending */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#185C20] mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-500" />
            Pending ({3})
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Math Quiz - Chapter 5: Polynomials', subject: 'Mathematics', teacher: 'Mr. Santos', due: 'Mar 3, 2026', type: 'Quiz', points: 50 },
              { title: 'Science Lab Report - Photosynthesis', subject: 'Science', teacher: 'Ms. Garcia', due: 'Mar 5, 2026', type: 'Report', points: 100 },
              { title: 'English Essay - My Hero', subject: 'English', teacher: 'Mrs. Reyes', due: 'Mar 8, 2026', type: 'Essay', points: 75 },
            ].map((a, idx) => (
              <div key={idx} className="p-5 bg-gray-50 rounded-xl hover:bg-[#185C20]/5 transition-colors border-l-4 border-yellow-400">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-[#185C20]">{a.title}</h4>
                    <p className="text-xs text-[#185C20]/50 mt-1">{a.subject} &bull; {a.teacher}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{a.type}</span>
                      <span className="text-xs text-[#185C20]/50">{a.points} points</span>
                    </div>
                  </div>
                  <div className="text-right flex sm:flex-col items-center sm:items-end gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Due: {a.due}</span>
                    <button className="px-4 py-2 bg-[#185C20] text-white rounded-xl text-xs font-bold hover:bg-[#185C20]/90 transition-colors">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h3 className="text-lg font-bold text-[#185C20] mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            Completed ({5})
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Quiz 4 - Polynomials', subject: 'Mathematics', grade: '95/100', date: 'Feb 28' },
              { title: 'Lab Experiment 3', subject: 'Science', grade: '90/100', date: 'Feb 27' },
              { title: 'Book Report - Noli Me Tangere', subject: 'Filipino', grade: '92/100', date: 'Feb 25' },
              { title: 'Social Studies Worksheet', subject: 'Social Studies', grade: '88/100', date: 'Feb 23' },
              { title: 'TLE Project - Budget Plan', subject: 'TLE', grade: '93/100', date: 'Feb 20' },
            ].map((a, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border-l-4 border-green-400">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#185C20]">{a.title}</h4>
                    <p className="text-xs text-[#185C20]/50 mt-1">{a.subject} &bull; Submitted {a.date}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">{a.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Schedule ───────────────────────────────────────────────
  const renderSchedule = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const schedule: Record<string, { time: string; subject: string; teacher: string; room: string; color: string }[]> = {
      Monday: [
        { time: '8:00 - 9:00 AM', subject: 'Mathematics', teacher: 'Mr. Santos', room: 'Room 203', color: 'bg-blue-500' },
        { time: '10:30 - 11:30 AM', subject: 'English', teacher: 'Mrs. Reyes', room: 'Room 105', color: 'bg-purple-500' },
        { time: '2:00 - 3:00 PM', subject: 'Social Studies', teacher: 'Ms. Lim', room: 'Room 301', color: 'bg-red-500' },
      ],
      Tuesday: [
        { time: '9:00 - 10:00 AM', subject: 'Science', teacher: 'Ms. Garcia', room: 'Lab 1', color: 'bg-green-500' },
        { time: '1:00 - 2:00 PM', subject: 'Filipino', teacher: 'Mr. Cruz', room: 'Room 204', color: 'bg-yellow-500' },
        { time: '3:00 - 4:00 PM', subject: 'TLE', teacher: 'Mrs. Bautista', room: 'TLE Room', color: 'bg-orange-500' },
      ],
      Wednesday: [
        { time: '8:00 - 9:00 AM', subject: 'Mathematics', teacher: 'Mr. Santos', room: 'Room 203', color: 'bg-blue-500' },
        { time: '10:30 - 11:30 AM', subject: 'English', teacher: 'Mrs. Reyes', room: 'Room 105', color: 'bg-purple-500' },
        { time: '2:00 - 3:00 PM', subject: 'Social Studies', teacher: 'Ms. Lim', room: 'Room 301', color: 'bg-red-500' },
        { time: '3:00 - 4:00 PM', subject: 'Values Education', teacher: 'Sr. Lucia', room: 'Room 108', color: 'bg-teal-500' },
      ],
      Thursday: [
        { time: '9:00 - 10:00 AM', subject: 'Science', teacher: 'Ms. Garcia', room: 'Lab 1', color: 'bg-green-500' },
        { time: '1:00 - 2:00 PM', subject: 'Filipino', teacher: 'Mr. Cruz', room: 'Room 204', color: 'bg-yellow-500' },
        { time: '3:00 - 4:00 PM', subject: 'TLE', teacher: 'Mrs. Bautista', room: 'TLE Room', color: 'bg-orange-500' },
      ],
      Friday: [
        { time: '8:00 - 9:00 AM', subject: 'Mathematics', teacher: 'Mr. Santos', room: 'Room 203', color: 'bg-blue-500' },
        { time: '10:30 - 11:30 AM', subject: 'English', teacher: 'Mrs. Reyes', room: 'Room 105', color: 'bg-purple-500' },
        { time: '1:00 - 2:00 PM', subject: 'MAPEH', teacher: 'Mr. Torres', room: 'Gym', color: 'bg-pink-500' },
      ],
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
          <h2 className="text-2xl font-bold text-[#185C20] mb-6">Weekly Schedule</h2>
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day}>
                <h3 className="font-bold text-[#185C20] mb-3 flex items-center gap-2">
                  <CalendarDays size={16} className="text-[#185C20]/50" />
                  {day}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schedule[day].map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border-l-4 hover:shadow-md transition-all" style={{ borderLeftColor: '' }}>
                      <div className={`w-full h-1 ${item.color} rounded-full mb-3`} />
                      <p className="font-bold text-[#185C20]">{item.subject}</p>
                      <p className="text-xs text-[#185C20]/50 mt-1">{item.teacher}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="flex items-center gap-1 text-xs text-[#185C20]/60">
                          <Clock size={12} /> {item.time}
                        </span>
                        <span className="text-xs text-[#185C20]/40">{item.room}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Attendance ─────────────────────────────────────────────
  const renderAttendance = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-green-600">96%</p>
          <p className="text-xs text-[#185C20]/50 mt-1">Attendance Rate</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-[#185C20]">115</p>
          <p className="text-xs text-[#185C20]/50 mt-1">Days Present</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-yellow-600">3</p>
          <p className="text-xs text-[#185C20]/50 mt-1">Days Absent</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10 text-center">
          <p className="text-3xl font-bold text-blue-600">2</p>
          <p className="text-xs text-[#185C20]/50 mt-1">Late Arrivals</p>
        </div>
      </div>

      {/* Monthly Record */}
      <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#185C20]">Attendance Record</h2>
          <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#185C20]/20">
            <option>March 2026</option>
            <option>February 2026</option>
            <option>January 2026</option>
          </select>
        </div>
        <div className="space-y-2">
          {[
            { date: 'Mon, Mar 2', status: 'present', time: '7:45 AM' },
            { date: 'Fri, Feb 27', status: 'present', time: '7:50 AM' },
            { date: 'Thu, Feb 26', status: 'present', time: '7:40 AM' },
            { date: 'Wed, Feb 25', status: 'late', time: '8:15 AM' },
            { date: 'Tue, Feb 24', status: 'present', time: '7:30 AM' },
            { date: 'Mon, Feb 23', status: 'present', time: '7:42 AM' },
            { date: 'Fri, Feb 20', status: 'absent', time: '-' },
            { date: 'Thu, Feb 19', status: 'present', time: '7:38 AM' },
            { date: 'Wed, Feb 18', status: 'present', time: '7:55 AM' },
            { date: 'Tue, Feb 17', status: 'present', time: '7:35 AM' },
          ].map((day, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  day.status === 'present' ? 'bg-green-500' :
                  day.status === 'late' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span className="font-semibold text-[#185C20] text-sm">{day.date}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#185C20]/50">{day.time !== '-' ? `Arrived: ${day.time}` : 'No record'}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                  day.status === 'present' ? 'bg-green-100 text-green-700' :
                  day.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {day.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Messages ───────────────────────────────────────────────
  const renderMessages = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#185C20]">Messages</h2>
          <button className="px-4 py-2 bg-[#185C20] text-white rounded-xl font-bold text-sm hover:bg-[#185C20]/90 transition-colors">
            + New Message
          </button>
        </div>
        <div className="space-y-3">
          {[
            { from: 'Mr. Santos', subject: 'Math Quiz Tomorrow - Reminder', preview: 'Don\'t forget to study Chapter 5. The quiz will cover polynomials and factoring...', time: '2 hours ago', unread: true },
            { from: 'Ms. Garcia', subject: 'Lab Report Guidelines Updated', preview: 'I\'ve updated the format for the lab report. Please check the new template attached...', time: '5 hours ago', unread: true },
            { from: 'Mrs. Reyes', subject: 'Essay Feedback', preview: 'Great work on your last essay! Here are some suggestions for improvement...', time: 'Yesterday', unread: false },
            { from: 'School Admin', subject: 'Quarterly Exam Schedule', preview: 'Please find attached the schedule for the upcoming quarterly exams starting March 7...', time: '2 days ago', unread: false },
            { from: 'Mr. Cruz', subject: 'Filipino Class - Book Assignment', preview: 'Please read chapters 10-15 of Noli Me Tangere before our next class discussion...', time: '3 days ago', unread: false },
            { from: 'Ms. Lim', subject: 'Social Studies Group Project', preview: 'Your group has been assigned Topic 3: Philippine Economic Development. Please coordinate...', time: '4 days ago', unread: false },
          ].map((msg, idx) => (
            <div key={idx} className={`p-5 rounded-xl cursor-pointer transition-all hover:shadow-md ${
              msg.unread ? 'bg-[#185C20]/5 border border-[#185C20]/20' : 'bg-gray-50 border border-transparent'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.unread ? 'bg-[#185C20] text-white' : 'bg-gray-200 text-[#185C20]/50'
                  }`}>
                    <span className="text-sm font-bold">{msg.from.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${msg.unread ? 'font-bold text-[#185C20]' : 'font-semibold text-[#185C20]/70'}`}>{msg.from}</p>
                      {msg.unread && <span className="w-2 h-2 bg-[#EDCD1F] rounded-full" />}
                    </div>
                    <p className="text-sm font-semibold text-[#185C20] mt-0.5 truncate">{msg.subject}</p>
                    <p className="text-xs text-[#185C20]/40 mt-1 truncate">{msg.preview}</p>
                  </div>
                </div>
                <span className="text-xs text-[#185C20]/40 whitespace-nowrap flex-shrink-0">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Library ────────────────────────────────────────────────
  const renderLibrary = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-[#185C20]/10">
        <h2 className="text-2xl font-bold text-[#185C20] mb-6">Library & Resources</h2>

        {/* Downloadable Resources */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#185C20] mb-4">Study Materials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Math - Polynomials Review Sheet', subject: 'Mathematics', type: 'PDF', size: '2.4 MB', uploaded: 'Feb 28' },
              { title: 'Science - Photosynthesis Diagram', subject: 'Science', type: 'PDF', size: '1.8 MB', uploaded: 'Feb 26' },
              { title: 'English - Grammar Exercises', subject: 'English', type: 'DOCX', size: '850 KB', uploaded: 'Feb 25' },
              { title: 'Filipino - Noli Me Tangere Guide', subject: 'Filipino', type: 'PDF', size: '3.1 MB', uploaded: 'Feb 20' },
              { title: 'Social Studies - Philippine Map', subject: 'Social Studies', type: 'PNG', size: '5.2 MB', uploaded: 'Feb 18' },
              { title: 'TLE - Budget Template', subject: 'TLE', type: 'XLSX', size: '320 KB', uploaded: 'Feb 15' },
            ].map((res, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl flex items-center gap-4 hover:bg-[#185C20]/5 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-[#185C20]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-[#185C20]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#185C20] truncate">{res.title}</p>
                  <p className="text-xs text-[#185C20]/50">{res.subject} &bull; {res.type} &bull; {res.size}</p>
                </div>
                <button className="p-2 bg-[#185C20] text-white rounded-lg hover:bg-[#185C20]/90 transition-colors flex-shrink-0">
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowed Books */}
        <div>
          <h3 className="text-lg font-bold text-[#185C20] mb-4">Borrowed Books</h3>
          <div className="space-y-3">
            {[
              { title: 'Noli Me Tangere', author: 'Jose Rizal', borrowed: 'Feb 10, 2026', due: 'Mar 10, 2026', status: 'active' },
              { title: 'Algebra & Trigonometry', author: 'Stewart, Redlin & Watson', borrowed: 'Jan 15, 2026', due: 'Mar 15, 2026', status: 'active' },
              { title: 'General Science Textbook', author: 'DepEd', borrowed: 'Jan 8, 2026', due: 'Feb 8, 2026', status: 'returned' },
            ].map((book, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl flex items-center gap-4">
                <div className="w-12 h-16 bg-[#EDCD1F]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-[#185C20]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-[#185C20]">{book.title}</p>
                  <p className="text-xs text-[#185C20]/50">{book.author}</p>
                  <p className="text-xs text-[#185C20]/40 mt-1">Due: {book.due}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  book.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  {book.status === 'active' ? 'Borrowed' : 'Returned'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Content Router ─────────────────────────────────────────
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'grades':
        return renderGrades();
      case 'classes':
        return renderClasses();
      case 'assignments':
        return renderAssignments();
      case 'schedule':
        return renderSchedule();
      case 'attendance':
        return renderAttendance();
      case 'messages':
        return renderMessages();
      case 'library':
        return renderLibrary();
      default:
        return renderDashboard();
    }
  };

  // ── Layout ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF9F6] selection:bg-[#EDCD1F] selection:text-[#185C20] flex">
      {/* More Menu Overlay */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMoreMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl"
            >
              <div className="p-2 flex justify-center">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="px-4 pb-2">
                <h3 className="text-sm font-bold text-[#185C20]/50 uppercase tracking-wider px-2 mb-2">More</h3>
                <div className="space-y-1">
                  {moreMenuItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          setMoreMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                          isActive
                            ? 'bg-[#185C20] text-white'
                            : 'text-[#185C20] hover:bg-[#185C20]/5'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-sm font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
                  <button
                    onClick={() => { setMoreMenuOpen(false); goTo('home'); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[#185C20]/70 hover:bg-[#185C20]/5 transition-all"
                  >
                    <Home size={20} />
                    <span className="text-sm font-bold">Back to Site</span>
                  </button>
                  <button
                    onClick={() => { setMoreMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut size={20} />
                    <span className="text-sm font-bold">Sign Out</span>
                  </button>
                </div>
              </div>
              <div className="pb-[env(safe-area-inset-bottom,8px)]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar — desktop only */}
      <motion.aside
        initial={false}
        animate={{ 
          x: sidebarOpen ? 0 : -280,
          width: 280
        }}
        className="bg-[#185C20] text-white flex-shrink-0 overflow-hidden sticky top-0 h-screen hidden lg:flex"
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDCD1F] flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} className="text-[#185C20]" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-serif font-bold text-sm whitespace-nowrap">MMPNS</h1>
                <p className="text-xs text-white/60 whitespace-nowrap">Student Portal</p>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#EDCD1F]">{studentInfo?.initials || 'S'}</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold whitespace-nowrap">{studentInfo?.displayName || 'Student'}</p>
                <p className="text-xs text-white/50 whitespace-nowrap">{studentInfo?.gradeLevel || 'Student'}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 px-2">
              <Star size={12} className="text-[#EDCD1F]" />
              <span className="text-xs text-white/60">With Honors &bull; ID: 2025-09-0142</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
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
                  <span className="text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
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
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-[#185C20]/10 px-4 lg:px-8 py-3 lg:py-6 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile/tablet header with avatar */}
              <div className="flex lg:hidden items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#185C20] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#EDCD1F]">{studentInfo?.initials || 'S'}</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base text-[#185C20] truncate">
                    {studentInfo?.displayName || 'Student'}
                  </h2>
                  <p className="text-[10px] text-[#185C20]/50">{studentInfo?.gradeLevel || 'Student'}</p>
                </div>
              </div>
              {/* Desktop header */}
              <div className="hidden lg:block min-w-0">
                <h2 className="font-bold text-2xl text-[#185C20] truncate">
                  {sidebarItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-[#185C20]/50 mt-1">
                  {studentInfo?.displayName || 'Student'} &bull; {studentInfo?.gradeLevel || 'Student'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="lg:hidden p-2 text-[#185C20] hover:bg-[#185C20]/5 rounded-lg transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <span className="text-xs font-bold text-[#185C20]/40 uppercase tracking-wider hidden lg:block">
                Student Portal
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#185C20]/10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="flex items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {bottomNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setMoreMenuOpen(false); }}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px]"
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#185C20] text-white' : 'text-[#185C20]/40'}`}>
                  <Icon size={20} />
                </div>
                <span className={`text-[10px] font-bold transition-all ${isActive ? 'text-[#185C20]' : 'text-[#185C20]/40'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px]"
          >
            <div className={`p-1.5 rounded-xl transition-all ${isInMoreMenu || moreMenuOpen ? 'bg-[#185C20] text-white' : 'text-[#185C20]/40'}`}>
              <MoreHorizontal size={20} />
            </div>
            <span className={`text-[10px] font-bold transition-all ${isInMoreMenu || moreMenuOpen ? 'text-[#185C20]' : 'text-[#185C20]/40'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
