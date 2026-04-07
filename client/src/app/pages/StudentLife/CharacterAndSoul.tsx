import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, HelpCircle, Star, Quote } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export const CharacterAndSoul: React.FC = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div>
              <span className="px-4 py-1.5 bg-[#185C20]/10 text-[#185C20] rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6 inline-block">
                Holistic Care
              </span>
              <h2 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 mb-8 tracking-tighter leading-none">
                Nurturing <span className="text-[#185C20]">Character</span> & Soul
              </h2>
              <p className="text-xl text-gray-600 font-serif italic leading-relaxed border-l-4 border-[#EDCD1F] pl-8">
                "The heart of education is the education of the heart." 
                <span className="block text-sm not-italic font-bold text-[#185C20] mt-4">— Madre Maria Pia Notari</span>
              </p>
            </div>
            
            <div className="grid gap-8">
              {[
                { title: 'Safe Haven', icon: <ShieldCheck />, desc: '24/7 security and strict visitor protocols within Multinational Village security perimeter.' },
                { title: 'Pathfinder Guidance', icon: <HelpCircle />, desc: 'Dedicated guidance services for emotional, social, and academic support at every stage.' },
                { title: 'Faith Journey', icon: <Star />, desc: 'Pastoral care and regular retreats that ground our students in the Sisters Adorers charism.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <div className="shrink-0 w-16 h-16 bg-[#185C20] text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                    {React.cloneElement(item.icon as React.ReactElement, { size: 28 })}
                  </div>
                  <div>
                    <h4 className="text-xl font-serif font-bold mb-2 text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          
          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(24,92,32,0.3)] border-[12px] border-white relative z-10"
            >
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1200" 
                alt="Student Support" 
                className="w-full h-full object-cover brightness-95" 
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="absolute -bottom-10 -left-10 bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 max-w-sm z-20 hidden md:block"
            >
              <Quote className="text-[#EDCD1F] mb-6 opacity-40" size={40} />
              <p className="text-gray-700 font-serif italic text-lg leading-relaxed mb-6">
                "MMPNS isn't just a school; it's a second home where my daughter discovered her voice and her faith."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#185C20] rounded-full border-2 border-[#EDCD1F]"></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#185C20]">Mrs. Dela Cruz</p>
                  <p className="text-[10px] font-bold text-gray-400">Parent, Class of 2026</p>
                </div>
              </div>
            </motion.div>

            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#EDCD1F]/10 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
