import React from 'react';
import { Heart, Award, MessageSquare, HandHeart, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AlumniGiving: React.FC = () => {
  return (
    <section className="py-20 md:py-32 bg-[#FAF9F6] border-t border-[#185C20]/5">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16 md:gap-20">
          <div className="lg:w-1/2 space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-[#EDCD1F] rounded-full flex items-center justify-center text-[#185C20] shadow-xl mx-auto lg:mx-0">
              <Heart className="w-8 md:w-10 h-8 md:h-10 fill-current" />
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#185C20]">Leave a Legacy of <span className="text-[#EDCD1F]">Faith</span></h2>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Your support ensures that the next generation of students can experience the same quality Catholic education that shaped you. Every gift, whether big or small, contributes to the school's mission.
            </p>
            
            <div className="space-y-3 md:space-y-4 max-w-sm mx-auto lg:mx-0">
              {[
                { icon: Award, text: 'Scholarship Endowments' },
                { icon: MessageSquare, text: 'Mentorship Programs' },
                { icon: HandHeart, text: 'Missionary Support' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-[#185C20] font-bold text-sm md:text-base">
                  <div className="w-8 md:w-10 h-8 md:h-10 shrink-0 rounded-lg bg-[#185C20]/5 flex items-center justify-center">
                    <item.icon size={16} className="md:w-[18px] md:h-[18px]" />
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-xl md:shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-[#EDCD1F]/10 rounded-bl-full" />
              <h4 className="text-2xl font-serif font-bold text-[#185C20] mb-6">Alumni Relations</h4>
              <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
                <div className="p-4 md:p-6 bg-[#FAF9F6] rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-9 md:w-10 h-9 md:h-10 shrink-0 bg-[#EDCD1F] text-[#185C20] rounded-full flex items-center justify-center shadow-sm text-xs font-bold">MP</div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-[#185C20] text-sm md:text-base truncate">Mrs. Minerva P. Masa</div>
                      <div className="text-[10px] md:text-xs text-gray-500 italic">Alumni Coordinator</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200/60" />
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-9 md:w-10 h-9 md:h-10 shrink-0 bg-[#EDCD1F] text-[#185C20] rounded-full flex items-center justify-center shadow-sm text-xs font-bold">HE</div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-[#185C20] text-sm md:text-base truncate">Mr. Harvey B. Ebon</div>
                      <div className="text-[10px] md:text-xs text-gray-500 italic">Alumni Coordinator</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-[#FAF9F6] rounded-2xl flex items-center gap-4 md:gap-6">
                  <div className="w-12 md:w-14 h-12 md:h-14 shrink-0 bg-[#EDCD1F] text-[#185C20] rounded-full flex items-center justify-center shadow-md">
                    <Phone size={20} className="md:w-6 md:h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-[#185C20] text-sm md:text-base truncate">(02) 888-0000 ext. 123</div>
                    <div className="text-[10px] md:text-sm text-gray-500 italic">alumni@mmpns.edu.ph</div>
                  </div>
                </div>
              </div>
              <Button size="lg" className="w-full bg-[#185C20] hover:bg-[#185C20]/90 text-white rounded-xl h-12 md:h-14">
                Request Donation Packet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
