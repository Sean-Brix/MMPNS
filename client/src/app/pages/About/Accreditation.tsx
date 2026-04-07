import React from 'react';
import { Shield } from 'lucide-react';

export const Accreditation: React.FC = () => {
  return (
    <section className="py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#EDCD1F]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#185C20]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          
          <div className="relative bg-[#fcfaf2] p-12 md:p-24 rounded-[4rem] border-2 border-gray-100 shadow-2xl flex flex-col md:flex-row items-center gap-20">
            <div className="md:w-1/3 relative">
              <div className="w-48 h-48 md:w-56 md:h-56 border-4 border-[#185C20]/10 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-2 border-2 border-[#EDCD1F]/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                <Shield size={100} className="text-[#185C20] drop-shadow-xl" />
              </div>
            </div>
            
            <div className="md:w-2/3 text-center md:text-left space-y-8">
              <div>
                <span className="text-[#185C20] font-sans font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Institutional Standards</span>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">Certified Quality <br /><span className="text-[#185C20] italic font-normal">Education</span></h2>
              </div>
              
              <p className="text-gray-600 text-xl font-serif italic leading-relaxed">
                "As a PEAC Certified school, we adhere to the highest standards of academic management and instructional quality. Our participation in the ESC program allows us to further our mission of accessible quality education."
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                {['PEAC Certified', 'DepEd Recognized', 'ESC Partner'].map(tag => (
                  <span key={tag} className="px-6 py-3 bg-[#185C20] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-[#185C20]/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
