import React from 'react';
import { motion } from 'motion/react';
import { Heart, Microscope, Palette, Globe } from 'lucide-react';

export const ScholasticPillars: React.FC = () => {
  const pillars = [
    {
      title: 'Faith Formation',
      icon: <Heart size={32} />,
      desc: 'Daily prayer, eucharistic adoration, and value-based lessons that shape the soul.'
    },
    {
      title: 'STEM Discovery',
      icon: <Microscope size={32} />,
      desc: 'Fostering analytical thinking through laboratory experiments and mathematical mastery.'
    },
    {
      title: 'Art & Culture',
      icon: <Palette size={32} />,
      desc: 'Cultivating creative expression through fine arts, music, and dramatic performances.'
    },
    {
      title: 'Digital Fluency',
      icon: <Globe size={32} />,
      desc: 'Integrating modern technology to prepare students for the demands of the 21st century.'
    }
  ];

  return (
    <section className="py-24 bg-[#185C20]">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20 text-white">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Our Scholastic Pillars</h2>
          <div className="w-24 h-1 bg-[#EDCD1F] mx-auto mb-8"></div>
          <p className="text-white/60 font-serif italic text-lg">Four foundations that ensure a balanced, high-quality Catholic education for every MMPNS student.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white/5 border border-white/10 p-10 rounded-2xl text-white hover:bg-white hover:text-[#185C20] transition-all duration-500 group"
            >
              <div className="text-[#EDCD1F] mb-8 group-hover:text-[#185C20] transition-colors">{pillar.icon}</div>
              <h4 className="text-xl font-serif font-bold mb-4">{pillar.title}</h4>
              <p className="text-sm opacity-60 group-hover:opacity-100 leading-relaxed">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
