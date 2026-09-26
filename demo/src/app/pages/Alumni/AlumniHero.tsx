import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';

interface AlumniHeroProps {
  heroOpacity: any;
  heroY: any;
}

export const AlumniHero: React.FC<AlumniHeroProps> = ({ heroOpacity, heroY }) => {
  return (
    <section className="relative h-[70vh] md:h-[85vh] overflow-hidden flex items-center justify-center bg-[#185C20]">
      {/* Decorative Heritage Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] md:opacity-[0.05]">
        <div className="absolute inset-0 bg-[radial-gradient(#EDCD1F_2px,transparent_2px)] [background-size:48px_48px]" />
      </div>

      {/* Framing Elements */}
      <div className="absolute inset-4 md:inset-10 border border-[#EDCD1F]/20 pointer-events-none z-10" />
      <div className="absolute inset-6 md:inset-14 border border-[#EDCD1F]/10 pointer-events-none z-10" />
      
      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 md:top-10 md:left-10 w-8 h-8 md:w-16 md:h-16 border-t-2 border-l-2 border-[#EDCD1F] z-20" />
      <div className="absolute top-4 right-4 md:top-10 md:right-10 w-8 h-8 md:w-16 md:h-16 border-t-2 border-r-2 border-[#EDCD1F] z-20" />
      <div className="absolute bottom-4 left-4 md:bottom-10 md:left-10 w-8 h-8 md:w-16 md:h-16 border-b-2 border-l-2 border-[#EDCD1F] z-20" />
      <div className="absolute bottom-4 right-4 md:bottom-10 md:right-10 w-8 h-8 md:w-16 md:h-16 border-b-2 border-r-2 border-[#EDCD1F] z-20" />

      <motion.div 
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-20 text-center px-6 max-w-4xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-col items-center gap-6 md:gap-8">
            <div className="w-12 md:w-16 h-px bg-[#EDCD1F]/50" />
            
            <div className="space-y-4 md:space-y-6">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-[#EDCD1F]/30 text-[#EDCD1F] font-bold text-[10px] md:text-xs tracking-[0.3em] uppercase">
                <GraduationCap size={16} />
                <span>The MMPNS Legacy</span>
              </div>
              
              <h1 className="text-5xl md:text-9xl font-serif font-bold text-white tracking-tight leading-none">
                Eternal <br />
                <span className="italic text-[#EDCD1F] font-light">MMPNian</span>
              </h1>
              
              <div className="w-full max-w-lg mx-auto h-px bg-gradient-to-r from-transparent via-[#EDCD1F]/30 to-transparent" />
              
              <p className="text-lg md:text-2xl text-white/70 font-serif italic leading-relaxed max-w-2xl mx-auto">
                "Stay Connected. Stay Inspired. Stay MMPNS."
              </p>
            </div>

            <div className="w-12 md:w-16 h-px bg-[#EDCD1F]/50" />
          </div>
        </motion.div>
      </motion.div>

      {/* Floating Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-[#EDCD1F]/40 flex-col items-center gap-3"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">The Journey</span>
        <div className="w-px h-16 bg-gradient-to-b from-[#EDCD1F]/40 to-transparent" />
      </motion.div>
    </section>
  );
};
