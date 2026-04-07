import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown } from 'lucide-react';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:text-[#185C20] transition-colors"
      >
        <span className="font-bold text-lg">{question}</span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#EDCD1F]' : 'text-gray-300'}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-gray-600 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AdmissionsFAQ: React.FC = () => {
  const faqs = [
    { question: 'When does the enrollment start?', answer: 'Enrollment typically begins in March for the succeeding academic year. We also accept late enrollees and mid-year transfers depending on slot availability.' },
    { question: 'Are there scholarship programs available?', answer: 'Yes, MMPNS participates in the PEAC/ESC Program which provides tuition subsidies for qualified Junior High School students. We also offer academic scholarships for Honor Students.' },
    { question: 'What are the school hours?', answer: 'Preschool classes usually run from 8:00 AM to 11:30 AM. Elementary and Junior High classes start at 7:30 AM and end between 3:00 PM and 4:30 PM depending on the grade level.' },
    { question: 'Do you offer a shuttle service?', answer: 'While the school does not directly operate shuttle services, we can recommend accredited independent transport providers who serve Multinational Village and nearby areas.' },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-12">
          <HelpCircle className="text-[#185C20]" size={32} />
          <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          {faqs.map((faq, idx) => (
            <FAQItem key={idx} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};
