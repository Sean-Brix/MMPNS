import React from 'react';
import { SchoolMap } from '../../components/SchoolMap';
import { ContactHeader } from './ContactHeader';
import { ContactInfo } from './ContactInfo';
import { ContactForm } from './ContactForm';

export const Contact: React.FC = () => {
  return (
    <div className="bg-white">
      <ContactHeader />
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <ContactInfo />
            <ContactForm />
          </div>
        </div>
      </section>
      <section className="relative overflow-hidden">
        <SchoolMap height="450px" showInfoCard={true} />
      </section>
    </div>
  );
};

export default Contact;
