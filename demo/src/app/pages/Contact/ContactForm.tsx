import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="lg:col-span-2">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <h3 className="text-2xl font-bold mb-8">Send an Inquiry</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</label>
            <input 
              type="text" 
              required
              className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
              placeholder="Admission Inquiry"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message</label>
            <textarea 
              required
              rows={6}
              className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20 resize-none"
              placeholder="How can we help you?"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            />
          </div>
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitted}>
            {isSubmitted ? 'Message Sent!' : (
              <span className="flex items-center gap-2">
                Send Message <Send size={18} />
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
