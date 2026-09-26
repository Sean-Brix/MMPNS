import React from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { AlumniProfile } from './types';

interface AlumniCardProps {
  alumni: AlumniProfile;
  onClick: () => void;
  index: number;
}

export const AlumniCard: React.FC<AlumniCardProps> = ({ alumni, onClick, index }) => {
  return (
    <motion.div
      layoutId={`card-${alumni.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      onClick={onClick}
      className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-[#185C20]/5 hover:shadow-[0_20px_40px_-10px_rgba(24,92,32,0.1)] hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <div className="absolute inset-0 bg-[#185C20]/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
        <motion.div layoutId={`image-${alumni.id}`} className="w-full h-full">
           <ImageWithFallback 
              src={alumni.img} 
              alt={alumni.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
           />
        </motion.div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#185C20] via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity z-20" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 z-30">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 bg-[#EDCD1F] rounded text-[9px] font-bold text-[#185C20] uppercase tracking-widest">
              Batch {alumni.batch}
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-white mb-1 group-hover:text-[#EDCD1F] transition-colors">{alumni.name}</h3>
          <p className="text-white/60 text-xs uppercase tracking-wider">{alumni.role}</p>
        </div>
      </div>
    </motion.div>
  );
};
