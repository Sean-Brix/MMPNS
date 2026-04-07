import React from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import type { HomeImageSlotKey } from '../../../utils/homeImageSlots';

interface AcademicHighlightsProps {
  setCurrentPage: (page: string) => void;
  kindergartenImg: string;
  elementaryImg: string;
  juniorHighImg: string;
  isImageEditMode?: boolean;
  onEditImage?: (slot: HomeImageSlotKey) => void;
}

export const AcademicHighlights: React.FC<AcademicHighlightsProps> = ({ 
  setCurrentPage, 
  kindergartenImg, 
  elementaryImg, 
  juniorHighImg,
  isImageEditMode = false,
  onEditImage,
}) => {
  const levels = [
    {
      title: 'Kindergarten',
      label: 'The First Steps',
      img: kindergartenImg,
      desc: 'Safe, fun, and values-driven start for our youngest explorers.',
      imageSlot: 'academicKindergarten' as HomeImageSlotKey,
    },
    {
      title: 'Elementary',
      label: 'The Building Blocks',
      img: elementaryImg,
      desc: 'Comprehensive learning that ignites curiosity and logic.',
      imageSlot: 'academicElementary' as HomeImageSlotKey,
    },
    {
      title: 'Junior High',
      label: 'The Flight Path',
      img: juniorHighImg,
      desc: 'Rigorous preparation for college and professional callings.',
      imageSlot: 'academicJuniorHigh' as HomeImageSlotKey,
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 md:mb-20 gap-8 text-center md:text-left">
          <div className="max-w-2xl">
            <div className="text-[#185C20] font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] mb-4">Academic Excellence</div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-gray-900 leading-[1.1] md:leading-tight">
              Nurturing Potential from <br className="hidden md:block" />
              <span className="italic font-normal">Foundation to Future</span>
            </h2>
          </div>
          <Button variant="outline" className="border-[#185C20] text-[#185C20] w-full sm:w-auto" onClick={() => setCurrentPage('academics')}>
            View Full Curriculum
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {levels.map((level, i) => (
            <div key={level.title} className="group cursor-pointer" onClick={() => setCurrentPage('academics')}>
              <div className="relative rounded-2xl overflow-hidden mb-4 md:mb-6 aspect-[10/12]">
                <ImageWithFallback src={level.img} alt={level.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#185C20]/90 via-transparent to-transparent opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 text-white translate-y-0 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#EDCD1F] mb-1 md:mb-2">{level.label}</p>
                  <h4 className="text-2xl md:text-3xl font-serif font-bold mb-2 md:mb-4">{level.title}</h4>
                  <p className="text-xs md:text-sm opacity-90 md:opacity-80 line-clamp-2">{level.desc}</p>
                </div>

                {isImageEditMode && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditImage?.(level.imageSlot);
                    }}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/55 text-white text-[11px] font-bold hover:bg-black/70 transition-colors border border-white/25"
                  >
                    <ImagePlus size={12} />
                    Edit image
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
