import React from 'react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { Users } from 'lucide-react';

interface OrgStructureProps {
  orgChart: string;
}

export const OrgStructure: React.FC<OrgStructureProps> = ({ orgChart }) => {
  const goTo = useAppNavigate();

  return (
    <section className="py-32 bg-[#185C20] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <span className="text-[#EDCD1F] font-sans font-black text-[12px] uppercase tracking-[0.5em] mb-4 block">Institutional Governance</span>
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">Organizational Structure</h2>
          <div className="w-32 h-1 bg-[#EDCD1F] mx-auto"></div>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-2xl border-4 border-[#EDCD1F]/20 overflow-hidden">
            <div className="relative group cursor-zoom-in">
              <ImageWithFallback 
                src={orgChart} 
                alt="MMPNS Organizational Chart" 
                className="w-full h-auto rounded-xl shadow-inner transition-transform duration-700 group-hover:scale-[1.02]" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 rounded-xl flex items-end justify-center pb-8">
                <button
                  onClick={(e) => { e.stopPropagation(); goTo('faculty-staff'); }}
                  className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 inline-flex items-center gap-3 px-8 py-4 bg-[#185C20] text-white rounded-2xl shadow-2xl shadow-[#185C20]/30 hover:bg-[#185C20]/90 active:scale-[0.97] cursor-pointer border-2 border-[#EDCD1F]/30"
                >
                  <Users size={18} className="text-[#EDCD1F]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Meet Our Faculty & Staff</span>
                </button>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6">
               <div className="h-px flex-1 bg-gray-100"></div>
               <p className="text-gray-400 text-[10px] font-sans uppercase tracking-[0.3em] whitespace-nowrap">Official Institutional Hierarchy • Updated 2026</p>
               <div className="h-px flex-1 bg-gray-100"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};