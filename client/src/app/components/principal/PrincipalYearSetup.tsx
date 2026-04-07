import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, ChevronRight, CheckCircle2, ArrowRight, 
  Calendar as CalendarIcon, Users, UserCheck, AlertTriangle, Play,
  Plus, Clock, Check, CalendarDays, Lock, Unlock, Database
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { readDatabase, writeDatabase } from '../../../utils/database';

interface Quarter { id: number; label: string; startDate: string; endDate: string; isLocked: boolean; }
interface CalendarEvent { id: string; title: string; date: string; endDate?: string; type: string; description?: string; color: string; }
interface SchoolYear {
  id: string;
  startYear: string;
  endYear: string;
  status: 'active' | 'archived' | 'planned';
  quarters: Quarter[];
  events: CalendarEvent[];
}

const STEPS = [
  { id: 'start', label: 'Academic Year', icon: CalendarIcon, desc: 'Define new school year' },
  { id: 'students', label: 'Promote Students', icon: Users, desc: 'Batch advancement' },
  { id: 'teachers', label: 'Reset Assignments', icon: UserCheck, desc: 'Clear advisories' },
  { id: 'finalize', label: 'Finalize & Execute', icon: RefreshCw, desc: 'Commit rollover' }
] as const;

export const PrincipalYearSetup: React.FC = () => {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [view, setView] = useState<'list' | 'setup'>('list');
  
  // Setup Wizard State
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [newYearStart, setNewYearStart] = useState('2026');
  const [newYearEnd, setNewYearEnd] = useState('2027');
  const [quartersPlan, setQuartersPlan] = useState<Quarter[]>([
    { id: 1, label: "1st Quarter", startDate: "2026-06-05", endDate: "2026-08-22", isLocked: true },
    { id: 2, label: "2nd Quarter", startDate: "2026-08-25", endDate: "2026-11-14", isLocked: true },
    { id: 3, label: "3rd Quarter", startDate: "2026-11-17", endDate: "2027-02-20", isLocked: false },
    { id: 4, label: "4th Quarter", startDate: "2027-02-23", endDate: "2027-04-03", isLocked: false }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchYears = () => {
    const data = readDatabase<{ years: SchoolYear[] }>('school_years');
    if (data && data.years) {
      setYears(data.years);
      const active = data.years.find(y => y.status === 'active');
      if (active) {
        setNewYearStart(active.endYear);
        setNewYearEnd(String(Number(active.endYear) + 1));
      }
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const executeRollover = () => {
    setIsProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          finishRollover();
          return 100;
        }
        return p + 15;
      });
    }, 400);
  };

  const finishRollover = () => {
    const updatedYears = years.map(y => {
      if (y.status === 'active') return { ...y, status: 'archived' as const };
      return y;
    });

    const newYearId = `sy_${newYearStart}_${newYearEnd}`;
    const newYear: SchoolYear = {
      id: newYearId,
      startYear: newYearStart,
      endYear: newYearEnd,
      status: 'active',
      quarters: quartersPlan,
      events: [] // Blank slate for new year calendar
    };

    updatedYears.push(newYear);

    const success = writeDatabase('school_years', { years: updatedYears });
    if (success) {
      localStorage.setItem('mmpns_current_sy', `${newYearStart}-${newYearEnd}`);
      localStorage.removeItem('mmpns_principal_calendar'); // Clear active local events
      localStorage.removeItem('mmpns_principal_evaluations'); 
      
      setIsProcessing(false);
      toast.success(`Successfully rolled over to S.Y. ${newYearStart}-${newYearEnd}`);
      setYears(updatedYears);
      setView('list');
      setCurrentStep(0);
    } else {
      setIsProcessing(false);
      toast.error('Failed to commit database changes.');
    }
  };

  const toggleQuarterLock = (yearId: string, quarterId: number) => {
    const updatedYears = years.map(y => {
      if (y.id === yearId) {
        const updatedQuarters = y.quarters.map(q => q.id === quarterId ? { ...q, isLocked: !q.isLocked } : q);
        return { ...y, quarters: updatedQuarters };
      }
      return y;
    });
    
    if (writeDatabase('school_years', { years: updatedYears })) {
      setYears(updatedYears);
      toast.success('Quarter access updated.');
    }
  };

  const renderYearsList = () => (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Database size={20} className="text-[#185C20]" />
              School Years Database
            </h2>
            <p className="text-xs text-gray-500 mt-1">Manage current operations and historical archives.</p>
          </div>
          <button onClick={() => setView('setup')}
            className="h-10 px-4 bg-[#185C20] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#1a6925] transition-colors shadow-sm">
            <Plus size={16} /> Plan Next Year
          </button>
        </div>

        <div className="space-y-4">
          {/* Active Year */}
          {years.filter(y => y.status === 'active').map(year => (
            <div key={year.id} className="bg-white border-2 border-[#185C20] shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-[#185C20]/5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#185C20] text-[#EDCD1F]"><Check size={16} /></div>
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-[#185C20] uppercase">Active Academic Year</span>
                    <h3 className="text-lg font-bold text-gray-800">S.Y. {year.startYear} - {year.endYear}</h3>
                  </div>
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" /> Quarter Locks
                  </h4>
                  <div className="space-y-2">
                    {year.quarters.map(q => (
                      <div key={q.id} className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50/50 hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center text-xs font-bold text-gray-500">Q{q.id}</span>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{q.label}</p>
                            <p className="text-[10px] text-gray-400">{q.startDate} to {q.endDate}</p>
                          </div>
                        </div>
                        <button onClick={() => toggleQuarterLock(year.id, q.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-bold transition-all ${
                            q.isLocked 
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          }`}>
                          {q.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                          {q.isLocked ? 'LOCKED' : 'OPEN'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays size={14} className="text-gray-400" /> Key Overview
                  </h4>
                  <div className="border border-gray-200 divide-y divide-gray-100">
                    <div className="p-3 flex justify-between items-center bg-white">
                      <span className="text-xs text-gray-600">Total Calendar Events</span>
                      <span className="text-sm font-bold text-[#185C20]">{year.events.length}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center bg-white">
                      <span className="text-xs text-gray-600">Enrolled Students</span>
                      <span className="text-sm font-bold text-[#185C20]">~1,200</span>
                    </div>
                    <div className="p-3 flex justify-between items-center bg-white">
                      <span className="text-xs text-gray-600">Faculty & Staff</span>
                      <span className="text-sm font-bold text-[#185C20]">45</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Archived Years */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Historical Archives</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {years.filter(y => y.status === 'archived').map(year => (
              <div key={year.id} className="bg-white border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400"><Database size={14} /></div>
                  <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 uppercase tracking-wider">Archived</span>
                </div>
                <h4 className="text-sm font-bold text-gray-800">S.Y. {year.startYear}-{year.endYear}</h4>
                <p className="text-[10px] text-gray-400 mt-1">{year.events.length} Events Logged</p>
              </div>
            ))}
            {years.filter(y => y.status === 'archived').length === 0 && (
              <div className="col-span-3 text-center py-8 border border-dashed border-gray-300">
                <p className="text-xs text-gray-400">No archived records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      {view === 'setup' && (
        <div className="bg-white border-b border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <RefreshCw size={18} className="text-[#185C20]" />
              School Year Rollover
            </h3>
            <p className="text-xs text-gray-500 mt-1">Initialize the upcoming academic cycle. You are moving from S.Y. <strong className="text-gray-700">{newYearStart}</strong>.</p>
          </div>
          <button onClick={() => setView('list')} className="text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
        </div>
      )}

      {view === 'list' ? renderYearsList() : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto bg-white border border-gray-200">
            
            {/* Stepper Navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 overflow-x-auto hide-scrollbar">
              {STEPS.map((step, idx) => {
                const isActive = currentStep === idx;
                const isPast = currentStep > idx;
                return (
                  <div key={step.id} 
                    className={`flex-1 min-w-[160px] flex items-center p-3 border-r border-gray-200 last:border-r-0 transition-colors ${isActive ? 'bg-white' : 'opacity-70'}`}>
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold mr-3 flex-shrink-0 border ${
                      isPast ? 'bg-[#185C20] border-[#185C20] text-white' :
                      isActive ? 'bg-[#EDCD1F]/20 border-[#EDCD1F] text-[#185C20]' : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}>
                      {isPast ? <CheckCircle2 size={12} strokeWidth={3} /> : (idx + 1)}
                    </div>
                    <div>
                      <h4 className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>{step.label}</h4>
                      <p className="text-[10px] text-gray-400 truncate">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-6 sm:p-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}>
                  
                  {currentStep === 0 && (
                    <div className="space-y-0 border border-gray-200 divide-y divide-gray-200">
                      <div className="bg-blue-50/50 p-4 flex gap-3 text-sm text-blue-800">
                        <AlertTriangle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">Starting a new academic year will instantly archive the current year's data into the database. Ensure no teachers are actively encoding.</p>
                      </div>

                      <div className="p-5 bg-white space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Define New Academic Year</label>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">Start Year</label>
                              <input type="number" value={newYearStart} onChange={e => setNewYearStart(e.target.value)} 
                                className="w-full h-10 px-3 border border-gray-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                            </div>
                            <div className="pt-5 text-gray-400 font-bold text-lg">-</div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">End Year</label>
                              <input type="number" value={newYearEnd} onChange={e => setNewYearEnd(e.target.value)} 
                                className="w-full h-10 px-3 border border-gray-200 text-sm bg-gray-50 focus:outline-none" readOnly />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-5">
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Quarter Schedule Plan</label>
                          </div>
                          <div className="space-y-2">
                            {quartersPlan.map((q, idx) => (
                              <div key={q.id} className="flex items-center gap-3 border border-gray-200 p-3 bg-gray-50/50">
                                <div className="w-8 h-8 rounded bg-[#185C20]/10 flex items-center justify-center text-xs font-bold text-[#185C20]">Q{q.id}</div>
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Start Date</label>
                                    <input type="date" value={q.startDate} onChange={e => {
                                        const n = [...quartersPlan]; n[idx].startDate = e.target.value; setQuartersPlan(n);
                                      }}
                                      className="w-full h-8 px-2 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">End Date</label>
                                    <input type="date" value={q.endDate} onChange={e => {
                                        const n = [...quartersPlan]; n[idx].endDate = e.target.value; setQuartersPlan(n);
                                      }}
                                      className="w-full h-8 px-2 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-4 px-1">Students will be automatically promoted to the next grade level based on their final average. Students failing more than 2 subjects will be retained.</p>
                      
                      <div className="border border-gray-200 divide-y divide-gray-100 bg-white">
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100"><Users size={16} /></div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">Batch Promotion</p>
                              <p className="text-[11px] text-gray-500">Processing database records...</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 border border-emerald-100">Ready</span>
                        </div>
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100"><Users size={16} /></div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">Grade 12 Graduation</p>
                              <p className="text-[11px] text-gray-500">Move current Grade 12 to Alumni status</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 border border-emerald-100">Ready</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-4 px-1">Clear all current teacher advisory roles and class assignments to prepare for the new master schedule.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-gray-200 bg-white">
                        <div className="border-b border-r border-gray-200 p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                          <div className="mt-0.5"><CheckCircle2 size={16} className="text-[#185C20]" /></div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Clear Advisory Roles</p>
                            <p className="text-xs text-gray-500 mt-1">Detach teachers from current sections.</p>
                          </div>
                        </div>
                        <div className="border-b border-r border-gray-200 p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                          <div className="mt-0.5"><CheckCircle2 size={16} className="text-[#185C20]" /></div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Reset Subject Loads</p>
                            <p className="text-xs text-gray-500 mt-1">Clear all previous subject assignments.</p>
                          </div>
                        </div>
                        <div className="border-b border-r border-gray-200 p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                          <div className="mt-0.5"><CheckCircle2 size={16} className="text-[#185C20]" /></div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Archive Calendar</p>
                            <p className="text-xs text-gray-500 mt-1">Move events to S.Y. database record.</p>
                          </div>
                        </div>
                        <div className="border-b border-r border-gray-200 p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                          <div className="mt-0.5"><CheckCircle2 size={16} className="text-[#185C20]" /></div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Archive Evaluations</p>
                            <p className="text-xs text-gray-500 mt-1">Store past evaluation records securely.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-gray-200 bg-white">
                      <div className="w-16 h-16 bg-[#185C20]/10 rounded-full flex items-center justify-center mb-4">
                        <Play size={32} className="text-[#185C20] ml-1" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Initialize S.Y. {newYearStart}-{newYearEnd}</h2>
                      <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">
                        This action will modify the active database, archiving the previous year and applying your newly configured dates.
                      </p>

                      {isProcessing ? (
                        <div className="w-full max-w-md px-6">
                          <div className="flex justify-between text-xs font-bold text-gray-600 mb-2">
                            <span>Processing Database Records...</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 overflow-hidden">
                            <motion.div 
                              className="h-full bg-[#185C20]"
                              animate={{ width: `${progress}%` }}
                              transition={{ ease: "linear" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button onClick={executeRollover}
                          className="px-8 py-3 bg-[#185C20] text-white font-bold text-sm hover:bg-[#1a6925] transition-colors flex items-center gap-2 shadow-lg shadow-[#185C20]/20">
                          <RefreshCw size={16} /> Execute System Rollover
                        </button>
                      )}
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {!isProcessing && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center">
                <button 
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors">
                  Back
                </button>
                
                {currentStep < STEPS.length - 1 && (
                  <button onClick={handleNext}
                    className="px-5 py-2 bg-gray-800 text-white text-xs font-bold hover:bg-black transition-colors flex items-center gap-2">
                    Continue <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
