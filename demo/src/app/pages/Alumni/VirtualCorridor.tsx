import React from 'react';
import { motion } from 'motion/react';
import { Quote, BookOpen, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

interface VirtualCorridorProps {
  setCurrentPage?: (page: string) => void;
}

export const VirtualCorridor: React.FC<VirtualCorridorProps> = ({ setCurrentPage }) => {
  return (
    <section className="py-24 md:py-40 bg-[#185C20] text-white overflow-hidden relative">
      {/* Background Texture & Depth */}
      <div className="absolute inset-0 opacity-[0.03]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-[radial-gradient(#EDCD1F_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" 
        />
      </div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FAF9F6] to-transparent z-10" />
      
      {/* Decorative corner ornaments */}
      <div className="hidden lg:block absolute top-40 left-10 w-32 h-32 border-t-2 border-l-2 border-[#EDCD1F]/10 pointer-events-none" />
      <div className="hidden lg:block absolute bottom-40 right-10 w-32 h-32 border-b-2 border-r-2 border-[#EDCD1F]/10 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-20">
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="w-12 h-px bg-[#EDCD1F]/30" />
              <Quote size={18} className="text-[#EDCD1F]/40 italic" />
              <div className="w-12 h-px bg-[#EDCD1F]/30" />
            </div>
          </motion.div>
        </div>

        {/* Immersive Gallery Portal */}
        <div className="mt-24 md:mt-32 text-center relative">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="inline-block relative px-6 md:px-12 py-10 md:py-16 rounded-[40px] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 overflow-hidden group"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[#EDCD1F]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="flex -space-x-3 mb-2">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="w-10 h-10 rounded-full border-2 border-[#185C20] bg-white/10 flex items-center justify-center backdrop-blur-sm overflow-hidden shadow-xl">
                    <ImageWithFallback src={`https://images.unsplash.com/photo-${1550000000000 + n * 1000000}?auto=format&fit=crop&q=60&w=100`} className="w-full h-full object-cover opacity-50" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-[#185C20] bg-[#EDCD1F] flex items-center justify-center shadow-xl text-[10px] font-bold text-[#185C20] z-10">
                  +10
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">Step into the Virtual Corridor</h4>
                <p className="text-white/40 text-sm md:text-base font-serif italic max-w-md mx-auto leading-relaxed">
                  Reconnect with the faces and stories that defined your years at MMPNS. Our interactive yearbook is more than a list—it&apos;s a shared history.
                </p>
              </div>

              <button
                onClick={() => setCurrentPage?.('alumni-gallery')}
                className="relative group/btn mt-4 inline-flex items-center gap-4 px-10 py-5 bg-[#EDCD1F] text-[#185C20] rounded-full font-bold text-sm overflow-hidden transition-all shadow-[0_20px_50px_-10px_rgba(237,205,31,0.3)] hover:shadow-[0_25px_60px_-10px_rgba(237,205,31,0.5)] hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center gap-3">
                  <BookOpen size={18} />
                  <span>Walk Down Memory Lane</span>
                  <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </span>
              </button>

              <div className="flex items-center gap-3 text-white/20">
                <div className="w-4 h-px bg-current" />
                <p className="text-[9px] tracking-[0.4em] uppercase">Archive established 2024</p>
                <div className="w-4 h-px bg-current" />
              </div>
            </div>
          </motion.div>

          {/* Floating decorative elements */}
          <motion.div animate={{ rotate: [5, 0, 5], y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute -top-10 -right-5 md:right-0 opacity-20 hidden lg:block">
            <div className="w-24 h-32 bg-white/5 border border-white/10 rounded-lg -rotate-12 flex items-center justify-center p-2">
              <div className="w-full h-full bg-white/5 rounded-sm" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
