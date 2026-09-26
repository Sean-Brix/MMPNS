import React from 'react';

export const AdmissionsHeader: React.FC = () => {
  return (
    <section className="bg-[#185C20] py-20 text-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Admissions</h1>
        <p className="text-white/70 max-w-2xl mx-auto text-lg">
          Start your journey with us. Join the MMPNS family today.
        </p>
      </div>
    </section>
  );
};
