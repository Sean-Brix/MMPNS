import React from 'react';
import { Shield, Mail, Phone, MapPin, Facebook, ArrowLeft, FileText, Eye, Database, Trash2, Lock, Users, Globe, CalendarDays } from 'lucide-react';
import { useAppNavigate } from '../../hooks/useAppNavigate';

export const PrivacyPolicy: React.FC = () => {
  const goTo = useAppNavigate();
  const effectiveDate = 'February 27, 2026';
  const lastUpdated = 'February 27, 2026';

  const sections = [
    {
      icon: <Eye size={20} />,
      title: '1. Information We Collect',
      content: (
        <div className="space-y-4">
          <p>When you interact with the Madre Maria Pia Notari School website and our Facebook-integrated News & Updates feed, we may collect the following types of information:</p>
          <div className="space-y-3">
            <div className="bg-[#185C20]/5 rounded-xl p-4 border border-[#185C20]/10">
              <h4 className="font-bold text-[#185C20] mb-2">a. Publicly Available Facebook Data</h4>
              <p className="text-sm text-gray-600">Our News & Updates page displays publicly available posts from the official MMPNS Facebook Page using the Facebook Graph API. This includes post text, images, timestamps, and engagement counts (likes, comments, shares) that are already publicly visible on our Facebook Page.</p>
            </div>
            <div className="bg-[#185C20]/5 rounded-xl p-4 border border-[#185C20]/10">
              <h4 className="font-bold text-[#185C20] mb-2">b. Automatically Collected Data</h4>
              <p className="text-sm text-gray-600">We may collect standard web analytics data such as browser type, device information, IP address, pages visited, and referring URLs through standard web technologies. This data is used solely for improving the website experience.</p>
            </div>
            <div className="bg-[#185C20]/5 rounded-xl p-4 border border-[#185C20]/10">
              <h4 className="font-bold text-[#185C20] mb-2">c. Local Storage / Caching</h4>
              <p className="text-sm text-gray-600">Our website uses your browser's local storage to cache Facebook feed data temporarily. This improves loading performance and provides offline access to previously loaded content. This data remains on your device and is not transmitted to any server.</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 italic">We do not collect personal information such as names, email addresses, or any private Facebook user data through our Facebook integration.</p>
        </div>
      ),
    },
    {
      icon: <Database size={20} />,
      title: '2. How We Use Information',
      content: (
        <div className="space-y-3">
          <p>The information accessed through the Facebook Graph API is used exclusively to:</p>
          <ul className="space-y-2 ml-4">
            {[
              'Display the latest public posts from the official MMPNS Facebook Page on our News & Updates section',
              'Provide school community members with convenient, centralized access to school announcements and updates',
              'Cache content locally on your device for improved performance and offline availability',
              'Monitor and improve website functionality and user experience',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EDCD1F] mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4">We do <strong>not</strong> use any collected data for advertising, marketing to third parties, selling data, or profiling individual users.</p>
        </div>
      ),
    },
    {
      icon: <Users size={20} />,
      title: '3. Data Sharing and Disclosure',
      content: (
        <div className="space-y-3">
          <p>Madre Maria Pia Notari School does not sell, rent, trade, or otherwise share your personal information with third parties, except in the following limited circumstances:</p>
          <ul className="space-y-2 ml-4">
            {[
              'When required by law, regulation, legal process, or governmental request',
              'To protect the rights, property, or safety of MMPNS, our students, staff, or visitors',
              'With service providers who assist in operating our website, subject to confidentiality obligations',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EDCD1F] mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      icon: <Globe size={20} />,
      title: '4. Facebook Platform Data',
      content: (
        <div className="space-y-3">
          <p>Our use of the Facebook Graph API is governed by:</p>
          <ul className="space-y-2 ml-4">
            {[
              <span key="fb-tos"><a href="https://www.facebook.com/terms.php" target="_blank" rel="noopener noreferrer" className="text-[#185C20] underline hover:text-[#185C20]/80">Facebook Terms of Service</a></span>,
              <span key="fb-dev">Facebook Platform Terms and Developer Policies</span>,
              <span key="fb-privacy"><a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" className="text-[#185C20] underline hover:text-[#185C20]/80">Meta Privacy Policy</a></span>,
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EDCD1F] mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3">We only access publicly available Page data (public posts, photos, and engagement metrics). We do not request access to private user profiles, friend lists, or any non-public Facebook data.</p>
        </div>
      ),
    },
    {
      icon: <Trash2 size={20} />,
      title: '5. Data Retention and Deletion',
      content: (
        <div className="space-y-3">
          <p>Cached Facebook feed data stored in your browser's local storage is retained until:</p>
          <ul className="space-y-2 ml-4">
            {[
              'It is automatically refreshed with newer content from our Facebook Page',
              'You manually clear your browser\'s local storage or site data',
              'The cache expiration period is reached (typically 24 hours)',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EDCD1F] mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-bold text-amber-800 mb-1 text-sm">How to Delete Your Data</h4>
            <p className="text-sm text-amber-700">To remove all cached data from our website, clear your browser's local storage for this site. In most browsers: Settings &rarr; Privacy &rarr; Clear Site Data. You may also contact us directly to request data deletion.</p>
          </div>
        </div>
      ),
    },
    {
      icon: <Lock size={20} />,
      title: '6. Data Security',
      content: (
        <p>We implement reasonable technical and organizational measures to protect data accessed through our website. All data transmitted between your browser and Facebook's API servers is encrypted using HTTPS/TLS protocols. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
      ),
    },
    {
      icon: <Users size={20} />,
      title: '7. Children\'s Privacy',
      content: (
        <div className="space-y-3">
          <p>As an educational institution serving minors, we are especially committed to protecting children's privacy. Our website and Facebook feed integration:</p>
          <ul className="space-y-2 ml-4">
            {[
              'Does not knowingly collect personal information from children',
              'Does not require user accounts or login for viewing the News & Updates feed',
              'Only displays publicly posted school content approved by the MMPNS administration',
              'Complies with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173)',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EDCD1F] mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      icon: <FileText size={20} />,
      title: '8. Your Rights',
      content: (
        <div className="space-y-3">
          <p>Under the Philippine Data Privacy Act of 2012, you have the right to:</p>
          <ul className="space-y-2 ml-4">
            {[
              'Be informed about how your data is collected and used',
              'Access your personal data held by the school',
              'Object to the processing of your personal data',
              'Request correction of inaccurate personal data',
              'Request erasure or blocking of your personal data',
              'Lodge a complaint with the National Privacy Commission',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#EDCD1F] mt-2"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      icon: <CalendarDays size={20} />,
      title: '9. Changes to This Policy',
      content: (
        <p>We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy periodically. Continued use of our website after changes constitutes acceptance of the updated policy.</p>
      ),
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-[#185C20] py-16 md:py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+PC9zdmc+')] opacity-50"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          {goTo && (
            <button
              onClick={() => goTo('news')}
              className="inline-flex items-center gap-2 text-white/60 hover:text-[#EDCD1F] transition-colors mb-8 text-sm"
            >
              <ArrowLeft size={16} />
              Back to News & Updates
            </button>
          )}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
            <Shield size={32} className="text-[#EDCD1F]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-white/60 max-w-2xl mx-auto text-base md:text-lg">
            Madre Maria Pia Notari School is committed to protecting your privacy and ensuring the responsible use of data accessed through our website and Facebook integration.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-8 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-[#EDCD1F]" />
              Effective: {effectiveDate}
            </span>
            <span className="hidden md:inline opacity-30">|</span>
            <span className="flex items-center gap-1.5">
              <FileText size={14} className="text-[#EDCD1F]" />
              Last Updated: {lastUpdated}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <p className="text-gray-600 leading-relaxed">
              This Privacy Policy describes how Madre Maria Pia Notari School ("MMPNS," "we," "us," or "our") collects, uses, and protects information when you visit our website, particularly in relation to our News & Updates section which integrates with the Facebook Graph API to display our school's public Facebook Page content.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              By using our website, you consent to the practices described in this Privacy Policy. If you do not agree with this policy, please discontinue use of our website.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0 w-10 h-10 bg-[#185C20]/10 rounded-xl flex items-center justify-center text-[#185C20]">
                    {section.icon}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 pt-1.5">{section.title}</h2>
                </div>
                <div className="text-gray-600 leading-relaxed ml-0 md:ml-14">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-10 bg-[#185C20] rounded-2xl p-6 md:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#EDCD1F]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl font-bold mb-2">10. Contact Us</h2>
              <p className="text-white/70 mb-8 max-w-xl">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-5 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Email</p>
                    <p className="text-sm text-white/80">mmpns.official@gmail.com</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-5 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Phone</p>
                    <p className="text-sm text-white/80">(02) 8821-1234 / 8821-5678</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-5 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Address</p>
                    <p className="text-sm text-white/80">#70 Timothy St., Multinational Village, Parañaque City, PH 1708</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-5 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#EDCD1F]">
                    <Facebook size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Facebook</p>
                    <p className="text-sm text-white/80">Madre Maria Pia Notari School</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Protection Officer */}
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="font-bold text-gray-900 mb-2">Data Protection Officer</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              For data privacy concerns, you may reach our Data Protection Officer at <strong>mmpns.official@gmail.com</strong> with the subject line "Data Privacy Concern." We will respond to your inquiry within 30 days.
            </p>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              This Privacy Policy is compliant with the Philippine Data Privacy Act of 2012 (R.A. 10173) and Meta Platform Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;