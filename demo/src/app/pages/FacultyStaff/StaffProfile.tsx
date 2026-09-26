import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, GraduationCap, Clock, Award, Quote, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { StaffMember } from './types';
import { calculateYearsAtMmpns } from '../../../utils/staffYears';

interface StaffProfileProps {
  staff: StaffMember;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const StaffProfile: React.FC<StaffProfileProps> = ({ staff, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const staffTypeLabel = staff.staffType === 'teaching' ? 'Teaching Staff' : 'Non-Teaching Staff';
  const yearsAtMmpns = calculateYearsAtMmpns(staff.startedAtMmpns, staff.yearsAtMmpns);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-[#FAF9F6] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Photo Panel */}
        <div className="relative md:w-[42%] shrink-0 bg-[#185C20]">
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white border border-white/20 cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Photo */}
          <div className="relative h-[35vh] md:h-full overflow-hidden">
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <ImageWithFallback
                src={staff.img}
                alt={staff.name}
                className="w-full h-full object-cover object-top"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e10]/70 via-transparent to-[#0a2e10]/20" />

            {/* Desktop nav + close */}
            <div className="hidden md:flex absolute top-0 left-0 right-0 z-50 items-center justify-between px-6 py-6">
              <button
                onClick={onClose}
                className="group flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/30 transition-all text-xs tracking-widest uppercase cursor-pointer border border-white/10"
              >
                <X size={14} className="group-hover:rotate-90 transition-transform" />
                <span>Close</span>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onPrev} disabled={!hasPrev} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={onNext} disabled={!hasNext} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Staff type badge on photo */}
            <div className="absolute bottom-6 left-6 right-6 z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-[#EDCD1F] rounded-md text-[#185C20] text-[8px] font-black tracking-widest uppercase">
                  {staff.department}
                </span>
                <span className="text-[9px] text-white/50 tracking-widest uppercase">{staffTypeLabel}</span>
              </div>
              <h2 className="hidden md:block text-3xl font-serif font-bold text-white leading-[1.1]">{staff.name}</h2>
              <p className="hidden md:block text-white/50 text-xs italic mt-1">{staff.role}</p>
            </div>
          </div>
        </div>

        {/* Right: Content Panel */}
        <div className="flex-1 h-full overflow-y-auto story-scrollbar">
          {/* Mobile header */}
          <div className="md:hidden px-6 pt-6 pb-2">
            <h2 className="text-2xl font-serif font-bold text-[#185C20] leading-tight">{staff.name}</h2>
            <p className="text-[#185C20]/50 text-xs italic mt-1">{staff.role}</p>
          </div>

          <motion.div
            key={`profile-${staff.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="px-6 md:px-10 py-8 md:py-12 space-y-8"
          >
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-[#185C20]/5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} className="text-[#EDCD1F]" />
                  <span className="text-[9px] font-bold text-[#185C20]/30 uppercase tracking-[0.2em]">Years at MMPNS</span>
                </div>
                <p className="text-2xl font-black text-[#185C20]">{yearsAtMmpns}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-[#185C20]/5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={14} className="text-[#EDCD1F]" />
                  <span className="text-[9px] font-bold text-[#185C20]/30 uppercase tracking-[0.2em]">Department</span>
                </div>
                <p className="text-sm font-bold text-[#185C20]">{staff.department}</p>
              </div>
              {staff.specialization && (
                <div className="col-span-2 md:col-span-1 bg-white rounded-xl p-4 border border-[#185C20]/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={14} className="text-[#EDCD1F]" />
                    <span className="text-[9px] font-bold text-[#185C20]/30 uppercase tracking-[0.2em]">Specialization</span>
                  </div>
                  <p className="text-sm font-bold text-[#185C20]">{staff.specialization}</p>
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <p className="text-[10px] font-bold text-[#185C20]/30 uppercase tracking-[0.4em] mb-4">About</p>
              <p className="text-[#185C20]/70 text-base leading-[2] first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-[#185C20] first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                {staff.bio}
              </p>
            </div>

            {/* Education */}
            <div className="relative bg-white rounded-2xl p-6 border border-[#185C20]/5 shadow-sm overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#EDCD1F] via-[#EDCD1F]/60 to-transparent" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#EDCD1F]/10 flex items-center justify-center">
                  <GraduationCap size={14} className="text-[#EDCD1F]" />
                </div>
                <h3 className="text-[10px] font-bold text-[#185C20] uppercase tracking-[0.3em]">Education</h3>
              </div>
              <p className="text-[#185C20]/60 text-sm leading-relaxed">{staff.education}</p>
            </div>

            {/* Motto */}
            {staff.motto && (
              <div className="relative bg-[#185C20] rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]">
                  <div className="absolute inset-0 bg-[radial-gradient(#EDCD1F_1px,transparent_1px)] [background-size:20px_20px]" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-[#EDCD1F]/15 flex items-center justify-center">
                      <Quote size={14} className="text-[#EDCD1F]" />
                    </div>
                    <h3 className="text-[10px] font-bold text-[#EDCD1F] uppercase tracking-[0.3em]">Personal Motto</h3>
                  </div>
                  <p className="text-white/80 text-lg leading-[1.8] font-serif italic">&ldquo;{staff.motto}&rdquo;</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-center pt-4 pb-2">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-px bg-[#EDCD1F]" />
                <span className="text-[9px] text-[#185C20]/20 tracking-[0.5em] uppercase">MMPNS Faculty & Staff</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile nav arrows */}
        <div className="md:hidden flex items-center justify-between px-6 py-4 border-t border-[#185C20]/5 bg-white">
          <button onClick={onPrev} disabled={!hasPrev} className="flex items-center gap-2 text-[10px] font-bold text-[#185C20] uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
            <ChevronLeft size={16} /> Previous
          </button>
          <button onClick={onNext} disabled={!hasNext} className="flex items-center gap-2 text-[10px] font-bold text-[#185C20] uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer">
            Next <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
