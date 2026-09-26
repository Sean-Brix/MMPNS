import React, { useState } from 'react';
import { BookOpen, Image as ImageIcon } from 'lucide-react';
import { DashboardSidebar, DashboardHeader } from '../../components/AdminLayout';
import { OverviewPage } from './OverviewPage';
import { NewsManagement } from './NewsManagement';
import { FacultyManagement } from './FacultyManagement';
import { InquiriesPage } from './InquiriesPage';
import { useAppNavigate } from '../../hooks/useAppNavigate';

export const AdminDashboard: React.FC = () => {
  const goTo = useAppNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewPage />;
      case 'news': return <NewsManagement />;
      case 'faculty': return <FacultyManagement />;
      case 'inquiries': return <InquiriesPage />;
      case 'academics':
        return (
          <div className="flex items-center justify-center h-[400px] bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="text-center">
              <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
              <h4 className="font-bold text-gray-400">Curriculum Editor</h4>
              <p className="text-sm text-gray-300">Curriculum management module coming soon</p>
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div className="flex items-center justify-center h-[400px] bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="text-center">
              <ImageIcon size={48} className="mx-auto text-gray-200 mb-4" />
              <h4 className="font-bold text-gray-400">Media Library</h4>
              <p className="text-sm text-gray-300">Photo gallery management module coming soon</p>
            </div>
          </div>
        );
      default: return <OverviewPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <DashboardSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => goTo('home')}
        onGoHome={() => goTo('home')}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader title={activeTab.replace('-', ' ')} />
        
        <main className="p-10 max-w-[1600px] w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;