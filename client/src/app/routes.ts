import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router';
import { PageRouteSkeleton } from './components/ui/page-route-skeleton';
import { RootLayout } from './pages/RootLayout';

const withRouteSkeleton = (
  LazyComponent: React.LazyExoticComponent<React.ComponentType<any>>,
) => {
  return function RouteComponent() {
    return React.createElement(
      Suspense,
      { fallback: React.createElement(PageRouteSkeleton) },
      React.createElement(LazyComponent),
    );
  };
};

const Home = withRouteSkeleton(
  lazy(() => import('./pages/Home').then((module) => ({ default: module.Home }))),
);
const About = withRouteSkeleton(
  lazy(() => import('./pages/About').then((module) => ({ default: module.About }))),
);
const Academics = withRouteSkeleton(
  lazy(() => import('./pages/Academics').then((module) => ({ default: module.Academics }))),
);
const Admissions = withRouteSkeleton(
  lazy(() => import('./pages/Admissions').then((module) => ({ default: module.Admissions }))),
);
const StudentLife = withRouteSkeleton(
  lazy(() => import('./pages/StudentLife').then((module) => ({ default: module.StudentLife }))),
);
const News = withRouteSkeleton(
  lazy(() => import('./pages/News').then((module) => ({ default: module.News }))),
);
const PrivacyPolicy = withRouteSkeleton(
  lazy(() => import('./pages/News/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy }))),
);
const Alumni = withRouteSkeleton(
  lazy(() => import('./pages/Alumni').then((module) => ({ default: module.Alumni }))),
);
const AlumniGallery = withRouteSkeleton(
  lazy(() => import('./pages/AlumniGallery').then((module) => ({ default: module.AlumniGallery }))),
);
const Contact = withRouteSkeleton(
  lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact }))),
);
const Dashboard = withRouteSkeleton(
  lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard }))),
);

const FacultyStaff = withRouteSkeleton(
  lazy(() => import('./pages/FacultyStaff').then((module) => ({ default: module.FacultyStaff }))),
);
const TeacherPortal = withRouteSkeleton(
  lazy(() => import('./pages/Portal/TeacherPortal').then((module) => ({ default: module.TeacherPortal }))),
);
const StudentPortal = withRouteSkeleton(
  lazy(() => import('./pages/Portal/StudentPortal').then((module) => ({ default: module.StudentPortal }))),
);
const PrincipalPortal = withRouteSkeleton(
  lazy(() => import('./pages/Portal/PrincipalPortal').then((module) => ({ default: module.PrincipalPortal }))),
);
const LibrarianPortal = withRouteSkeleton(
  lazy(() => import('./pages/Portal/LibrarianPortal').then((module) => ({ default: module.LibrarianPortal }))),
);
const RegistrarPortal = withRouteSkeleton(
  lazy(() => import('./pages/Portal/RegistrarPortal').then((module) => ({ default: module.RegistrarPortal }))),
);
const AdminPortal = withRouteSkeleton(
  lazy(() => import('./pages/Portal/AdminPortal').then((module) => ({ default: module.AdminPortal }))),
);
const DownloadableForms = withRouteSkeleton(
  lazy(() => import('./pages/Portal/DownloadableForms').then((module) => ({ default: module.DownloadableForms }))),
);

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: 'about', Component: About },
      { path: 'academics', Component: Academics },
      { path: 'admissions', Component: Admissions },
      { path: 'student-life', Component: StudentLife },
      { path: 'news', Component: News },
      { path: 'privacy-policy', Component: PrivacyPolicy },
      { path: 'alumni', Component: Alumni },
      { path: 'alumni-gallery', Component: AlumniGallery },
      { path: 'faculty-staff', Component: FacultyStaff },
      { path: 'contact', Component: Contact },
      { path: 'teacher-portal', Component: TeacherPortal },
      { path: 'student-portal', Component: StudentPortal },
      { path: 'principal-portal', Component: PrincipalPortal },
      { path: 'librarian-portal', Component: LibrarianPortal },
      { path: 'registrar-portal', Component: RegistrarPortal },
      { path: 'admin-portal', Component: AdminPortal },
      { path: 'downloadable-forms', Component: DownloadableForms },
      { path: '*', Component: Home },
    ],
  },
  {
    path: '/superadmin',
    loader: () => redirect('/admin-portal'),
  },
  {
    path: '/admin',
    Component: Dashboard,
  },
  {
    path: '/developer',
    loader: () => redirect('/superadmin'),
  },
]);