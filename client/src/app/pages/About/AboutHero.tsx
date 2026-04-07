import React from 'react';
import { motion } from 'motion/react';
import { Cross } from 'lucide-react';

interface AboutHeroProps {
  schoolSeal: string;
}

export const AboutHero: React.FC<AboutHeroProps> = ({ schoolSeal }) => {
  return (
    <section className="relative pt-32 pb-48 overflow-hidden bg-[#185C20]">
      <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#185C20] via-[#185C20]/95 to-[#185C20]"></div>
      
      {/* Floating Sacred Motifs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#EDCD1F]/10 rounded-full animate-[spin_60s_linear_infinite]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#EDCD1F]/5 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[#EDCD1F] blur-2xl opacity-20 animate-pulse"></div>
              <img 
                src={schoolSeal} 
                alt="MMPNS School Seal" 
                className="w-24 h-24 md:w-32 md:h-32 relative z-10 drop-shadow-[0_0_15px_rgba(237,205,31,0.3)] brightness-110" 
              />
            </div>
          </div>
          <span className="text-[#EDCD1F] font-sans font-black tracking-[0.5em] uppercase text-[10px] md:text-xs block mb-6">Established 1988 • Parañaque City</span>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight">
            Our <span className="italic font-normal serif">Heritage</span>
          </h1>
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#EDCD1F]"></div>
            <Cross className="text-[#EDCD1F]" size={20} />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#EDCD1F]"></div>
          </div>
          <p className="text-white/80 max-w-2xl mx-auto text-xl md:text-2xl font-serif italic leading-relaxed">
            "To adore is to teach, and to teach is to lead every soul toward the eternal Truth."
          </p>
        </motion.div>
      </div>
      
      {/* Curved bottom transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fcfaf2] to-transparent"></div>
    </section>
  );
};
