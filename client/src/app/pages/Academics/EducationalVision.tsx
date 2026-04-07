import React from 'react';
import { Shield, Library, Globe } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

interface EducationalVisionProps {
  campfireImg: string;
}

export const EducationalVision: React.FC<EducationalVisionProps> = ({ campfireImg }) => {
  return (
    <section className="py-24 bg-white relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <ImageWithFallback 
              src={campfireImg} 
              alt="Student Formation Activity" 
              className="rounded-3xl shadow-2xl aspect-[4/3] object-cover"
            />
            <div className="absolute -bottom-6 left-12 right-12 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 hidden md:flex items-center justify-center gap-4">
              <Shield size={24} className="text-[#185C20]" />
              <div className="text-left">
                <p className="text-[10px] font-black text-[#185C20] uppercase tracking-widest leading-none mb-1">Institutional Quality</p>
                <p className="text-sm font-serif font-bold text-gray-900 leading-none">PEAC & DepEd Accredited</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="inline-block px-4 py-1 border border-[#185C20] text-[#185C20] text-[10px] font-black uppercase tracking-[0.3em] rounded-full">
              Our Educational Vision
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
              Where the Heart Finds <br />
              <span className="text-[#185C20]">Reason and Purpose</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed font-serif italic">
              Our curriculum transcends standardized testing. We seek to cultivate a deep love for learning that is permanently wedded to a disciplined character.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#185C20]/10 rounded-full flex items-center justify-center text-[#185C20] shrink-0">
                  <Library size={20} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed"><strong>Eucharistic Core:</strong> Faith is not a subject; it is the atmosphere of every lesson.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#EDCD1F]/20 rounded-full flex items-center justify-center text-[#185C20] shrink-0">
                  <Globe size={20} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed"><strong>Global Competence:</strong> Preparing students for the challenges of a digital, interconnected world.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
