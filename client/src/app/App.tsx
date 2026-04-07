import { useEffect } from 'react';
import { RouterProvider } from 'react-router';

import { router } from './routes';

const MOBILE_TEACHER_PORTAL_PATH = '/teacher-portal';

const isStandaloneDisplayMode = () => {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
};

const isSmallScreenInstall = () => {
  return window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
};

export default function App() {
  useEffect(() => {
    if (!isStandaloneDisplayMode() || !isSmallScreenInstall()) {
      return;
    }

    // On small-screen installs, route root launches directly into the teacher portal.
    if (window.location.pathname === '/') {
      window.location.replace(MOBILE_TEACHER_PORTAL_PATH);
    }
  }, []);

  return <RouterProvider router={router} />;
}
