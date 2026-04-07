import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { readDatabase, writeDatabase } from '../../../utils/database';

interface Props {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SettingsManager: React.FC<Props> = ({ onExport, onImport, onReset, showNotification }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const settingsData = readDatabase('settings');
    if (settingsData) setData(settingsData);
  }, []);

  const handleSave = () => {
    if (writeDatabase('settings', data)) {
      showNotification('success', 'Settings saved successfully');
    } else {
      showNotification('error', 'Failed to save settings');
    }
  };

  const updateSiteField = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      site: { ...prev.site, [field]: value }
    }));
  };

  const updateFacebookField = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      facebook: { ...prev.facebook, [field]: value }
    }));
  };

  const updateEnrollmentField = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      enrollment: { ...prev.enrollment, [field]: value }
    }));
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#185C20]">Site Settings</h2>
          <p className="text-sm text-[#185C20]/50 mt-1">Configure global site settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="px-4 py-2 bg-white border border-[#185C20]/10 text-[#185C20] rounded-lg text-xs font-bold hover:bg-[#185C20]/5 cursor-pointer">Export</button>
          <button onClick={onImport} className="px-4 py-2 bg-white border border-[#185C20]/10 text-[#185C20] rounded-lg text-xs font-bold hover:bg-[#185C20]/5 cursor-pointer">Import</button>
          <button onClick={onReset} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 cursor-pointer">Reset</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-[#185C20] text-white rounded-lg text-xs font-bold hover:bg-[#185C20]/90 cursor-pointer"><Save size={14} />Save All</button>
        </div>
      </div>

      <div className="space-y-6">
        {/* School Info */}
        <div className="bg-white rounded-xl border border-[#185C20]/10 p-6">
          <h3 className="text-lg font-bold text-[#185C20] mb-4">School Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">School Name</label><input type="text" value={data.site.schoolName} onChange={(e) => updateSiteField('schoolName', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
            <div><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Short Name</label><input type="text" value={data.site.shortName} onChange={(e) => updateSiteField('shortName', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Tagline</label><input type="text" value={data.site.tagline} onChange={(e) => updateSiteField('tagline', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
            <div><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Founded Year</label><input type="text" value={data.site.foundedYear} onChange={(e) => updateSiteField('foundedYear', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
          </div>
        </div>

        {/* Facebook Integration */}
        <div className="bg-white rounded-xl border border-[#185C20]/10 p-6">
          <h3 className="text-lg font-bold text-[#185C20] mb-4">Facebook Integration</h3>
          <div className="space-y-4">
            <div><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Page ID</label><input type="text" value={data.facebook.pageId} onChange={(e) => updateFacebookField('pageId', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
            <div><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Access Token</label><input type="password" value={data.facebook.accessToken} onChange={(e) => updateFacebookField('accessToken', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
          </div>
        </div>

        {/* Enrollment Settings */}
        <div className="bg-white rounded-xl border border-[#185C20]/10 p-6">
          <h3 className="text-lg font-bold text-[#185C20] mb-4">Enrollment Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={data.enrollment.isOpen} onChange={(e) => updateEnrollmentField('isOpen', e.target.checked)} className="w-4 h-4 text-[#185C20] cursor-pointer" />
              <label className="text-sm font-bold text-[#185C20]">Enrollment is Open</label>
            </div>
            <div><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">School Year</label><input type="text" value={data.enrollment.schoolYear} onChange={(e) => updateEnrollmentField('schoolYear', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Deadline Date</label><input type="date" value={data.enrollment.deadlineDate} onChange={(e) => updateEnrollmentField('deadlineDate', e.target.value)} className="w-full px-3 py-2 border border-[#185C20]/10 rounded-lg text-sm focus:ring-2 focus:ring-[#EDCD1F]/30" /></div>
          </div>
        </div>
      </div>
    </div>
  );
};
