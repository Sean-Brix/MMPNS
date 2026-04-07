import React from 'react';
import { History } from 'lucide-react';

export const AlumniStats: React.FC = () => {
  const stats = [
    { label: 'Graduates', value: '5,000+' },
    { label: 'Batches', value: '45+' },
    { label: 'Professionals', value: '1,200+' },
    { label: 'Service awards', value: '200+' }
  ];

  return (
    <section className="py-20 md:py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <History className="w-10 md:w-12 h-10 md:h-12 text-[#EDCD1F] mx-auto mb-6 md:mb-8 opacity-50" />
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#185C20] mb-6 md:mb-8">Continuing the Sisters Adorers Charism</h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-serif italic mb-10 md:mb-12">
            Our alumni are the living testament of the seeds sown by the Sisters Adorers. 
            Across different fields and vocations, the spirit of service and devotion remains the same.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm md:shadow-none md:border-none md:bg-transparent">
                <div className="text-2xl md:text-3xl font-bold text-[#185C20]">{stat.value}</div>
                <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
