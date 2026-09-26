import React from 'react';
import { Phone, Mail } from 'lucide-react';

export const RegistrarContact: React.FC = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="bg-[#185C20] rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2 text-[#EDCD1F]">Need assistance with enrollment?</h3>
            <p className="text-white/70">Our registrar team is ready to answer your questions.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            <a href="tel:021234567" className="flex items-center gap-3 hover:text-[#EDCD1F] transition-colors">
              <Phone size={24} className="text-[#EDCD1F]" />
              <span className="font-bold">(02) 123-4567</span>
            </a>
            <a href="mailto:registrar@mmpns.edu.ph" className="flex items-center gap-3 hover:text-[#EDCD1F] transition-colors">
              <Mail size={24} className="text-[#EDCD1F]" />
              <span className="font-bold">registrar@mmpns.edu.ph</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
