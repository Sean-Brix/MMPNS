import React from 'react';
import { ImagePlus, QrCode } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ALUMNI_IMAGE_DEFAULTS } from '../../../utils/alumniImageSlots';

interface AlumniHubProps {
  registrationQr: string;
  isImageEditMode?: boolean;
  onEditQr?: () => void;
}

export const AlumniHub: React.FC<AlumniHubProps> = ({
  registrationQr,
  isImageEditMode = false,
  onEditQr,
}) => {
  return (
    <section className="relative py-16 md:py-32 z-30 -mt-10 md:-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(24,92,32,0.1)] md:shadow-[0_50px_100px_-20px_rgba(24,92,32,0.15)] overflow-hidden border border-[#185C20]/5">
            <div className="h-2 md:h-4 bg-gradient-to-r from-[#185C20] via-[#EDCD1F] to-[#185C20]"></div>
            
            <div className="p-8 md:p-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
                <div className="space-y-8 md:space-y-10">
                  <div>
                    <h2 className="text-[10px] md:text-xs font-bold text-[#185C20] uppercase tracking-[0.4em] md:tracking-[0.5em] mb-4 md:mb-6 flex items-center gap-3 md:gap-4">
                      <div className="w-8 md:w-12 h-px bg-[#185C20]" />
                      Alumni Office
                    </h2>
                    <h3 className="text-3xl md:text-5xl font-bold text-[#185C20] font-serif leading-[1.2] md:leading-[1.1]">
                      Guiding the Next <span className="text-[#EDCD1F]">Chapter</span> of Our Story
                    </h3>
                  </div>

                  <div className="space-y-8 md:space-y-12">
                    <div className="relative pl-6 md:pl-8 border-l-2 border-[#EDCD1F]">
                      <div className="absolute top-0 -left-[5px] md:-left-1.5 w-2 md:w-3 h-2 md:h-3 bg-[#EDCD1F] rounded-full" />
                      <h4 className="text-[10px] md:text-sm font-bold text-[#185C20] uppercase tracking-widest mb-2 md:mb-3">Our Vision</h4>
                      <p className="text-base md:text-lg text-gray-700 leading-relaxed font-serif italic">
                        "To build a strong and lifelong community of alumni who remain connected to the school, 
                        embody its values, and actively support the growth and formation of future generations."
                      </p>
                    </div>

                    <div className="relative pl-6 md:pl-8 border-l-2 border-[#185C20]/20">
                      <h4 className="text-[10px] md:text-sm font-bold text-[#185C20] uppercase tracking-widest mb-2 md:mb-3 opacity-50">Our Mission</h4>
                      <p className="text-sm md:text-gray-600 leading-relaxed">
                        The Alumni Office fosters lasting relationships with graduates by promoting engagement, 
                        communication, and collaboration, encouraging alumni to participate in school initiatives 
                        while supporting the school’s commitment to holistic development.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-2 md:-inset-4 bg-[#EDCD1F]/10 rounded-[2rem] md:rounded-[3rem] -rotate-2 md:-rotate-3 z-0" />
                  <div className="relative z-10 bg-[#185C20] rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-white shadow-2xl">
                    <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">
                      <div className="p-4 md:p-6 bg-white rounded-2xl md:rounded-[2rem] shadow-inner">
                        <div className="w-32 md:w-40 h-32 md:h-40 flex items-center justify-center overflow-hidden">
                          <ImageWithFallback
                            src={registrationQr}
                            fallbackSrc={ALUMNI_IMAGE_DEFAULTS.registrationQr}
                            alt="Register QR"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="mt-3 md:mt-4 flex items-center justify-center gap-2 text-[#185C20] font-bold text-[9px] md:text-[10px] tracking-widest">
                          <QrCode size={12} className="md:w-3.5 md:h-3.5" />
                          <span>SCAN TO REGISTER</span>
                        </div>

                        {isImageEditMode && (
                          <button
                            type="button"
                            onClick={onEditQr}
                            className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/70 text-white text-[11px] font-bold hover:bg-black/85 transition-colors"
                          >
                            <ImagePlus size={12} />
                            Edit QR
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3 md:space-y-4">
                        <h4 className="text-xl md:text-2xl font-serif font-bold">Join the Registry</h4>
                        <p className="text-white/60 text-xs md:text-sm leading-relaxed max-w-xs mx-auto">
                          Reignite your bond with the MMPNS community. Register to stay connected with your batchmates and the institution.
                        </p>
                      </div>

                      <div className="w-full space-y-3">
                        <a 
                          href="https://docs.google.com/forms/d/e/1FAIpQLSf88R9xfkEpnABZA_rk2CJSKlyB1HsfiMztcCnGUsa2_mFuiQ/viewform" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button size="lg" className="w-full bg-[#EDCD1F] text-[#185C20] hover:bg-[#EDCD1F]/90 font-bold h-12 md:h-14 rounded-xl border-none">
                            Online Registration
                          </Button>
                        </a>
                        <Button variant="outline" size="lg" className="w-full border-white/20 bg-white text-black hover:bg-white/90 hover:text-black h-12 md:h-14 rounded-xl">
                          Join Facebook Group
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
