import React from 'react';

export const ContactHeader: React.FC = () => {
  return (
    <section className="bg-[#185C20] py-20 text-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p className="text-white/70 max-w-2xl mx-auto text-lg">
          We'd love to hear from you. Reach out for any inquiries or feedback.
        </p>
      </div>
    </section>
  );
};
