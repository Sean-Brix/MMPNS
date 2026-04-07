import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Heart, GraduationCap, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { AlumniProfile } from './types';

interface StoryReaderProps {
  alumni: AlumniProfile;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const StoryReader: React.FC<StoryReaderProps> = ({ alumni, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [alumni.id]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-8">
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
        className="relative w-full max-w-6xl h-full md:h-[85vh] bg-[#FAF9F6] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="md:hidden absolute top-4 right-4 z-[60] w-8 h-8 flex items-center justify-center rounded-full bg-black/10 backdrop-blur-md text-white border border-white/20"
        >
          <X size={16} />
        </button>

        <div ref={scrollRef} className="flex-1 h-full overflow-y-auto pt-0 order-2 md:order-1 relative story-scrollbar">
          <div className="md:hidden relative h-[40vh] overflow-hidden shrink-0">
            <motion.div key={alumni.id} initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0">
              <ImageWithFallback src={alumni.img} alt={alumni.name} className="w-full h-full object-cover object-top" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/30 to-transparent" />
            <motion.div key={`mob-name-${alumni.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="absolute bottom-0 left-0 right-0 px-6 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2.5 py-1 bg-[#EDCD1F] rounded-md text-[#185C20] text-[9px] font-bold tracking-widest uppercase">Batch {alumni.batch}</div>
                <span className="text-[9px] text-[#185C20]/40 tracking-widest uppercase">{alumni.field}</span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#185C20] leading-[1.1] mb-1">{alumni.name}</h1>
              <p className="text-[#185C20]/50 text-xs italic">{alumni.role}</p>
            </motion.div>
          </div>

          <motion.div key={`desk-header-${alumni.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="hidden md:block px-10 lg:px-12 pt-16 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-[#EDCD1F] rounded-md text-[#185C20] text-[10px] font-bold tracking-widest uppercase">Batch {alumni.batch}</div>
              <span className="text-[10px] text-[#185C20]/40 tracking-widest uppercase">{alumni.field}</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-serif font-bold text-[#185C20] leading-[1.1] mb-2">{alumni.name}</h1>
            <p className="text-[#185C20]/50 text-sm italic">{alumni.role}</p>
          </motion.div>

          <motion.div key={`body-${alumni.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="px-6 md:px-10 lg:px-12 py-8 md:py-8 space-y-10 md:space-y-12">
            <div className="relative">
              <div className="absolute -left-1 md:-left-4 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#EDCD1F] to-[#EDCD1F]/0 rounded-full" />
              <blockquote className="pl-5 md:pl-8">
                <p className="text-lg md:text-2xl font-serif italic text-[#185C20] leading-[1.5]">&ldquo;{alumni.quote}&rdquo;</p>
              </blockquote>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[#185C20]/5" />
              <Sparkles size={12} className="text-[#EDCD1F]" />
              <div className="flex-1 h-px bg-[#185C20]/5" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-[#185C20]/30 uppercase tracking-[0.4em] mb-5">Their Journey</p>
              <p className="text-[#185C20]/70 text-base leading-[2] first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-[#185C20] first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                {alumni.story}
              </p>
            </div>

            <div className="relative bg-white rounded-2xl p-6 shadow-[0_4px_30px_-10px_rgba(24,92,32,0.08)] border border-[#185C20]/5 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#EDCD1F] via-[#EDCD1F]/60 to-transparent" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#EDCD1F]/10 flex items-center justify-center">
                  <Heart size={14} className="text-[#EDCD1F]" />
                </div>
                <h3 className="text-[10px] font-bold text-[#185C20] uppercase tracking-[0.3em]">A Memory I Treasure</h3>
              </div>
              <p className="text-[#185C20]/60 leading-[1.9] font-serif italic">&ldquo;{alumni.favoriteMemory}&rdquo;</p>
            </div>

            <div className="relative bg-[#185C20] rounded-2xl p-6 text-white overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]">
                <div className="absolute inset-0 bg-[radial-gradient(#EDCD1F_1px,transparent_1px)] [background-size:20px_20px]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#EDCD1F]/15 flex items-center justify-center">
                    <GraduationCap size={14} className="text-[#EDCD1F]" />
                  </div>
                  <h3 className="text-[10px] font-bold text-[#EDCD1F] uppercase tracking-[0.3em]">To the Next Generation</h3>
                </div>
                <p className="text-white/70 leading-[1.9] font-serif italic">&ldquo;{alumni.messageToMMPNS}&rdquo;</p>
              </div>
            </div>

            <div className="flex items-center justify-center pt-6 pb-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-px bg-[#EDCD1F]" />
                <span className="text-[9px] text-[#185C20]/20 tracking-[0.5em] uppercase">End of Page</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="hidden md:block md:w-[45%] lg:w-[42%] order-1 md:order-2 relative bg-[#185C20]">
          <motion.div
            key={alumni.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <ImageWithFallback src={alumni.img} alt={alumni.name} className="w-full h-full object-cover object-top opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#185C20]/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e10]/60 via-transparent to-[#0a2e10]/20" />

            <motion.div 
              initial={{ opacity: 0, y: 30, rotate: -10 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="absolute bottom-12 right-12 md:bottom-20 md:right-16 z-20 w-32 h-40 md:w-40 md:h-52 bg-white p-2 md:p-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transform hover:scale-105 hover:rotate-0 transition-all duration-500 cursor-pointer"
            >
              <div className="relative w-full h-full bg-neutral-200 overflow-hidden border border-gray-100">
                <ImageWithFallback 
                  src={alumni.vintageImg || "https://images.unsplash.com/photo-1733973697928-ab8b34d8e22f?auto=format&fit=crop&q=80&w=300"}
                  alt={`Vintage photo of ${alumni.name}`}
                  className="w-full h-full object-cover sepia-[0.3] contrast-110 grayscale-[0.2]" 
                />
                <div className="absolute inset-0 bg-[#8b5e3c]/10 mix-blend-multiply pointer-events-none" />
              </div>
              <div className="mt-2 text-center">
                <p className="font-serif italic text-[10px] text-gray-400">Circa {alumni.batch}</p>
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/20 backdrop-blur-sm rotate-2 shadow-sm border border-white/30" />
            </motion.div>
          </motion.div>

          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6">
            <button onClick={onClose} className="group flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/30 transition-all text-xs tracking-widest uppercase cursor-pointer border border-white/10">
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

          <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none">
            <span className="text-[9px] text-[#EDCD1F]/60 tracking-[0.4em] uppercase shadow-black drop-shadow-md">Yearbook &middot; Batch {alumni.batch}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};