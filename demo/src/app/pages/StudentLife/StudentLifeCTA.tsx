import React from 'react';
import { motion } from 'motion/react';

export const StudentLifeCTA: React.FC = () => {
  return (
    <section className="py-24 bg-[#185C20] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 tracking-tight">Begin Your <span className="text-[#EDCD1F]">MMPNS</span> Journey</h2>
          <button className="px-12 py-5 bg-[#EDCD1F] text-[#185C20] font-black uppercase tracking-[0.2em] text-sm rounded-full hover:scale-110 hover:shadow-[0_20px_50px_rgba(237,205,31,0.3)] transition-all duration-500">
            Apply for Admission
          </button>
        </motion.div>
      </div>
    </section>
  );
};
