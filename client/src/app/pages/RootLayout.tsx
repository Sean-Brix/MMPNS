import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { motion } from 'motion/react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ImagePlus } from 'lucide-react';
import { getTeacherSession } from '../../utils/auth';
import { HOME_IMAGE_EDIT_MODE_KEY } from '../../utils/homeImageSlots';
import { initializeDatabase } from '../../utils/database';

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  const isPortal = location.pathname === '/teacher-portal' || location.pathname === '/student-portal';
  const [isSiteImageEditMode, setIsSiteImageEditMode] = useState(false);
  const hasLocalImageEditorPanel = [
    '/',
    '/alumni',
    '/about',
    '/academics',
    '/student-life',
  ].includes(location.pathname);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    void initializeDatabase();
  }, []);

  useEffect(() => {
    const isPrincipal = getTeacherSession()?.position === 'Principal';
    const toggleEnabled = localStorage.getItem(HOME_IMAGE_EDIT_MODE_KEY) === 'true';
    setIsSiteImageEditMode(isPrincipal && toggleEnabled);
  }, [location.pathname]);

  return (
    <>
      <Toaster position="top-center" expand={true} richColors />
      <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-[#EDCD1F] selection:text-[#185C20]">
        {!isAdmin && !isPortal && <Header />}
        {!isAdmin && !isPortal && !hasLocalImageEditorPanel && isSiteImageEditMode && (
          <div className="fixed top-[88px] md:top-[122px] right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#185C20] text-white border border-white/15 shadow-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold">
              <ImagePlus size={13} />
              Site image edit mode
            </span>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(HOME_IMAGE_EDIT_MODE_KEY, 'false');
                setIsSiteImageEditMode(false);
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-white/15 transition-colors"
            >
              Exit
            </button>
          </div>
        )}
        <main className={`flex-grow ${!isAdmin && !isPortal ? 'pt-[80px] md:pt-[116px]' : ''}`}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
        {!isAdmin && !isPortal && <Footer />}
      </div>
    </>
  );
};

export default RootLayout;