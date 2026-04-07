import React from 'react';
import { motion } from 'motion/react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage }) => {
  const isAdmin = currentPage === 'admin';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-[#EDCD1F] selection:text-[#185C20]">
      {!isAdmin && <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />}
      
      <main className={`flex-grow ${!isAdmin ? 'pt-[80px] md:pt-[116px]' : ''}`}>
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {!isAdmin && <Footer setCurrentPage={setCurrentPage} />}
    </div>
  );
};
