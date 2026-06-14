import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Music, Palette, Heart } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { SITE_IMAGE_DEFAULTS } from '../../../utils/siteImageSlots';

interface ClubsAndOrgsProps {
  varsitySportsImg: string;
  gleeClubImg: string;
  artGuildImg: string;
  stewardshipClubImg: string;
  isMobile: boolean;
}

export const ClubsAndOrgs: React.FC<ClubsAndOrgsProps> = ({ 
  varsitySportsImg, 
  gleeClubImg, 
  artGuildImg, 
  stewardshipClubImg,
  isMobile
}) => {
  const clubs = [
    { 
      name: 'Varsity Sports', 
      icon: <Trophy />, 
      color: 'from-orange-400 to-red-500', 
      desc: 'Basketball, Volleyball, and Badminton teams representing MMPNS in local meets.',
      accent: 'text-orange-600',
      image: varsitySportsImg,
      fallbackImage: SITE_IMAGE_DEFAULTS.studentLifeBasketball,
    },
    { 
      name: 'Glee Club', 
      icon: <Music />, 
      color: 'from-blue-400 to-indigo-600', 
      desc: 'Developing vocal talents and performing in school and community celebrations.',
      accent: 'text-blue-600',
      image: gleeClubImg,
      fallbackImage: SITE_IMAGE_DEFAULTS.studentLifeGleeClub,
    },
    { 
      name: 'Art Guild', 
      icon: <Palette />, 
      color: 'from-purple-400 to-pink-600', 
      desc: 'A haven for creative minds to explore various mediums and visual storytelling.',
      accent: 'text-purple-600',
      image: artGuildImg,
      fallbackImage: SITE_IMAGE_DEFAULTS.studentLifeArtGuild,
    },
    { 
      name: 'Stewardship Club', 
      icon: <Heart />, 
      color: 'from-emerald-400 to-teal-600', 
      desc: 'Focusing on community outreach and environmental preservation initiatives.',
      accent: 'text-emerald-600',
      image: stewardshipClubImg,
      fallbackImage: SITE_IMAGE_DEFAULTS.studentLifeSteward,
    },
  ];

  return (
    <section className="py-32 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#185C20]/[0.02] -skew-x-12 transform translate-x-1/2"></div>
      
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 md:mb-20 gap-4 md:gap-8">
          <div className="max-w-2xl">
            <span className="text-[#185C20] font-sans font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Co-Curricular Growth</span>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-gray-900 tracking-tight leading-[1.1]">
              Clubs & <span className="text-[#185C20]">Talents</span>
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-gray-500 font-serif italic text-base md:text-lg leading-relaxed text-left md:text-right">
              Discovering hidden potentials through a diverse range of artistic, athletic, and spiritual organizations.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {clubs.map((club, i) => (
            <motion.div 
              key={i}
              initial="rest"
              whileInView={isMobile ? "active" : "rest"}
              whileHover="active"
              viewport={{ once: false, amount: 0.7 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group relative h-[450px] md:h-[500px] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/40 cursor-pointer"
            >
              <motion.div 
                className="absolute inset-0 z-0"
                variants={{
                  rest: { scale: 1, filter: "grayscale(0.5)" },
                  active: { scale: 1.1, filter: "grayscale(0)" }
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <ImageWithFallback 
                  src={club.image} 
                  fallbackSrc={club.fallbackImage}
                  alt={club.name} 
                  className="w-full h-full object-cover" 
                />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"
                  variants={{
                    rest: { opacity: 0.9 },
                    active: { opacity: 0.7 }
                  }}
                />
              </motion.div>

              <div className="absolute inset-0 z-10 p-6 md:p-8 flex flex-col">
                <div className="flex justify-between items-start">
                  <motion.div 
                    variants={{
                      rest: { rotate: -12, scale: 1 },
                      active: { rotate: 0, scale: 1.1 }
                    }}
                    className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg"
                  >
                    {React.cloneElement(club.icon as React.ReactElement, { size: 20 })}
                  </motion.div>
                  <span className="bg-[#EDCD1F] text-[#185C20] text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Active 2026
                  </span>
                </div>

                <motion.div 
                  variants={{
                    rest: { y: 0 },
                    active: { y: -10 }
                  }}
                  className="mt-auto"
                >
                  <h4 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2 md:mb-3 tracking-tight group-hover:text-[#EDCD1F] transition-colors uppercase italic">
                    {club.name}
                  </h4>
                  <motion.p 
                    variants={{
                      rest: { height: 0, opacity: 0, marginBottom: 0, display: "none" },
                      active: { height: "auto", opacity: 1, marginBottom: 12, display: "block" }
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="text-white/70 text-xs md:text-sm leading-relaxed font-serif italic overflow-hidden"
                  >
                    {club.desc}
                  </motion.p>
                </motion.div>
              </div>

              <div className="absolute inset-0 border border-white/0 group-hover:border-white/20 rounded-[2rem] md:rounded-[2.5rem] transition-colors duration-700 pointer-events-none"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
