import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon, Plus, X, Check, ChevronLeft, ChevronRight,
  Users, Clock, MapPin, Bell, Trash2, Save, Tag, AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, isToday, getDay } from 'date-fns';

/* ═══════════════════ Types ═══════════════════ */
export interface CalendarEvent {
  id: string; title: string; date: string; endDate?: string; time?: string;
  type: 'academic' | 'meeting' | 'deadline' | 'holiday' | 'event' | 'task';
  description?: string; location?: string; assignedTo: 'all' | 'teachers' | string[];
  createdBy: string; color: string; priority: 'low' | 'medium' | 'high';
}

const STORAGE_KEY = 'mmpns_principal_calendar';

const TEACHERS = [
  { username: 'msantos', name: 'Prof. Santos' }, { username: 'jreyes', name: 'Prof. Reyes' },
  { username: 'lgonzales', name: 'Prof. Gonzales' }, { username: 'rcruz', name: 'Prof. Cruz' },
  { username: 'amendiola', name: 'Prof. Mendiola' },
];

const EVENT_TYPES = [
  { id: 'academic', label: 'Academic', color: '#3b82f6' }, { id: 'meeting', label: 'Meeting', color: '#8b5cf6' },
  { id: 'deadline', label: 'Deadline', color: '#ef4444' }, { id: 'holiday', label: 'Holiday', color: '#10b981' },
  { id: 'event', label: 'School Event', color: '#f59e0b' }, { id: 'task', label: 'Task', color: '#185C20' },
];

const DEFAULT_EVENTS: CalendarEvent[] = [
  { id: 'ev1', title: 'Q3 Grading Period Ends', date: '2026-02-20', type: 'deadline', description: 'All Q3 grades must be submitted', assignedTo: 'teachers', createdBy: 'principal', color: '#ef4444', priority: 'high' },
  { id: 'ev2', title: 'Q4 Grading Period Starts', date: '2026-02-23', type: 'academic', description: '4th Quarter classes begin', assignedTo: 'all', createdBy: 'principal', color: '#3b82f6', priority: 'medium' },
  { id: 'ev3', title: 'Faculty Meeting', date: '2026-03-06', time: '3:00 PM', type: 'meeting', description: 'Monthly faculty meeting', location: 'Conference Room', assignedTo: 'teachers', createdBy: 'principal', color: '#8b5cf6', priority: 'medium' },
  { id: 'ev4', title: 'Science Fair', date: '2026-03-13', type: 'event', description: 'Annual school science fair', location: 'School Gymnasium', assignedTo: 'all', createdBy: 'principal', color: '#f59e0b', priority: 'medium' },
  { id: 'ev5', title: 'Report Card Distribution', date: '2026-03-20', type: 'academic', description: 'Q3 report cards released', assignedTo: 'teachers', createdBy: 'principal', color: '#3b82f6', priority: 'high' },
  { id: 'ev6', title: 'MAPEH Week Preparation', date: '2026-03-16', type: 'task', description: 'Prepare materials for MAPEH week', assignedTo: ['amendiola'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
  { id: 'ev7', title: 'Math Olympiad Coaching', date: '2026-03-18', time: '2:00 PM', type: 'task', description: 'Prepare students for regional Math Olympiad', assignedTo: ['jreyes'], createdBy: 'principal', color: '#185C20', priority: 'high' },
  { id: 'ev8', title: 'ICT Lab Inventory', date: '2026-03-25', type: 'task', description: 'Complete ICT lab equipment inventory', assignedTo: ['msantos'], createdBy: 'principal', color: '#185C20', priority: 'low' },
  { id: 'ev9', title: 'Holy Week Break', date: '2026-03-30', endDate: '2026-04-03', type: 'holiday', description: 'No classes — Holy Week', assignedTo: 'all', createdBy: 'principal', color: '#10b981', priority: 'low' },
  { id: 'ev10', title: 'Parent-Teacher Conference', date: '2026-03-27', time: '9:00 AM', type: 'meeting', description: 'End-of-Q3 parent-teacher conferences', location: 'Respective Classrooms', assignedTo: 'teachers', createdBy: 'principal', color: '#8b5cf6', priority: 'high' },
  { id: 'ev11', title: 'Grade Submission Deadline', date: '2026-04-03', type: 'deadline', description: 'Final Q4 grades must be encoded', assignedTo: 'teachers', createdBy: 'principal', color: '#ef4444', priority: 'high' },
  { id: 'ev12', title: 'Reading Program Update', date: '2026-03-14', type: 'task', description: 'Submit reading program progress report', assignedTo: ['lgonzales'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
  { id: 'ev13', title: 'Science Lab Safety Check', date: '2026-03-19', type: 'task', description: 'Conduct quarterly safety inspection', assignedTo: ['rcruz'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ═══════════════════ Modal Shell ═══════════════════ */
const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; maxW?: string }> = ({ open, onClose, children, maxW = 'max-w-lg' }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className={`bg-white rounded-lg shadow-2xl w-full ${maxW} max-h-[85vh] overflow-hidden flex flex-col`}
          onClick={e => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const PrincipalCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formType, setFormType] = useState<CalendarEvent['type']>('task');
  const [formDesc, setFormDesc] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAssignTo, setFormAssignTo] = useState<'all' | 'teachers' | 'specific'>('teachers');
  const [formTeachers, setFormTeachers] = useState<string[]>([]);
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY); setEvents(saved ? JSON.parse(saved) : DEFAULT_EVENTS); }, []);
  const save = (updated: CalendarEvent[]) => { setEvents(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); };

  const daysInMonth = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);
  const startPadding = getDay(startOfMonth(currentMonth));
  const eventsForDate = (date: Date) => events.filter(e => isSameDay(new Date(e.date), date));

  const openAddModal = () => { setFormDate(format(selectedDate || new Date(2026, 2, 11), 'yyyy-MM-dd')); setShowAdd(true); };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowDayModal(true);
  };

  const handleAddEvent = () => {
    if (!formTitle.trim() || !formDate) return;
    const typeInfo = EVENT_TYPES.find(t => t.id === formType);
    save([...events, {
      id: `ev-${Date.now()}`, title: formTitle.trim(), date: formDate, endDate: formEndDate || undefined,
      time: formTime || undefined, type: formType, description: formDesc || undefined, location: formLocation || undefined,
      assignedTo: formAssignTo === 'specific' ? formTeachers : formAssignTo, createdBy: 'principal',
      color: typeInfo?.color || '#185C20', priority: formPriority,
    }]);
    resetForm();
  };

  const deleteEvent = (id: string) => save(events.filter(e => e.id !== id));

  const resetForm = () => {
    setFormTitle(''); setFormDate(''); setFormEndDate(''); setFormTime('');
    setFormType('task'); setFormDesc(''); setFormLocation('');
    setFormAssignTo('teachers'); setFormTeachers([]); setFormPriority('medium'); setShowAdd(false);
  };

  const selectedDayEvents = selectedDate ? eventsForDate(selectedDate) : [];
  const [showDayModal, setShowDayModal] = useState(false);
  const upcomingEvents = [...events].filter(e => new Date(e.date) >= new Date('2026-03-11')).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

  const getAssignLabel = (assignedTo: CalendarEvent['assignedTo']) => {
    if (assignedTo === 'all') return 'Everyone';
    if (assignedTo === 'teachers') return 'All Teachers';
    if (Array.isArray(assignedTo)) return assignedTo.map(u => TEACHERS.find(t => t.username === u)?.name || u).join(', ');
    return '';
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-x border-t border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">School Calendar</h3>
          <p className="text-xs text-gray-500 mt-1">Manage events, tasks & schedules for the school year</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-md">
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-1.5 text-xs font-bold rounded-sm transition-all ${viewMode === 'calendar' ? 'bg-white text-[#185C20] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Calendar</button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-xs font-bold rounded-sm transition-all ${viewMode === 'list' ? 'bg-white text-[#185C20] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>List</button>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-1.5 px-4 py-2 bg-[#185C20] text-white rounded-md text-xs font-bold hover:bg-[#1a6925] shadow-sm transition-colors">
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white border-x border-b border-gray-200 overflow-hidden">
          {/* Calendar grid */}
          <div className="flex-1 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-gray-50/50">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-gray-500 transition-all">
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-base font-bold text-gray-800">{format(currentMonth, 'MMMM yyyy')}</h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-gray-500 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {DAY_NAMES.map(d => <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-200">
              {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} className="min-h-[110px] bg-gray-50/50" />)}
              {daysInMonth.map(day => {
                const dayEvents = eventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);
                return (
                  <button key={day.toISOString()} onClick={() => handleDayClick(day)}
                    className={`min-h-[110px] p-1.5 flex flex-col items-start transition-all relative ${
                      isSelected ? 'bg-[#EDCD1F]/10 z-10 ring-1 ring-[#185C20]/30 ring-inset' : 'bg-white hover:bg-gray-50'
                    }`}>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1.5 ${
                      today ? 'bg-[#185C20] text-white shadow-sm' : isSelected ? 'bg-[#EDCD1F] text-[#185C20]' : 'text-gray-700'
                    }`}>{format(day, 'd')}</span>
                    <div className="flex flex-col w-full gap-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className="w-full text-left px-1.5 py-1 rounded-[3px] text-[10px] font-semibold truncate border border-transparent shadow-sm" 
                             style={{ backgroundColor: ev.color + '15', color: ev.color, borderColor: ev.color + '30' }}>
                          <span className="opacity-80 font-medium mr-1">{ev.time ? ev.time.split(' ')[0] : ''}</span>
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] font-bold text-gray-400 px-1 mt-0.5 hover:text-gray-600">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {Array.from({ length: (7 - ((startPadding + daysInMonth.length) % 7)) % 7 }).map((_, i) => (
                <div key={`end-pad-${i}`} className="min-h-[110px] bg-gray-50/50" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white border-x border-b border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-800">All Events Directory</h3>
            <span className="text-xs font-semibold text-[#185C20] bg-[#185C20]/10 px-2.5 py-1 rounded-full">{events.length} total events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-gray-200">
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[220px]">Event Details</th>
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="text-center py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-center py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Assigned To</th>
                  <th className="py-3 px-5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {[...events].sort((a, b) => a.date.localeCompare(b.date)).map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800">{ev.title}</p>
                          {ev.description && <p className="text-xs text-gray-500 truncate max-w-[250px] mt-0.5">{ev.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">{format(new Date(ev.date), 'MMM d, yyyy')}</span>
                        {ev.time && <span className="text-xs text-gray-500">{ev.time}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="text-[10px] font-bold px-2 py-1 rounded inline-block border" style={{ backgroundColor: ev.color + '10', color: ev.color, borderColor: ev.color + '30' }}>
                        {EVENT_TYPES.find(t => t.id === ev.type)?.label}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ev.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : ev.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                        {ev.priority.charAt(0).toUpperCase() + ev.priority.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs font-medium text-gray-600 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-gray-400" />
                        {getAssignLabel(ev.assignedTo)}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ DAY VIEW MODAL ═══════════ */}
      <Modal open={showDayModal} onClose={() => setShowDayModal(false)} maxW="max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <div>
            <h4 className="text-sm font-bold text-gray-800">{selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Day View'}</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">{selectedDayEvents.length} event(s) scheduled</p>
          </div>
          <button onClick={() => setShowDayModal(false)} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50 max-h-[500px]">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-12 px-4 text-gray-400">
              <CalendarIcon size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold text-gray-500">No events found</p>
              <p className="text-xs mt-1">This day is completely free.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {selectedDayEvents.map(ev => (
                <div key={ev.id} className="px-5 py-4 bg-white hover:bg-gray-50 transition-colors group">
                  <div className="flex gap-3">
                    <div className="w-1 h-12 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-gray-800 leading-tight">{ev.title}</p>
                        <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-2">
                        {ev.time && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={12} className="text-gray-400" /> <span>{ev.time}</span>
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin size={12} className="text-gray-400" /> <span className="truncate">{ev.location}</span>
                          </div>
                        )}
                      </div>
                      
                      {ev.description && (
                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100">{ev.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: ev.color + '10', color: ev.color, borderColor: ev.color + '30' }}>
                          {EVENT_TYPES.find(t => t.id === ev.type)?.label}
                        </span>
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                          <Users size={10} /> {getAssignLabel(ev.assignedTo)}
                        </span>
                        {ev.priority === 'high' && (
                          <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                            <AlertTriangle size={10} /> High Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex justify-end">
          <button onClick={() => { setShowDayModal(false); openAddModal(); setFormDate(format(selectedDate!, 'yyyy-MM-dd')); }} 
            className="flex items-center gap-1.5 h-9 px-4 bg-[#185C20] text-white text-xs font-bold hover:bg-[#1a6925] transition-colors rounded">
            <Plus size={14} /> Add Event to {selectedDate ? format(selectedDate, 'MMM d') : 'Day'}
          </button>
        </div>
      </Modal>

      {/* ═══════════ ADD EVENT MODAL ═══════════ */}
      <Modal open={showAdd} onClose={resetForm} maxW="max-w-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <div>
            <h4 className="text-sm font-bold text-gray-800">Create New Event</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">Schedule a calendar item or task</p>
          </div>
          <button onClick={resetForm} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-5 space-y-5">
            
            {/* Event Details */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Event Details</h5>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Event Title *</label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Q3 Faculty Meeting" className="w-full h-9 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Event Type *</label>
                    <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full h-9 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]">
                      {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Priority</label>
                    <select value={formPriority} onChange={e => setFormPriority(e.target.value as any)} className="w-full h-9 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]">
                      <option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Schedule</h5>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Start Date *</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full h-9 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5">End Date (Optional)</label>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="w-full h-9 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Time (Optional)</label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="w-full h-9 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
              </div>
            </div>

            {/* Location & Details */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Location & Notes</h5>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Location</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="e.g. Conference Room" className="w-full h-9 pl-9 pr-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Description</label>
                  <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Add any relevant details or agenda items..." className="w-full py-2 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20] min-h-[80px] resize-y" />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Assignments</h5>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-3">Who should be notified or assigned to this event?</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(['all', 'teachers', 'specific'] as const).map(opt => (
                    <button key={opt} onClick={() => setFormAssignTo(opt)}
                      className={`px-4 py-2 text-xs font-bold border transition-all ${formAssignTo === opt ? 'bg-[#185C20] text-white border-[#185C20]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {opt === 'all' ? 'Everyone' : opt === 'teachers' ? 'All Teachers' : 'Specific Teachers...'}
                    </button>
                  ))}
                </div>
                {formAssignTo === 'specific' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                    {TEACHERS.map(t => (
                      <button key={t.username} onClick={() => setFormTeachers(prev => prev.includes(t.username) ? prev.filter(x => x !== t.username) : [...prev, t.username])}
                        className={`flex items-center gap-2.5 p-2 border transition-all text-left ${formTeachers.includes(t.username) ? 'bg-[#EDCD1F]/10 border-[#EDCD1F] shadow-inner' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${formTeachers.includes(t.username) ? 'bg-[#185C20] border-[#185C20] text-white' : 'bg-white border-gray-300'}`}>
                          {formTeachers.includes(t.username) && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className={`text-[11px] font-bold truncate ${formTeachers.includes(t.username) ? 'text-gray-800' : 'text-gray-600'}`}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
        
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex justify-between items-center">
          <span className="text-[10px] text-gray-400 italic">* Required fields</span>
          <div className="flex gap-2">
            <button onClick={resetForm} className="h-9 px-4 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 text-xs font-bold transition-colors">Cancel</button>
            <button onClick={handleAddEvent} disabled={!formTitle.trim() || !formDate}
              className="h-9 px-5 bg-[#185C20] text-white text-xs font-bold hover:bg-[#1a6925] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
              <Save size={13} /> Save Event
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
