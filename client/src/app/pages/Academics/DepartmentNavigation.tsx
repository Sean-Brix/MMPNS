import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Award } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

interface Level {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  img: string;
  stats: { label: string; value: string }[];
  highlights: string[];
}

interface DepartmentNavigationProps {
  levels: Level[];
}

export const DepartmentNavigation: React.FC<DepartmentNavigationProps> = ({ levels }) => {
  const [activeTab, setActiveTab] = useState('Elementary');

  return (
    <section className="py-20 bg-gray-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4 text-[#185C20]">Our Departments</h2>
          <div className="w-24 h-1 bg-[#EDCD1F] mx-auto mb-4"></div>
          <p className="text-gray-500 font-serif italic">Select a department to explore our specialized curriculum.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:sticky lg:top-32 h-fit">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => setActiveTab(level.id)}
                className={`group relative p-6 rounded-2xl border text-left transition-all duration-300 ${
                  activeTab === level.id 
                    ? 'bg-[#185C20] border-[#185C20] shadow-xl' 
                    : 'bg-white border-gray-100 hover:border-[#185C20]/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === level.id ? 'text-[#EDCD1F]' : 'text-[#185C20]'}`}>
                    {level.subtitle.split(' ')[0]}
                  </span>
                  <ChevronRight size={16} className={`transition-transform duration-300 ${activeTab === level.id ? 'text-[#EDCD1F] translate-x-1' : 'text-gray-300'}`} />
                </div>
                <h3 className={`text-xl font-serif font-bold ${activeTab === level.id ? 'text-white' : 'text-gray-900'}`}>
                  {level.title}
                </h3>
                {activeTab === level.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#EDCD1F] rounded-r-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Dynamic Content Area */}
          <div className="w-full lg:w-2/3 min-h-[600px]">
            <AnimatePresence mode="wait">
              {levels.map((level) => level.id === activeTab && (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden"
                >
                  {/* Compact Image Banner */}
                  <div className="h-64 relative">
                    <ImageWithFallback 
                      src={level.img} 
                      alt={level.title} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-8">
                      <h4 className="text-white text-3xl font-serif font-bold">{level.title} Showcase</h4>
                    </div>
                  </div>

                  <div className="p-8 lg:p-10">
                    {/* Stats Grid */}
                    <div className="flex gap-10 mb-8 border-b border-gray-100 pb-8 overflow-x-auto">
                      {level.stats.map((stat, i) => (
                        <div key={i} className="shrink-0">
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                          <p className="text-xl font-serif font-bold text-[#185C20]">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div>
                          <p className="text-xs font-black text-[#185C20] uppercase tracking-widest mb-2">Academic Overview</p>
                          <p className="text-gray-600 font-serif leading-relaxed italic">
                            {level.description}
                          </p>
                        </div>
                        <Button className="w-full h-14" onClick={() => window.location.href = '#admissions'}>
                          Enroll Your Child <ChevronRight size={18} className="ml-2" />
                        </Button>
                      </div>

                      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                        <h5 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                          <Award className="text-[#EDCD1F]" size={18} />
                          Program Highlights:
                        </h5>
                        <ul className="space-y-3">
                          {level.highlights.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 group">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#185C20] shrink-0"></div>
                              <span className="text-xs text-gray-600 leading-tight">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
