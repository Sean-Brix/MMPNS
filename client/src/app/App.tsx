import { useEffect } from 'react';
import { RouterProvider } from 'react-router';

import { router } from './routes';

const MOBILE_TEACHER_PORTAL_PATH = '/teacher-portal';

const isStandaloneDisplayMode = () => {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
};

export default function App() {
  useEffect(() => {
    if (!isStandaloneDisplayMode()) {
      return;
    }

    const enforceTeacherPortalRoute = () => {
      if (!window.location.pathname.startsWith(MOBILE_TEACHER_PORTAL_PATH)) {
        window.location.replace(MOBILE_TEACHER_PORTAL_PATH);
      }
    };

    // Always start installed app users from the teacher login flow.
    localStorage.removeItem('teacherAuth');

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(...args) {
      originalPushState(...args);
      enforceTeacherPortalRoute();
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState(...args);
      enforceTeacherPortalRoute();
    };

    window.addEventListener('popstate', enforceTeacherPortalRoute);

    enforceTeacherPortalRoute();

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', enforceTeacherPortalRoute);
    };
  }, []);

  return <RouterProvider router={router} />;
}
