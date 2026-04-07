import React from 'react';
import { ShieldCheck, Award, BookOpen } from 'lucide-react';

export const AccreditationSection: React.FC = () => {
  return (
    <section className="py-12 md:py-20 bg-white border-y border-gray-100">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
           <div className="flex items-center gap-2 md:gap-3">
             <ShieldCheck className="w-8 h-8 md:w-12 md:h-12 text-[#185C20]" />
             <div className="font-bold leading-tight">
               <div className="text-base md:text-lg">PEAC</div>
               <div className="text-[8px] md:text-[10px] text-gray-500 uppercase">Certified Member</div>
             </div>
           </div>
           <div className="flex items-center gap-2 md:gap-3">
             <Award className="w-8 h-8 md:w-12 md:h-12 text-[#185C20]" />
             <div className="font-bold leading-tight">
               <div className="text-base md:text-lg">ESC</div>
               <div className="text-[8px] md:text-[10px] text-gray-500 uppercase">Government Partner</div>
             </div>
           </div>
           <div className="flex items-center gap-2 md:gap-3">
             <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-[#185C20]" />
             <div className="font-bold leading-tight">
               <div className="text-base md:text-lg">MATATAG</div>
               <div className="text-[8px] md:text-[10px] text-gray-500 uppercase">Curriculum</div>
             </div>
           </div>
        </div>
      </div>
    </section>
  );
};
