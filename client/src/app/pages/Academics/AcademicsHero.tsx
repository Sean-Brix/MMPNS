import React from 'react';
import { motion } from 'motion/react';
import { Scroll } from 'lucide-react';

export const AcademicsHero: React.FC = () => {
  return (
    <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-[#185C20]">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#185C20]/20"></div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-px bg-[#EDCD1F] self-center"></div>
            <Scroll className="mx-6 text-[#EDCD1F]" size={32} />
            <div className="w-16 h-px bg-[#EDCD1F] self-center"></div>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6">Academic Excellence</h1>
          <p className="text-[#EDCD1F] font-serif italic text-xl md:text-2xl max-w-3xl mx-auto opacity-90 leading-relaxed">
            "Sapientia et Fides" — Wisdom and Faith in the pursuit of holistic education.
          </p>
        </motion.div>
      </div>
      
      {/* Floating Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-px h-12 bg-gradient-to-b from-[#EDCD1F] to-transparent"></div>
      </div>
    </section>
  );
};
