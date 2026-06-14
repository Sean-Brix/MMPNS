import React from 'react';
import { Facebook, Mail, Phone, MapPin, ExternalLink, Heart, Shield, Award, GraduationCap, ChevronRight } from 'lucide-react';
import { useAppNavigate } from '../hooks/useAppNavigate';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { SITE_IMAGE_DEFAULTS, readSiteImageSlots } from '../../utils/siteImageSlots';

export const Footer: React.FC = () => {
  const goTo = useAppNavigate();
  const logo = readSiteImageSlots().brandLogo;

  return (
    <footer className="bg-[#185C20] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Subtle decorative motif */}
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#EDCD1F]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          {/* School Identity */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src={logo}
                fallbackSrc={SITE_IMAGE_DEFAULTS.brandLogo}
                alt="MMPNS Logo"
                className="h-20 w-20 brightness-0 invert"
              />
              <div>
                <h2 className="font-serif font-bold text-3xl leading-none">MMPNS</h2>
                <p className="text-[10px] text-[#EDCD1F] font-sans font-bold uppercase tracking-[0.2em] mt-2">Est. 1988</p>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed font-serif italic">
              "Developing Global Leaders Rooted in Eucharistic Faith and Academic Rigor."
            </p>
            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Under the care of:</p>
              <p className="text-xs font-bold text-[#EDCD1F]">Sisters Adorers of the Holy Eucharist</p>
            </div>
          </div>

          {/* Institutional Links */}
          <div>
            <h3 className="font-serif font-bold text-xl mb-8 border-b border-[#EDCD1F]/30 pb-4">Institutional</h3>
            <ul className="space-y-4">
              {[
                { name: 'Our Heritage', id: 'about' },
                { name: 'Curriculum', id: 'academics' },
                { name: 'Admissions', id: 'admissions' },
                { name: 'Student Life', id: 'student-life' },
                { name: 'Latest News', id: 'news' },
                { name: 'Alumni Network', id: 'alumni' }
              ].map((link) => (
                <li key={link.id}>
                  <button 
                    onClick={() => goTo(link.id)}
                    className="text-white/60 hover:text-[#EDCD1F] transition-colors flex items-center gap-2 text-sm group"
                  >
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="font-serif font-bold text-xl mb-8 border-b border-[#EDCD1F]/30 pb-4">Get in Touch</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                  <MapPin size={18} />
                </div>
                <span className="text-white/60 text-sm leading-relaxed">
                  #70 Timothy St., Multinational Village, Parañaque City, PH 1708
                </span>
              </li>
              <li className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                  <Phone size={18} />
                </div>
                <span className="text-white/60 text-sm font-medium">(02) 8821-1234 / 8821-5678</span>
              </li>
              <li className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                  <Mail size={18} />
                </div>
                <span className="text-white/60 text-sm font-medium">mmpns.official@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Accreditation & Community */}
          <div>
            <h3 className="font-serif font-bold text-xl mb-8 border-b border-[#EDCD1F]/30 pb-4">Recognition</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <Shield size={24} className="text-[#EDCD1F] mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">PEAC</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <Award size={24} className="text-[#EDCD1F] mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">ESC</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <GraduationCap size={24} className="text-[#EDCD1F] mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">MATATAG</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center text-center group hover:bg-white/10 transition-colors">
                <Heart size={24} className="text-[#EDCD1F] mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">CHARISM</span>
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <a href="#" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#EDCD1F] hover:text-[#185C20] transition-all">
                <Facebook size={20} />
              </a>
              <a href="mailto:info@mmpns.edu.ph" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#EDCD1F] hover:text-[#185C20] transition-all">
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Closing Bar */}
        <div className="pt-8 sm:pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-6 text-center md:text-left">
          <div className="text-xs sm:text-[13px] text-white/50 font-medium tracking-wide leading-relaxed max-w-2xl">
            <span className="block sm:inline mb-1 sm:mb-0">&copy; {new Date().getFullYear()} Madre Maria Pia Notari School. All Rights Reserved.</span>
            <span className="hidden sm:inline mx-3 opacity-30">|</span> 
            <span className="block sm:inline opacity-80">A Catholic School under the Sisters Adorers of the Holy Eucharist.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em]">
            <button onClick={() => goTo('privacy-policy')} className="text-white/40 hover:text-[#EDCD1F] transition-colors">Privacy</button>
            <a href="#" className="text-white/40 hover:text-[#EDCD1F] transition-colors">Transparency</a>
            <button onClick={() => goTo('admin')} className="text-white/40 hover:text-[#EDCD1F] transition-colors cursor-pointer">Staff Access</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
