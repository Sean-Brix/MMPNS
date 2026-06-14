import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { SITE_IMAGE_DEFAULTS } from '../../../utils/siteImageSlots';

interface StudentLifeHeroProps {
  studentLifeHeroImg: string;
}

export const StudentLifeHero: React.FC<StudentLifeHeroProps> = ({ studentLifeHeroImg }) => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  return (
    <section className="relative h-[80vh] flex items-center justify-center bg-[#185C20]">
      <motion.div 
        style={{ opacity, scale }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <ImageWithFallback 
          src={studentLifeHeroImg} 
          fallbackSrc={SITE_IMAGE_DEFAULTS.studentLifeHero}
          alt="Student Life" 
          className="w-full h-full object-cover"
        />
      </motion.div>
      
      <div className="container mx-auto px-4 relative z-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EDCD1F] text-[#185C20] rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-xl">
            <Sparkles size={14} /> Vibrant Community
          </span>
          <h1 className="text-6xl md:text-9xl font-serif font-bold text-white mb-8 tracking-tighter leading-none">
            Student <br /><span className="text-[#EDCD1F] italic font-normal">Life</span>
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-xl font-serif italic border-t border-white/20 pt-8">
            "Building character through exploration, passion, and spiritual growth in a nurturing environment."
          </p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-[#EDCD1F]"
      >
        <div className="w-px h-16 bg-gradient-to-b from-[#EDCD1F] to-transparent"></div>
      </motion.div>
    </section>
  );
};
