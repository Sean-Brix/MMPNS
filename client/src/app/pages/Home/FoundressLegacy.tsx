import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ImagePlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import type { HomeImageSlotKey } from '../../../utils/homeImageSlots';

interface FoundressLegacyProps {
  setCurrentPage: (page: string) => void;
  isMobile: boolean;
  foundressImg: string;
  isImageEditMode?: boolean;
  onEditImage?: (slot: HomeImageSlotKey) => void;
}

export const FoundressLegacy: React.FC<FoundressLegacyProps> = ({
  setCurrentPage,
  isMobile,
  foundressImg,
  isImageEditMode = false,
  onEditImage,
}) => {
  return (
    <section className="py-16 md:py-24 bg-white relative">
      <div className="absolute top-0 right-0 w-full md:w-1/3 h-full bg-[#185C20]/[0.02] md:bg-[#185C20]/5 -z-10"></div>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -top-6 -left-6 md:-top-10 md:-left-10 w-24 h-24 md:w-40 md:h-40 border-l-2 border-t-2 border-[#EDCD1F] opacity-30 md:opacity-50"></div>
            <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 w-24 h-24 md:w-40 md:h-40 border-r-2 border-b-2 border-[#185C20] opacity-30 md:opacity-50"></div>
            
            <motion.div
              initial="rest"
              whileInView={isMobile ? "active" : "rest"}
              whileHover="active"
              viewport={{ once: false, amount: 0.7 }}
              className="relative overflow-hidden rounded-lg shadow-2xl md:shadow-[30px_30px_0px_0px_rgba(24,92,32,0.1)] cursor-pointer"
            >
              <motion.div
                variants={{
                  rest: { scale: 1, filter: "grayscale(0.75)" },
                  active: { scale: 1.05, filter: "grayscale(0)" }
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <ImageWithFallback 
                  src={foundressImg}
                  alt="Madre Maria Pia Notari"
                  className="w-full aspect-[4/5] object-cover"
                />
              </motion.div>

              {isImageEditMode && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditImage?.('foundressLegacy');
                  }}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/55 text-white text-[11px] font-bold hover:bg-black/70 transition-colors border border-white/25"
                >
                  <ImagePlus size={12} />
                  Edit image
                </button>
              )}
            </motion.div>

            <div className="absolute bottom-4 -right-2 md:bottom-8 md:-right-8 bg-[#EDCD1F] p-5 md:p-8 shadow-xl max-w-[200px] md:max-w-[240px] z-10">
              <p className="text-[#185C20] font-serif italic text-base md:text-lg font-bold leading-tight">
                "Let your life be a continuous act of adoration."
              </p>
              <p className="text-[#185C20]/60 text-[9px] md:text-[10px] font-bold uppercase tracking-wider mt-3 md:mt-4">— Madre Maria Pia Notari</p>
            </div>
          </div>
          
          <div className="space-y-6 md:space-y-8 order-1 lg:order-2">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 md:w-12 bg-[#185C20]"></div>
              <span className="text-[#185C20] font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em]">Our Foundress & Charism</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
              Rooted in the Legacy of <br className="hidden md:block" />
              <span className="text-[#185C20]">Eucharistic Adoration</span>
            </h2>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed font-serif italic">
              Guided by the spiritual legacy of the Sisters Adorers of the Holy Eucharist, MMPNS provides more than just education—we provide a way of life.
            </p>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">
              Since our founding in 1988, we have integrated the values of devotion, discipline, and dedicated service into every lesson. Our campus is not just a place of study, but a sanctuary of growth where faith and intellect walk hand in hand.
            </p>
            <div className="grid grid-cols-2 gap-6 md:gap-8 pt-2">
              <div className="space-y-1 md:space-y-2">
                <div className="text-2xl md:text-3xl font-bold font-serif text-[#185C20]">35+</div>
                <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Years of Tradition</p>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div className="text-2xl md:text-3xl font-bold font-serif text-[#185C20]">100%</div>
                <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Catholic Values</p>
              </div>
            </div>
            <Button variant="ghost" className="p-0 font-bold text-[#185C20] group hover:bg-transparent" onClick={() => setCurrentPage('about')}>
              Explore Our Heritage <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
