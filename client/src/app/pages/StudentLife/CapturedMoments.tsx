import React from 'react';
import { motion } from 'motion/react';
import { Camera } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

interface CapturedMomentsProps {
  intramuralsImg: string;
  fireSafetyImg: string;
  isMobile: boolean;
}

export const CapturedMoments: React.FC<CapturedMomentsProps> = ({ 
  intramuralsImg, 
  fireSafetyImg,
  isMobile
}) => {
  const highlights = [
    { title: 'Intramurals 2025', date: 'Sept 2025', category: 'Sports', img: intramuralsImg },
    { title: 'Fire Safety Training', date: 'Aug 2025', category: 'Civic Duty', img: fireSafetyImg },
    { title: 'Cultural Night', date: 'Oct 2025', category: 'Arts', img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800" },
    { title: 'Foundress Day', date: 'Feb 2025', category: 'Spiritual', img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800" },
  ];

  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-24">
          <Camera className="mx-auto text-[#EDCD1F] mb-6" size={32} />
          <h2 className="text-5xl md:text-7xl font-serif font-bold text-gray-900 mb-6 tracking-tight">Captured <span className="text-[#185C20]">Moments</span></h2>
          <div className="w-24 h-1 bg-[#EDCD1F] mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((h, i) => (
            <motion.div 
              key={i} 
              initial="rest"
              whileInView={isMobile ? "active" : "rest"}
              whileHover="active"
              viewport={{ once: false, amount: 0.6 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className={`group relative cursor-pointer overflow-hidden rounded-[2rem] shadow-2xl ${i % 2 === 1 ? 'lg:translate-y-12' : ''}`}
            >
              <div className="aspect-[4/5] relative">
                <motion.div 
                  className="absolute inset-0"
                  variants={{
                    rest: { scale: 1, filter: "grayscale(1)" },
                    active: { scale: 1.1, filter: "grayscale(0)" }
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <ImageWithFallback 
                    src={h.img} 
                    alt={h.title} 
                    className="w-full h-full object-cover" 
                  />
                </motion.div>

                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"
                  variants={{
                    rest: { opacity: 0.5 },
                    active: { opacity: 0.9 }
                  }}
                  transition={{ duration: 0.5 }}
                />
                
                <motion.div 
                  className="absolute inset-0 p-8 flex flex-col justify-end"
                  variants={{
                    rest: { y: 20, opacity: 0.7 },
                    active: { y: 0, opacity: 1 }
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <span className="text-[#EDCD1F] text-[10px] font-black uppercase tracking-widest mb-2 block">{h.category}</span>
                  <h4 className="text-2xl font-serif font-bold text-white mb-2 leading-tight">{h.title}</h4>
                  <p className="text-white/60 text-xs uppercase tracking-widest font-bold">{h.date}</p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
