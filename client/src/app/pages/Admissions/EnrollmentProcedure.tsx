import React from 'react';

export const EnrollmentProcedure: React.FC = () => {
  const steps = [
    { title: 'Inquire', desc: 'Contact the Registrar or visit the school for initial information and slot availability.' },
    { title: 'Assessment', desc: 'Schedule and take the entrance examination/assessment appropriate for the grade level.' },
    { title: 'Interview', desc: 'A short interview with the Guidance Counselor or Principal with the parents/guardians.' },
    { title: 'Requirements', desc: 'Submit all necessary documents including PSA birth certificate, Form 138, and certificates.' },
    { title: 'Payment', desc: 'Settle the registration and tuition fees at the Finance Office or through bank transfer.' },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-[#185C20]">Enrollment Procedure</h2>
          <p className="text-gray-500">A simple step-by-step guide to joining our school.</p>
        </div>
        
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 hidden lg:block -z-10"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-white text-center">
                <div className="w-12 h-12 bg-[#185C20] text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold shadow-lg shadow-[#185C20]/20 relative z-10">
                  {idx + 1}
                </div>
                <h4 className="font-bold mb-2">{step.title}</h4>
                <p className="text-xs text-gray-500 px-4">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
