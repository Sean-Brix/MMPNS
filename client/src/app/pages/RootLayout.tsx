import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { motion } from 'motion/react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../utils/firebaseConfig';
import { initializeDatabase } from '../../utils/database';

const PORTAL_PATHS = [
  '/teacher-portal', '/student-portal', '/principal-portal',
  '/librarian-portal', '/registrar-portal', '/admin-portal', '/superadmin',
];

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';
  const isPortal = PORTAL_PATHS.includes(location.pathname);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    void initializeDatabase();
  }, []);

  // Keep Firebase ID token fresh on page reload/focus
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void user.getIdToken(true).catch(() => undefined);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <Toaster position="top-center" expand={true} richColors />
      <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-[#EDCD1F] selection:text-[#185C20]">
        {!isAdmin && !isPortal && <Header />}
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