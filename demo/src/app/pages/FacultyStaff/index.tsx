import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Search, X, BookOpen, Briefcase, GraduationCap, Heart, ChevronRight, Stethoscope, BookMarked, Shield, ClipboardList, Calculator, HandHeart } from 'lucide-react';
import { staffMembers as fallbackStaffMembers } from './data';
import { StaffMember } from './types';
import { StaffCard } from './StaffCard';
import { StaffProfile } from './StaffProfile';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Skeleton } from '../../components/ui/skeleton';
import {
  DATABASE_UPDATED_EVENT,
  readDatabaseOnline,
  writeDatabaseOnline,
} from '../../../utils/database';
import { calculateYearsAtMmpns } from '../../../utils/staffYears';

const DEFAULT_TEACHING_DEPARTMENTS = ['Elementary', 'Junior High School'];
const DEFAULT_NON_TEACHING_DEPARTMENTS = ['Accounting', 'Guidance', 'Registrar', 'Library', 'Clinic', 'Maintenance & Security'];

const normalizeStaffMember = (member: Partial<StaffMember>, index: number): StaffMember | null => {
  if (!member.name || !member.role || !member.img || !member.bio || !member.education) {
    return null;
  }

  const staffType = member.staffType === 'non-teaching' ? 'non-teaching' : 'teaching';
  const fallbackDepartment = staffType === 'teaching' ? 'Elementary' : 'Accounting';
  const normalizedDepartment =
    typeof member.department === 'string' && member.department.trim()
      ? member.department.trim()
      : fallbackDepartment;

  return {
    id: typeof member.id === 'number' ? member.id : index + 1,
    name: member.name,
    role: member.role,
    department: normalizedDepartment,
    staffType,
    img: member.img,
    bio: member.bio,
    education: member.education,
    yearsAtMmpns:
      typeof member.yearsAtMmpns === 'number'
        ? member.yearsAtMmpns
        : calculateYearsAtMmpns(typeof member.startedAtMmpns === 'string' ? member.startedAtMmpns : undefined, 0),
    startedAtMmpns: typeof member.startedAtMmpns === 'string' ? member.startedAtMmpns : undefined,
    specialization: member.specialization,
    motto: member.motto,
  };
};

const loadStaffFromDatabase = async () => {
  const data = await readDatabaseOnline<{ staff?: Partial<StaffMember>[] }>('faculty');
  if (!data || !Array.isArray(data.staff)) {
    return [];
  }

  if (data.staff.length === 0) {
    return [];
  }

  const shouldMigrateLegacySeed =
    data.staff.length === 1 &&
    data.staff[0]?.name === fallbackStaffMembers[0]?.name &&
    fallbackStaffMembers.length > 1;

  if (shouldMigrateLegacySeed) {
    void writeDatabaseOnline('faculty', {
      ...data,
      staff: fallbackStaffMembers,
    });
    return fallbackStaffMembers;
  }

  const normalized = data.staff
    .map((member, index) => normalizeStaffMember(member, index))
    .filter((member): member is StaffMember => member !== null);

  return normalized;
};

const FACULTY_DIRECTORY_QUERY_KEY = ['faculty-directory'];

const DEPT_ICONS: Record<string, React.ReactNode> = {
  'Elementary': <BookOpen size={15} />,
  'Junior High School': <GraduationCap size={15} />,
  'Accounting': <Calculator size={15} />,
  'Guidance': <HandHeart size={15} />,
  'Registrar': <ClipboardList size={15} />,
  'Library': <BookMarked size={15} />,
  'Clinic': <Stethoscope size={15} />,
  'Maintenance & Security': <Shield size={15} />,
};

const getDepartmentIcon = (department: string, size = 15) => {
  return DEPT_ICONS[department] || <Briefcase size={size} />;
};

export const FacultyStaff: React.FC = () => {
  const goTo = useAppNavigate();
  const queryClient = useQueryClient();

  const staffDirectoryQuery = useQuery({
    queryKey: FACULTY_DIRECTORY_QUERY_KEY,
    queryFn: async () => loadStaffFromDatabase(),
  });

  const staffDirectory = staffDirectoryQuery.data ?? [];

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'mmpns_db_faculty') {
        queryClient.invalidateQueries({ queryKey: FACULTY_DIRECTORY_QUERY_KEY });
      }
    };

    const handleDatabaseUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === 'mmpns_db_faculty') {
        queryClient.invalidateQueries({ queryKey: FACULTY_DIRECTORY_QUERY_KEY });
      }
    };

    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: FACULTY_DIRECTORY_QUERY_KEY });
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(DATABASE_UPDATED_EVENT, handleDatabaseUpdated as EventListener);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(DATABASE_UPDATED_EVENT, handleDatabaseUpdated as EventListener);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (!searchQuery) return staffDirectory;
    const q = searchQuery.toLowerCase();
    return staffDirectory.filter(s =>
      s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
    );
  }, [searchQuery, staffDirectory]);

  const groupByDept = useCallback((members: StaffMember[]) => {
    const map: Record<string, StaffMember[]> = {};
    members.forEach(m => {
      if (!map[m.department]) map[m.department] = [];
      map[m.department].push(m);
    });
    return map;
  }, []);

  const groups = useMemo(() => groupByDept(filtered), [filtered, groupByDept]);

  const teachingStaff = useMemo(() => filtered.filter(s => s.staffType === 'teaching'), [filtered]);
  const nonTeachingStaff = useMemo(() => filtered.filter(s => s.staffType === 'non-teaching'), [filtered]);

  const teachingDepartments = useMemo(() => {
    const dynamic = staffDirectory
      .filter((member) => member.staffType === 'teaching')
      .map((member) => member.department);
    return Array.from(new Set([...DEFAULT_TEACHING_DEPARTMENTS, ...dynamic]));
  }, [staffDirectory]);

  const nonTeachingDepartments = useMemo(() => {
    const dynamic = staffDirectory
      .filter((member) => member.staffType === 'non-teaching')
      .map((member) => member.department);
    return Array.from(new Set([...DEFAULT_NON_TEACHING_DEPARTMENTS, ...dynamic]));
  }, [staffDirectory]);

  const allDepartments = useMemo(() => {
    return Array.from(new Set([...teachingDepartments, ...nonTeachingDepartments]));
  }, [nonTeachingDepartments, teachingDepartments]);

  const currentIndex = selectedStaff ? filtered.findIndex(s => s.id === selectedStaff.id) : -1;

  const goToProfile = (dir: 'prev' | 'next') => {
    const newIdx = dir === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIdx >= 0 && newIdx < filtered.length) setSelectedStaff(filtered[newIdx]);
  };

  const scrollToDept = (dept: string) => {
    setActiveDept(dept);
    sectionRefs.current[dept]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveDept(entry.target.getAttribute('data-dept'));
          }
        });
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0.1 }
    );

    allDepartments.forEach(dept => {
      const el = sectionRefs.current[dept];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [allDepartments, filtered]);

  const isSearching = searchQuery.length > 0;

  // Handle scroll to show/hide navbar
  useEffect(() => {
    let prevScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 50) {
        // Always show at top
        setShowNavbar(true);
      } else if (currentScrollY > prevScrollY && currentScrollY > 100) {
        // Scrolling down
        setShowNavbar(false);
      } else if (currentScrollY < prevScrollY) {
        // Scrolling up
        setShowNavbar(true);
      }
      
      prevScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative bg-[#FAF9F6] min-h-screen selection:bg-[#EDCD1F] selection:text-[#185C20]">
      {/* Top Bar */}
      <div className={`sticky top-10 z-40 bg-[#FAF9F6]/95 backdrop-blur-xl border-b border-[#185C20]/8 ${!showNavbar && 'hidden'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => goTo('about')}
              className="group flex items-center gap-2 text-[#185C20]/50 hover:text-[#185C20] transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full border border-[#185C20]/10 flex items-center justify-center group-hover:border-[#EDCD1F] group-hover:bg-[#EDCD1F]/10 transition-all">
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="hidden sm:inline text-[11px] font-bold tracking-[0.15em] uppercase">About</span>
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-sm font-serif font-bold text-[#185C20]">Faculty & Staff</h1>
              <span className="text-[10px] text-[#185C20]/25 font-bold">({staffDirectory.length})</span>
            </div>

            {/* Search */}
            <div className="relative w-48 md:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#185C20]/25" />
              <input
                type="text"
                placeholder="Search staff..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#185C20]/8 rounded-lg text-[12px] text-[#185C20] placeholder-[#185C20]/20 focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/20 focus:border-[#EDCD1F]/40 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#185C20]/20 hover:text-[#185C20]/50 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Mobile department pills (horizontal scroll) - now only for small screens */}
        <div className="md:hidden sticky top-[104px] z-30 -mx-4 px-4 py-3 bg-[#FAF9F6]/95 backdrop-blur-xl border-b border-[#185C20]/5">
            <div className="flex gap-1.5 overflow-x-auto pb-1 yearbook-scrollbar">
              {allDepartments.map(dept => {
                const count = groups[dept]?.length || 0;
                const isActive = activeDept === dept;
                if (count === 0 && isSearching) return null;
                return (
                  <button
                    key={dept}
                    onClick={() => scrollToDept(dept)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#185C20] border-[#185C20] text-white shadow-sm'
                        : 'bg-white border-[#185C20]/5 text-[#185C20]/40 hover:text-[#185C20]'
                    }`}
                  >
                    {dept}
                    <span className={`text-[9px] ${isActive ? 'text-white/60' : 'text-[#185C20]/20'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

        <div className="flex gap-0 md:gap-6 lg:gap-8">
          {/* Sidebar Navigation - now visible from md up */}
          <aside className="hidden md:block w-48 lg:w-52 shrink-0 py-8">
            <div className={`sticky transition-all duration-300 ${showNavbar ? 'top-28' : 'top-12'}`}>
              <nav className="space-y-5">
                {/* Teaching */}
                <div>
                  <div className="flex items-center gap-2 px-2.5 mb-1.5">
                    <GraduationCap size={12} className="text-[#EDCD1F]" />
                    <span className="text-[8px] lg:text-[9px] font-black text-[#185C20]/40 uppercase tracking-[0.2em]">Teaching</span>
                    <span className="text-[8px] text-[#185C20]/20 font-bold ml-auto">{teachingStaff.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {teachingDepartments.map(dept => {
                      const count = groups[dept]?.length || 0;
                      const isActive = activeDept === dept;
                      return (
                        <button
                          key={dept}
                          onClick={() => scrollToDept(dept)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
                            isActive
                              ? 'bg-[#185C20] text-white shadow-md shadow-[#185C20]/15'
                              : 'text-[#185C20]/50 hover:bg-[#185C20]/5 hover:text-[#185C20]'
                          }`}
                        >
                          <span className={`transition-colors ${isActive ? 'text-[#EDCD1F]' : 'text-[#185C20]/25 group-hover:text-[#EDCD1F]'}`}>
                            {getDepartmentIcon(dept, 12)}
                          </span>
                          <span className="text-[10px] lg:text-[11px] font-bold flex-1 truncate">{dept}</span>
                          {count > 0 && (
                            <span className={`text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#185C20]/5 text-[#185C20]/30'
                            }`}>{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-2.5 h-px bg-[#185C20]/6" />

                {/* Non-Teaching */}
                <div>
                  <div className="flex items-center gap-2 px-2.5 mb-1.5">
                    <Briefcase size={12} className="text-[#EDCD1F]" />
                    <span className="text-[8px] lg:text-[9px] font-black text-[#185C20]/40 uppercase tracking-[0.2em]">Non-Teaching</span>
                    <span className="text-[8px] text-[#185C20]/20 font-bold ml-auto">{nonTeachingStaff.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {nonTeachingDepartments.map(dept => {
                      const count = groups[dept]?.length || 0;
                      const isActive = activeDept === dept;
                      return (
                        <button
                          key={dept}
                          onClick={() => scrollToDept(dept)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
                            isActive
                              ? 'bg-[#185C20] text-white shadow-md shadow-[#185C20]/15'
                              : 'text-[#185C20]/50 hover:bg-[#185C20]/5 hover:text-[#185C20]'
                          }`}
                        >
                          <span className={`transition-colors ${isActive ? 'text-[#EDCD1F]' : 'text-[#185C20]/25 group-hover:text-[#EDCD1F]'}`}>
                            {getDepartmentIcon(dept, 12)}
                          </span>
                          <span className="text-[10px] lg:text-[11px] font-bold flex-1 truncate">{dept}</span>
                          {count > 0 && (
                            <span className={`text-[8px] lg:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#185C20]/5 text-[#185C20]/30'
                            }`}>{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main ref={contentRef} className="flex-1 min-w-0 py-8 md:py-10">
            {staffDirectoryQuery.isLoading ? (
              <div className="space-y-12">
                <div className="space-y-3">
                  <Skeleton className="h-8 w-52" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 md:gap-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="space-y-2 rounded-xl border border-[#185C20]/8 bg-white p-3">
                      <Skeleton className="h-44 w-full rounded-lg" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#185C20]/5 flex items-center justify-center">
                  <Search size={28} className="text-[#185C20]/20" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#185C20]/60 mb-2">No Results Found</h3>
                <p className="text-sm text-[#185C20]/30 mb-6">No staff match &ldquo;{searchQuery}&rdquo;</p>
                <button onClick={() => setSearchQuery('')} className="px-6 py-2.5 bg-[#185C20] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#185C20]/90 transition-colors">
                  Clear Search
                </button>
              </motion.div>
            ) : (
              <div className="space-y-14">
                {/* Teaching Staff */}
                {teachingStaff.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-[#185C20] flex items-center justify-center shadow-lg shadow-[#185C20]/15">
                        <GraduationCap size={18} className="text-[#EDCD1F]" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-[#185C20]">Teaching Staff</h2>
                        <p className="text-[10px] text-[#185C20]/30 font-bold uppercase tracking-[0.2em]">
                          {teachingStaff.length} educators
                        </p>
                      </div>
                      <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-[#185C20]/8 to-transparent ml-4" />
                    </div>

                    <div className="space-y-10">
                      {teachingDepartments.map(dept => {
                        const members = groups[dept];
                        if (!members || members.length === 0) return null;
                        return (
                          <div
                            key={dept}
                            ref={el => { sectionRefs.current[dept] = el; }}
                            data-dept={dept}
                            className="scroll-mt-32"
                          >
                            <div className="flex items-center gap-2.5 mb-5">
                              <span className="text-[#EDCD1F]">{getDepartmentIcon(dept)}</span>
                              <h3 className="text-sm font-black text-[#185C20] uppercase tracking-[0.1em]">{dept}</h3>
                              <span className="text-[10px] text-[#185C20]/25 font-bold">{members.length}</span>
                              <div className="flex-1 h-px bg-[#185C20]/5 ml-2" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                              {members.map((staff, idx) => (
                                <CompactStaffCard key={staff.id} staff={staff} onClick={() => setSelectedStaff(staff)} index={idx} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Separator */}
                {teachingStaff.length > 0 && nonTeachingStaff.length > 0 && (
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-px bg-[#185C20]/8" />
                    </div>
                    <div className="relative flex justify-center">
                      <div className="bg-[#FAF9F6] px-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EDCD1F]" />
                        <span className="text-[9px] font-black text-[#185C20]/15 uppercase tracking-[0.4em]">Non-Teaching Division</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#EDCD1F]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-Teaching Staff */}
                {nonTeachingStaff.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-[#185C20] flex items-center justify-center shadow-lg shadow-[#185C20]/15">
                        <Briefcase size={18} className="text-[#EDCD1F]" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-[#185C20]">Non-Teaching Staff</h2>
                        <p className="text-[10px] text-[#185C20]/30 font-bold uppercase tracking-[0.2em]">
                          {nonTeachingStaff.length} professionals
                        </p>
                      </div>
                      <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-[#185C20]/8 to-transparent ml-4" />
                    </div>

                    <div className="space-y-10">
                      {nonTeachingDepartments.map(dept => {
                        const members = groups[dept];
                        if (!members || members.length === 0) return null;
                        return (
                          <div
                            key={dept}
                            ref={el => { sectionRefs.current[dept] = el; }}
                            data-dept={dept}
                            className="scroll-mt-32"
                          >
                            <div className="flex items-center gap-2.5 mb-5">
                              <span className="text-[#EDCD1F]">{getDepartmentIcon(dept)}</span>
                              <h3 className="text-sm font-black text-[#185C20] uppercase tracking-[0.1em]">{dept}</h3>
                              <span className="text-[10px] text-[#185C20]/25 font-bold">{members.length}</span>
                              <div className="flex-1 h-px bg-[#185C20]/5 ml-2" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                              {members.map((staff, idx) => (
                                <HorizontalStaffCard key={staff.id} staff={staff} onClick={() => setSelectedStaff(staff)} index={idx} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom */}
            <div className="mt-16 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-[#185C20]/5" />
              <Heart size={12} className="text-[#EDCD1F]/40" />
              <span className="text-[9px] text-[#185C20]/15 font-bold uppercase tracking-[0.4em]">The Heart of MMPNS</span>
              <Heart size={12} className="text-[#EDCD1F]/40" />
              <div className="h-px flex-1 bg-[#185C20]/5" />
            </div>
          </main>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <StaffProfile
            staff={selectedStaff}
            onClose={() => setSelectedStaff(null)}
            onPrev={() => goToProfile('prev')}
            onNext={() => goToProfile('next')}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < filtered.length - 1}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Compact Card for Teaching Staff ─── */
const CompactStaffCard: React.FC<{ staff: StaffMember; onClick: () => void; index: number }> = ({ staff, onClick, index }) => (
  (() => {
    const yearsAtMmpns = calculateYearsAtMmpns(staff.startedAtMmpns, staff.yearsAtMmpns);

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onClick={onClick}
        className="group relative cursor-pointer"
      >
        <div className="relative bg-white rounded-xl overflow-hidden border border-[#185C20]/5 shadow-sm hover:shadow-lg hover:shadow-[#185C20]/8 hover:-translate-y-1 transition-all duration-400">
          <div className="relative aspect-[3/4] overflow-hidden">
            <ImageWithFallback
              src={staff.img}
              alt={staff.name}
              className="w-full h-full object-cover object-center transition-transform duration-600 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e10]/90 via-[#185C20]/20 to-transparent" />

            {/* Years badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full border border-[#185C20]/10 shadow-sm">
              <span className="text-[10px] font-bold text-[#185C20]">{yearsAtMmpns}</span>
              <span className="text-[9px] text-[#185C20]/40 font-bold">yrs</span>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-3.5">
              <h3 className="text-sm font-serif font-bold text-white leading-tight mb-1">
                {staff.name}
              </h3>
              <p className="text-white/70 text-[10px] leading-relaxed line-clamp-2 mb-0.5">{staff.role}</p>
              {staff.specialization && (
                <p className="text-[#EDCD1F]/80 text-[9px] font-bold uppercase tracking-wide truncate">
                  {staff.specialization}
                </p>
              )}
            </div>

            {/* Hover CTA */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400 bg-[#185C20]/20 backdrop-blur-[2px]">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-full shadow-lg text-[#185C20] text-[9px] font-bold uppercase tracking-wider translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
                View Profile <ChevronRight size={11} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  })()
);

/* ─── Horizontal Card for Non-Teaching Staff ─── */
const HorizontalStaffCard: React.FC<{ staff: StaffMember; onClick: () => void; index: number }> = ({ staff, onClick, index }) => (
  (() => {
    const yearsAtMmpns = calculateYearsAtMmpns(staff.startedAtMmpns, staff.yearsAtMmpns);

    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onClick={onClick}
        className="group cursor-pointer"
      >
        <div className="flex items-stretch bg-white rounded-xl overflow-hidden border border-[#185C20]/5 shadow-sm hover:shadow-lg hover:shadow-[#185C20]/8 hover:-translate-y-0.5 transition-all duration-400 h-full">
          {/* Photo */}
          <div className="relative w-28 sm:w-32 shrink-0 overflow-hidden">
            <ImageWithFallback
              src={staff.img}
              alt={staff.name}
              className="w-full h-full object-cover object-center transition-transform duration-600 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#185C20]/5" />

            {/* Years badge on image */}
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full border border-[#185C20]/10 shadow-sm">
              <span className="text-[9px] font-bold text-[#185C20]">{yearsAtMmpns}</span>
              <span className="text-[8px] text-[#185C20]/40 font-bold">yrs</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
            <h3 className="text-sm font-serif font-bold text-[#185C20] leading-snug mb-1 line-clamp-1">
              {staff.name}
            </h3>
            <p className="text-[11px] text-[#185C20]/60 line-clamp-1 mb-2">{staff.role}</p>

            {staff.motto && (
              <p className="text-[9px] text-[#185C20]/40 italic line-clamp-2 leading-relaxed">
                &ldquo;{staff.motto}&rdquo;
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="flex items-center pr-4 text-[#185C20]/15 group-hover:text-[#EDCD1F] transition-colors">
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </motion.div>
    );
  })()
);

export default FacultyStaff;