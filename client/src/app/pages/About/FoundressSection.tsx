import React from 'react';
import { motion } from 'motion/react';
import { Quote, Sparkles } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { SITE_IMAGE_DEFAULTS } from '../../../utils/siteImageSlots';

interface FoundressSectionProps {
  foundressImg: string;
  isMobile: boolean;
}

export const FoundressSection: React.FC<FoundressSectionProps> = ({ foundressImg, isMobile }) => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 relative group">
            <div className="absolute -inset-4 border-2 border-[#185C20]/10 rounded-[2rem] -rotate-3 transition-transform group-hover:rotate-0 duration-700"></div>
            <div className="absolute -inset-4 border-2 border-[#EDCD1F]/20 rounded-[2rem] rotate-3 transition-transform group-hover:rotate-0 duration-700 delay-75"></div>
            
            <motion.div
              initial="rest"
              whileInView={isMobile ? "active" : "rest"}
              whileHover="active"
              viewport={{ once: false, amount: 0.7 }}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl z-10 bg-white p-4 cursor-pointer"
            >
              <motion.div
                variants={{
                  rest: { scale: 1, filter: "grayscale(0.75) contrast(1.1) sepia(0.1)" },
                  active: { scale: 1.05, filter: "grayscale(0) contrast(1) sepia(0)" }
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full w-full rounded-xl overflow-hidden"
              >
                <ImageWithFallback 
                  src={foundressImg} 
                  fallbackSrc={SITE_IMAGE_DEFAULTS.sharedMariaPia}
                  alt="Madre Maria Pia Notari" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>

            <div className="absolute -bottom-6 -right-4 md:-bottom-10 md:-right-10 bg-[#185C20] p-6 md:p-8 text-white rounded-2xl shadow-2xl z-20 max-w-[240px] md:max-w-[280px]">
              <Quote size={24} className="text-[#EDCD1F] mb-3 opacity-50" />
              <p className="font-serif italic text-base md:text-lg leading-tight">"In the Eucharist, we find the strength to educate with love."</p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <div>
              <span className="text-[#185C20] font-sans font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Founding Charism</span>
              <h2 className="text-5xl md:text-7xl font-bold text-gray-900 leading-none mb-6">
                Madre Maria <br />
                <span className="text-[#185C20] italic font-normal">Pia Notari</span>
              </h2>
              <div className="w-20 h-1.5 bg-[#EDCD1F] rounded-full"></div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-6">
                <p className="text-gray-700 text-xl leading-relaxed first-letter:text-6xl first-letter:font-bold first-letter:text-[#185C20] first-letter:mr-3 first-letter:float-left first-letter:leading-none">
                  Madre Maria Pia Notari (1847–1919), the foundress of the Sisters Adorers of the Holy Eucharist, believed that education is a form of continuous adoration. 
                </p>
                <p className="text-gray-600 text-lg leading-relaxed italic border-l-2 border-[#EDCD1F] pl-8">
                  In 1988, this vision was brought to Multinational Village, Parañaque, creating a sanctuary where students could flourish under the maternal care of the sisters and a dedicated lay faculty.
                </p>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Today, MMPNS stands as a testament to her legacy—a place where faith and reason are not separate paths, but one journey toward human flourishing.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
               {[1,2,3].map(i => (
                 <div key={i} className="h-12 w-12 rounded-full border border-[#185C20]/10 flex items-center justify-center">
                   <Sparkles size={16} className="text-[#EDCD1F]" />
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
