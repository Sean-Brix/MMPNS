import React from 'react';
import { motion } from 'motion/react';
import { Cross, Shield, Heart, Award } from 'lucide-react';

export const CoreValues: React.FC = () => {
  const coreValues = [
    { name: 'Faith', description: 'Nurturing a living relationship with Christ through the Holy Eucharist.', icon: <Cross className="text-[#185C20]" /> },
    { name: 'Integrity', description: 'Acting with honor and consistency in all thoughts and deeds.', icon: <Shield className="text-[#185C20]" /> },
    { name: 'Service', description: 'Selfless dedication to the welfare of the community and the poor.', icon: <Heart className="text-[#185C20]" /> },
    { name: 'Academic Excellence', description: 'Continuous striving for intellectual and professional growth.', icon: <Award className="text-[#185C20]" /> },
  ];

  return (
    <section className="py-32 bg-[#fcfaf2]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-24">
          <span className="text-[#185C20] font-sans font-black text-[10px] uppercase tracking-[0.5em] mb-4 block">The MMPNS Spirit</span>
          <h2 className="text-5xl md:text-7xl font-bold text-gray-900">Foundational Values</h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#EDCD1F]"></div>)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {coreValues.map((value, idx) => (
            <motion.div 
              key={value.name}
              whileHover={{ y: -10 }}
              className="relative bg-white p-12 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#EDCD1F]/5 rounded-bl-[100px] transition-transform group-hover:scale-150"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-[#185C20] text-white rounded-2xl flex items-center justify-center mb-10 rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-lg">
                  {React.cloneElement(value.icon as React.ReactElement, { size: 36, className: "text-[#EDCD1F]" })}
                </div>
                <span className="text-[#185C20] font-sans font-black text-[10px] uppercase tracking-widest mb-3 block opacity-50">Value 0{idx + 1}</span>
                <h4 className="text-3xl font-bold mb-6 text-gray-900">{value.name}</h4>
                <p className="text-gray-600 text-lg leading-relaxed font-serif italic">{value.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
