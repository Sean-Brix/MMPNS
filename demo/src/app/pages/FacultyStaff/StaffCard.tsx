import React from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { StaffMember } from './types';
import { Clock, ChevronRight } from 'lucide-react';
import { calculateYearsAtMmpns } from '../../../utils/staffYears';

interface StaffCardProps {
  staff: StaffMember;
  onClick: () => void;
  index: number;
}

export const StaffCard: React.FC<StaffCardProps> = ({ staff, onClick, index }) => {
  const yearsAtMmpns = calculateYearsAtMmpns(staff.startedAtMmpns, staff.yearsAtMmpns);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      {/* Card Container */}
      <div className="relative bg-white rounded-2xl overflow-hidden border border-[#185C20]/5 shadow-sm hover:shadow-[0_16px_48px_-12px_rgba(24,92,32,0.12)] hover:-translate-y-1.5 transition-all duration-500">
        {/* Photo */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <ImageWithFallback
            src={staff.img}
            alt={staff.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e10] via-[#185C20]/20 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500" />

          {/* Years badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/15 backdrop-blur-md rounded-full text-white/80 border border-white/10">
            <Clock size={10} />
            <span className="text-[9px] font-bold">{yearsAtMmpns}y</span>
          </div>

          {/* Department tag */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-[#EDCD1F] rounded-md text-[#185C20] text-[8px] font-black tracking-widest uppercase shadow-lg">
              {staff.department}
            </span>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-lg font-serif font-bold text-white mb-0.5 leading-tight group-hover:text-[#EDCD1F] transition-colors duration-300">
              {staff.name}
            </h3>
            <p className="text-white/50 text-[10px] uppercase tracking-wider leading-relaxed line-clamp-2">
              {staff.role}
            </p>
          </div>

          {/* Hover CTA */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest translate-y-3 group-hover:translate-y-0 transition-transform duration-500">
              View Profile <ChevronRight size={12} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
