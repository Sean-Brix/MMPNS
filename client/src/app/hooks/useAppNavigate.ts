import { useNavigate } from 'react-router';
import { useCallback } from 'react';

/**
 * Maps old page IDs to route paths.
 * Use this hook as a drop-in replacement for the old setCurrentPage pattern.
 */
const pageToPath: Record<string, string> = {
  home: '/',
  about: '/about',
  academics: '/academics',
  admissions: '/admissions',
  'student-life': '/student-life',
  news: '/news',
  'privacy-policy': '/privacy-policy',
  alumni: '/alumni',
  'alumni-gallery': '/alumni-gallery',
  'faculty-staff': '/faculty-staff',
  contact: '/contact',
  admin: '/admin',
  developer: '/developer',
  'teacher-portal': '/teacher-portal',
  'student-portal': '/student-portal',
  'admin-portal': '/admin-portal',
  'downloadable-forms': '/downloadable-forms',
};

export function useAppNavigate() {
  const navigate = useNavigate();

  const goTo = useCallback(
    (pageId: string) => {
      const path = pageToPath[pageId] || '/';
      navigate(path);
      window.scrollTo(0, 0);
    },
    [navigate]
  );

  return goTo;
}