import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Users, Cross } from 'lucide-react';

export const InstitutionalPillars: React.FC = () => {
  const pillars = [
    { 
      title: 'Faith-Centered', 
      icon: <Cross className="w-8 h-8 md:w-10 md:h-10" />, 
      desc: 'Daily Eucharist, retreat programs, and religious instruction integrated into the core curriculum.' 
    },
    { 
      title: 'Academic Mastery', 
      icon: <BookOpen className="w-8 h-8 md:w-10 md:h-10" />, 
      desc: 'PEAC-accredited programs focusing on STEM, Humanities, and critical 21st-century skills.' 
    },
    { 
      title: 'Servant Leadership', 
      icon: <Users className="w-8 h-8 md:w-10 md:h-10" />, 
      desc: 'Community outreach initiatives and student-led organizations that foster social responsibility.' 
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-[#185C20]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 text-white">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 md:mb-6 leading-tight">The MMPNS Pillars</h2>
          <p className="text-white/60 font-serif italic text-sm md:text-base">Education that transcends the classroom, building characters for eternity.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          {pillars.map((pillar, i) => (
            <motion.div 
              key={pillar.title}
              whileHover={{ y: -5 }}
              className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-2xl md:rounded-3xl text-white group hover:bg-[#EDCD1F] hover:text-[#185C20] transition-all duration-500"
            >
              <div className="mb-6 md:mb-8 text-[#EDCD1F] group-hover:text-[#185C20] transition-colors">
                {pillar.icon}
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-bold mb-3 md:mb-4">{pillar.title}</h3>
              <p className="opacity-70 font-sans text-xs md:text-sm leading-relaxed group-hover:opacity-100">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
