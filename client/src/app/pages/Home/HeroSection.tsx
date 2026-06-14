import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ImagePlus, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { HOME_IMAGE_DEFAULTS, type HomeImageSlotKey } from '../../../utils/homeImageSlots';

interface HeroSectionProps {
  setCurrentPage: (page: string) => void;
  slides: Array<{
    type: 'hero' | 'announcement' | 'bulletin';
    title: string;
    subtitle: string;
    description: string;
    image: string | null;
    eventImage?: string;
    accent?: string;
    location: string;
    date?: string;
    time?: string;
    imageSlot?: HomeImageSlotKey;
  }>;
  isImageEditMode?: boolean;
  onEditImage?: (slot: HomeImageSlotKey) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  setCurrentPage,
  slides,
  isImageEditMode = false,
  onEditImage,
}) => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(next, 10000);
    return () => clearInterval(id);
  }, [next, slides.length]);

  return (
    <section className="relative h-[calc(100dvh-80px)] md:h-[calc(100dvh-116px)] overflow-hidden bg-[#185C20]">
      <AnimatePresence mode="wait">
        {slides.map((slide, index) =>
          index === current ? (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <div className="relative h-full outline-none">
                <div className="absolute inset-0 z-0 overflow-hidden">
                  {slide.type === 'hero' ? (
                    <>
                      <ImageWithFallback
                        src={slide.image || ''}
                        fallbackSrc={slide.imageSlot ? HOME_IMAGE_DEFAULTS[slide.imageSlot] : undefined}
                        alt={slide.title}
                        className="w-full h-full object-cover brightness-[0.4] md:brightness-[0.5]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#185C20]/60 via-transparent to-transparent"></div>
                    </>
                  ) : (
                    <div className={`absolute inset-0 ${slide.type === 'announcement' ? 'bg-[#185C20]' : 'bg-[#0d3d15]'}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(237,205,31,0.08),transparent_70%)]"></div>
                      <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
                    </div>
                  )}
                </div>

                <div className="container mx-auto px-4 sm:px-6 relative z-10 text-white h-full flex items-center">
                  {slide.type === 'hero' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="max-w-4xl w-full"
                    >
                      <div className="mb-4 sm:mb-8 space-y-1 sm:space-y-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-px w-10 sm:w-16 bg-[#EDCD1F]"></div>
                          <span className="text-[#EDCD1F] font-sans font-bold tracking-[0.2em] sm:tracking-[0.4em] uppercase text-[10px] sm:text-sm">
                            {slide.location}
                          </span>
                        </div>
                        <p className="text-white font-serif italic text-sm sm:text-2xl opacity-90">{slide.subtitle}</p>
                      </div>

                      <h1 className="text-3xl sm:text-7xl md:text-5xl lg:text-7xl xl:text-8xl font-serif font-bold mb-6 sm:mb-12 md:mb-6 lg:mb-10 leading-[1.1] md:leading-[0.95] tracking-tight">
                        {(() => {
                          const accent = slide.accent?.trim();
                          if (!accent || !slide.title.includes(accent)) {
                            return <>{slide.title}</>;
                          }

                          const [beforeAccent] = slide.title.split(accent);
                          return (
                            <>
                              {beforeAccent} <br className="hidden sm:block" />
                              <span className="text-[#EDCD1F]">{accent}</span>
                            </>
                          );
                        })()}
                      </h1>

                      <p className="text-base sm:text-xl md:text-base lg:text-xl text-white/90 mb-8 sm:mb-16 md:mb-6 lg:mb-12 max-w-2xl font-sans leading-relaxed border-l-4 border-[#EDCD1F] pl-4 sm:pl-8 py-1 sm:py-2">
                        {slide.description}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                        <Button
                          size="lg"
                          className="h-12 sm:h-16 md:h-12 lg:h-16 px-8 sm:px-12 md:px-6 lg:px-10 text-base sm:text-lg lg:text-lg shadow-2xl w-full sm:w-auto"
                          onClick={() => setCurrentPage('admissions')}
                        >
                          Enroll Your Child
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-12 sm:h-14 md:h-12 lg:h-16 px-8 sm:px-12 md:px-6 lg:px-10 text-base sm:text-lg lg:text-lg border-white/30 bg-white text-black hover:bg-white/90 hover:text-black backdrop-blur-sm w-full sm:w-auto"
                          onClick={() => setCurrentPage('about')}
                        >
                          Our Heritage
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="w-full flex flex-col md:flex-row items-center gap-8 sm:gap-10 md:gap-12 lg:gap-16 py-6"
                    >
                      {/* Content Section */}
                      <div className="w-full md:flex-1 space-y-6 sm:space-y-8 md:space-y-6 lg:space-y-10 order-2 md:order-1 text-center md:text-left">
                        <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-4">
                          <div className="flex items-center gap-2 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-[#EDCD1F] text-[#185C20] text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-sm">
                              {slide.type === 'announcement' ? 'Featured Event' : 'Invitation'}
                            </span>
                          </div>
                          <p className="text-[#EDCD1F] font-sans font-black tracking-[0.1em] text-xs sm:text-lg lg:text-base uppercase">
                            {slide.subtitle}
                          </p>
                          <h2 className="text-3xl sm:text-5xl md:text-4xl lg:text-5xl xl:text-7xl font-serif font-bold leading-tight md:leading-[1.1] tracking-tighter">
                            {slide.title}
                          </h2>
                          <div className="w-12 h-1 bg-[#EDCD1F] mx-auto md:mx-0"></div>
                        </div>

                        <p className="text-sm sm:text-lg md:text-sm lg:text-lg text-white/80 font-serif italic max-w-xl mx-auto md:mx-0 leading-relaxed line-clamp-3 md:line-clamp-none">
                          {slide.description}
                        </p>

                        <div className="flex flex-col gap-6 sm:gap-6 md:gap-4 lg:gap-3 pt-2 md:pt-4 items-center md:items-start">
                          <div className="flex items-center gap-6 sm:gap-10 md:gap-6">
                            <div className="text-center min-w-[45px] sm:min-w-[60px] md:min-w-[50px]">
                              <p className="text-2xl sm:text-4xl md:text-3xl font-serif font-bold text-[#EDCD1F]">
                                {slide.date?.split(' ')[1]}
                              </p>
                              <p className="text-[10px] sm:text-xs md:text-[9px] font-bold uppercase tracking-widest opacity-70">
                                {slide.date?.split(' ')[0]}
                              </p>
                            </div>
                            <div className="h-10 sm:h-14 md:h-10 w-px bg-white/20"></div>
                            <div className="text-left space-y-1 sm:space-y-2 md:space-y-1">
                              <div className="flex items-center gap-2 text-sm sm:text-lg md:text-sm font-bold">
                                <Clock size={16} className="text-[#EDCD1F] sm:w-5 sm:h-5 md:w-4 md:h-4" /> {slide.time}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] sm:text-base md:text-xs font-bold opacity-70">
                                <MapPin size={16} className="sm:w-5 sm:h-5 md:w-4 md:h-4" /> {slide.location}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Image Section */}
                      <div className="w-full md:w-[40%] flex justify-center order-1 md:order-2 shrink-0">
                        <div
                          className={`relative w-[200px] sm:w-[340px] md:w-full lg:max-w-[380px] xl:max-w-[450px] 2xl:max-w-[500px] ${
                            slide.type === 'bulletin' ? 'aspect-[4/5]' : 'aspect-square'
                          }`}
                        >
                          {slide.type === 'bulletin' ? (
                            <div className="h-full overflow-hidden rounded-t-full border-[5px] sm:border-[10px] border-[#EDCD1F] shadow-2xl">
                              <ImageWithFallback
                                src={slide.eventImage || ''}
                                fallbackSrc={slide.imageSlot ? HOME_IMAGE_DEFAULTS[slide.imageSlot] : undefined}
                                alt="Event"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-full bg-white p-2.5 pb-8 sm:p-4 sm:pb-16 shadow-2xl transform -rotate-2">
                              <ImageWithFallback
                                src={slide.eventImage || ''}
                                fallbackSrc={slide.imageSlot ? HOME_IMAGE_DEFAULTS[slide.imageSlot] : undefined}
                                alt="Event"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {slide.type === 'hero' && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="absolute bottom-16 right-12 hidden xl:block z-20"
                  >
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl w-72 shadow-2xl">
                      <div className="text-[#EDCD1F] text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-8 h-px bg-[#EDCD1F]"></span> Virtue of the Month
                      </div>
                      <h3 className="text-white font-serif text-3xl font-bold mb-3">Humility</h3>
                      <p className="text-white/70 text-sm italic font-serif leading-relaxed">
                        "To be humble is not to think less of yourself, but to think of yourself less."
                      </p>
                    </div>
                  </motion.div>
                )}

                {isImageEditMode && slide.imageSlot && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditImage?.(slide.imageSlot as HomeImageSlotKey);
                    }}
                    className="absolute bottom-16 md:bottom-20 right-4 md:right-8 z-30 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/55 text-white text-xs font-bold hover:bg-black/70 transition-colors border border-white/25"
                  >
                    <ImagePlus size={14} />
                    Edit image
                  </button>
                )}
              </div>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 md:bottom-12 left-0 right-0 z-30 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === current ? 'bg-[#EDCD1F] scale-110' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
