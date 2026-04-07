import React from 'react';
import { Scroll } from 'lucide-react';

export const AdmissionCTA: React.FC = () => {
  return (
    <section className="py-24 bg-[#185C20] text-center border-t border-[#EDCD1F]/20">
       <div className="container mx-auto px-4">
          <Scroll className="text-[#EDCD1F] mx-auto mb-8 animate-bounce" size={40} />
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Join Our Growing History</h2>
          <button className="px-12 py-5 bg-[#EDCD1F] text-[#185C20] font-black uppercase tracking-widest rounded-full hover:scale-110 transition-transform shadow-2xl">
            Apply for Admission
          </button>
       </div>
    </section>
  );
};
