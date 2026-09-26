import React from 'react';
import { Button } from '../../components/ui/Button';

interface InstitutionalCTAProps {
  setCurrentPage: (page: string) => void;
}

export const InstitutionalCTA: React.FC<InstitutionalCTAProps> = ({ setCurrentPage }) => {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#185C20]">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-serif font-bold text-white mb-6 md:mb-8 leading-tight">
            Become a Part of Our <br />
            <span className="text-[#EDCD1F]">Glorious Tradition</span>
          </h2>
          <p className="text-base md:text-xl text-white/70 font-serif italic mb-8 md:mb-12 max-w-2xl mx-auto px-4">
            Enrollment is currently open for the upcoming academic year. Limited slots available for new students.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 px-4">
            <Button size="lg" className="h-14 md:h-16 px-10 md:px-12 text-base md:text-lg bg-[#EDCD1F] text-[#185C20] hover:bg-white shadow-xl shadow-black/20 border-none transition-all duration-300 w-full sm:w-auto" onClick={() => setCurrentPage('admissions')}>
              Begin Application
            </Button>
            <Button variant="outline" size="lg" className="h-14 md:h-16 px-10 md:px-12 text-base md:text-lg border-white/30 bg-white text-black hover:bg-white/90 hover:text-black w-full sm:w-auto" onClick={() => setCurrentPage('contact')}>
              Inquire via WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
