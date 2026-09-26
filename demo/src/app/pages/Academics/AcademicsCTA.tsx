import React from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AcademicsCTA: React.FC = () => {
  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <GraduationCap className="mx-auto text-[#185C20] mb-8" size={48} />
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-8 leading-tight">
            Invest in a Future Rooted <br />
            <span className="italic font-normal">in Knowledge and Virtue</span>
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Button size="lg" className="h-16 px-12 bg-[#185C20]">Download Prospectus</Button>
            <Button variant="outline" size="lg" className="h-16 px-12 border-[#185C20] text-[#185C20]">Book a Campus Tour</Button>
          </div>
          <p className="mt-8 text-sm text-gray-400 font-bold uppercase tracking-[0.2em]">Enrolling Now for Academic Year 2026-2027</p>
        </div>
      </div>
    </section>
  );
};
