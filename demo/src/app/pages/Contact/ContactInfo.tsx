import React from 'react';
import { MapPin, Phone, Mail, Facebook, MessageCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SCHOOL_INFO } from '../../seo/siteMeta';

export const ContactInfo: React.FC = () => {
  const contactInfo = [
    { icon: <MapPin />, title: 'Visit Us', text: SCHOOL_INFO.address.full },
    { icon: <Phone />, title: 'Call Us', text: SCHOOL_INFO.phoneDisplay },
    { icon: <Mail />, title: 'Email Us', text: SCHOOL_INFO.email },
    { icon: <Facebook />, title: 'Social Media', text: SCHOOL_INFO.facebookHandle },
  ];

  return (
    <div className="lg:col-span-1 space-y-10">
      <h2 className="text-3xl font-bold text-[#185C20]">Get in Touch</h2>
      <div className="space-y-8">
        {contactInfo.map((info, i) => (
          <div key={i} className="flex gap-5">
            <div className="shrink-0 w-12 h-12 bg-[#EDCD1F]/10 text-[#185C20] rounded-2xl flex items-center justify-center">
              {React.cloneElement(info.icon as React.ReactElement, { size: 24 })}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">{info.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{info.text}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-8 bg-[#185C20] rounded-3xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="text-[#EDCD1F]" />
          <h4 className="font-bold">Chat with us on Messenger</h4>
        </div>
        <p className="text-xs text-white/70 mb-6 leading-relaxed">
          For quick responses, you can also message us directly on our Facebook page.
        </p>
        <Button variant="secondary" className="w-full text-xs" onClick={() => window.open(SCHOOL_INFO.facebookUrl, '_blank', 'noopener,noreferrer')}>
          Open Messenger
        </Button>
      </div>
    </div>
  );
};
