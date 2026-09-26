import React from 'react';
import { Target, Sparkles } from 'lucide-react';

export const MissionVision: React.FC = () => {
  return (
    <section className="py-32 relative bg-white">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/vintage-speckles.png')]"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0 bg-[#fcfaf2] border-4 border-[#185C20] rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(24,92,32,0.2)]">
            {/* Mission */}
            <div className="p-12 md:p-20 border-b lg:border-b-0 lg:border-r-2 border-[#185C20]/10 hover:bg-white transition-colors duration-500 group">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-12">
                  <div className="absolute -inset-4 bg-[#185C20]/5 rounded-full scale-150 group-hover:scale-110 transition-transform duration-700"></div>
                  <Target size={60} className="text-[#185C20] relative z-10" />
                </div>
                <h3 className="text-4xl font-bold mb-8 text-[#185C20] uppercase tracking-widest flex items-center gap-4">
                  <span className="h-px w-8 bg-[#EDCD1F]"></span>
                  Mission
                  <span className="h-px w-8 bg-[#EDCD1F]"></span>
                </h3>
                <p className="text-gray-700 text-2xl font-serif italic leading-relaxed">
                  "In response to giving quality education for all, Madre Maria Pia Notari School, while adhering to the Constitutional mandate, shall endeavour to assist parents in the spiritual, intellectual, physical and social development of their child."
                </p>
              </div>
            </div>
            
            {/* Vision */}
            <div className="p-12 md:p-20 hover:bg-white transition-colors duration-500 group">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-12">
                  <div className="absolute -inset-4 bg-[#EDCD1F]/10 rounded-full scale-150 group-hover:scale-110 transition-transform duration-700"></div>
                  <Sparkles size={60} className="text-[#EDCD1F] relative z-10" />
                </div>
                <h3 className="text-4xl font-bold mb-8 text-[#185C20] uppercase tracking-widest flex items-center gap-4">
                  <span className="h-px w-8 bg-[#185C20]"></span>
                  Vision
                  <span className="h-px w-8 bg-[#185C20]"></span>
                </h3>
                <p className="text-gray-700 text-2xl font-serif italic leading-relaxed">
                  "Madre Maria Pia Notari School envisions herself as a center of holistic Catholic education, preparing the learners to continuously discover God’s abundant love for mankind."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
