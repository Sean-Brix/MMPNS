import React from 'react';
import { motion } from 'motion/react';
import { FileText, Download, BookOpen, Clipboard, UserCheck, FileSignature, Calendar, CreditCard } from 'lucide-react';

interface FormCategory {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  forms: Array<{
    name: string;
    description: string;
    size: string;
    updated: string;
  }>;
}

export const DownloadableForms: React.FC = () => {
  const formCategories: FormCategory[] = [
    {
      title: 'Admission & Enrollment',
      icon: UserCheck,
      forms: [
        { name: 'Admission Application Form', description: 'For new students applying to MMPNS', size: '245 KB', updated: 'Jan 2026' },
        { name: 'Enrollment Form', description: 'Annual enrollment form for returning students', size: '198 KB', updated: 'Feb 2026' },
        { name: 'Transcript Request Form', description: 'Request official academic transcripts', size: '156 KB', updated: 'Jan 2026' },
      ],
    },
    {
      title: 'Academic Forms',
      icon: BookOpen,
      forms: [
        { name: 'Leave of Absence Form', description: 'Request temporary leave from studies', size: '134 KB', updated: 'Jan 2026' },
        { name: 'Subject Change Request', description: 'Request to change or drop subjects', size: '142 KB', updated: 'Jan 2026' },
        { name: 'Grade Inquiry Form', description: 'Inquire about grades and academic records', size: '128 KB', updated: 'Dec 2025' },
      ],
    },
    {
      title: 'Financial Forms',
      icon: CreditCard,
      forms: [
        { name: 'Payment Plan Request', description: 'Apply for installment payment plan', size: '186 KB', updated: 'Jan 2026' },
        { name: 'Scholarship Application', description: 'Apply for academic or need-based scholarship', size: '267 KB', updated: 'Feb 2026' },
        { name: 'Financial Assistance Form', description: 'Request financial aid or assistance', size: '212 KB', updated: 'Jan 2026' },
      ],
    },
    {
      title: 'School Documents',
      icon: FileSignature,
      forms: [
        { name: 'Medical Certificate Form', description: 'School medical certification requirements', size: '178 KB', updated: 'Jan 2026' },
        { name: 'Parental Consent Form', description: 'For field trips and special activities', size: '145 KB', updated: 'Feb 2026' },
        { name: 'Student Information Sheet', description: 'Annual student information update', size: '234 KB', updated: 'Jan 2026' },
      ],
    },
  ];

  const handleDownload = (formName: string) => {
    // In production, this would trigger actual file download
    console.log(`Downloading: ${formName}`);
    alert(`Download started for: ${formName}\n\nNote: This is a demo. In production, this would download the actual PDF form.`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-[#185C20] rounded-3xl flex items-center justify-center shadow-xl">
            <FileText size={40} className="text-[#EDCD1F]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#185C20] mb-4">
            Downloadable Forms
          </h1>
          <p className="text-lg text-[#185C20]/60 max-w-2xl mx-auto">
            Access all official school forms and documents. Download, fill out, and submit as needed.
          </p>
        </motion.div>

        {/* Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#EDCD1F]/10 border border-[#EDCD1F]/30 rounded-2xl p-6 mb-12"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-[#EDCD1F] rounded-xl flex items-center justify-center">
              <Clipboard size={20} className="text-[#185C20]" />
            </div>
            <div>
              <h3 className="font-bold text-[#185C20] mb-2">Important Notes</h3>
              <ul className="text-sm text-[#185C20]/70 space-y-1">
                <li>• All forms are in PDF format and require Adobe Reader or compatible software</li>
                <li>• Please print forms clearly and complete all required fields</li>
                <li>• Submit completed forms to the Registrar's Office or designated department</li>
                <li>• For assistance, contact the school office at (02) 8821-1234</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Form Categories */}
        <div className="space-y-8">
          {formCategories.map((category, catIdx) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={catIdx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + catIdx * 0.1 }}
                className="bg-white rounded-2xl border border-[#185C20]/10 overflow-hidden shadow-sm"
              >
                {/* Category Header */}
                <div className="bg-[#185C20]/5 px-6 py-4 border-b border-[#185C20]/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#185C20] rounded-xl flex items-center justify-center">
                      <Icon size={20} className="text-[#EDCD1F]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#185C20]">{category.title}</h2>
                  </div>
                </div>

                {/* Forms List */}
                <div className="divide-y divide-[#185C20]/5">
                  {category.forms.map((form, formIdx) => (
                    <div
                      key={formIdx}
                      className="p-6 hover:bg-[#185C20]/[0.02] transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-[#185C20] mb-1">{form.name}</h3>
                          <p className="text-sm text-[#185C20]/60 mb-2">{form.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-[#185C20]/40">
                            <span className="flex items-center gap-1">
                              <FileText size={12} />
                              PDF • {form.size}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Updated {form.updated}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(form.name)}
                          className="flex items-center gap-2 px-6 py-3 bg-[#185C20] text-white rounded-xl font-bold hover:bg-[#185C20]/90 transition-colors whitespace-nowrap"
                        >
                          <Download size={18} />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-[#185C20] rounded-2xl p-8 text-white"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Need Help?</h2>
            <p className="text-white/80 mb-6">
              Can't find the form you're looking for or need assistance with submission?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="tel:028821-1234"
                className="px-6 py-3 bg-white text-[#185C20] rounded-xl font-bold hover:bg-white/90 transition-colors"
              >
                Call (02) 8821-1234
              </a>
              <a
                href="mailto:mmpns.official@gmail.com"
                className="px-6 py-3 bg-[#EDCD1F] text-[#185C20] rounded-xl font-bold hover:bg-[#EDCD1F]/90 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
