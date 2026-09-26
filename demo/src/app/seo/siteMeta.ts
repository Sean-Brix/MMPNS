/**
 * Single source of truth for the school's public identity (NAP), social links,
 * and per-route SEO metadata.
 *
 * IMPORTANT: The JSON-LD structured data in `client/index.html` is kept in sync
 * with `SCHOOL_INFO` by hand. If you change an address / phone / email / social
 * link here, update the matching value in the <script type="application/ld+json">
 * block in index.html as well.
 */

export const SITE_URL = 'https://mmpns-pque.com';

export const SCHOOL_INFO = {
  name: 'Madre Maria Pia Notari School',
  alternateName: 'MMPNS',
  foundingYear: '1988',

  // Address (NAP) — keep identical everywhere it is displayed.
  address: {
    street: '#70 Timothy St., Multinational Village',
    locality: 'Parañaque City',
    region: 'Metro Manila',
    postalCode: '1708',
    country: 'PH',
    // Convenience one-liner used in footer / contact card.
    full: '#70 Timothy St., Multinational Village, Parañaque City, Metro Manila 1708',
  },

  // Contact
  phoneDisplay: '(02) 8821-1234 / 8821-5678',
  phonePrimaryTel: '+63288211234', // E.164-ish for tel: links and schema
  email: 'mmpns.official@gmail.com',

  // Office hours — VERIFY with the school and update if these are wrong.
  officeHours: 'Mon–Fri, 7:30 AM – 4:30 PM',

  // Social
  facebookUrl: 'https://www.facebook.com/MMPNSOfficial',
  facebookHandle: 'facebook.com/MMPNSOfficial',
} as const;

export interface PageSeo {
  title: string;
  description: string;
  /** Path used to build the absolute canonical URL, e.g. '/about'. */
  canonicalPath: string;
  /** When true, emit `noindex, nofollow` (private app / portal areas). */
  noindex?: boolean;
}

const DESCRIPTION_HOME =
  'Madre Maria Pia Notari School (MMPNS) is a Catholic private school in Multinational Village, Parañaque offering Kindergarten, Elementary, and Junior High School education rooted in faith and academic excellence.';

/** Per-route SEO metadata, keyed by pathname (no trailing slash). */
export const PAGE_SEO: Record<string, PageSeo> = {
  '/': {
    title: 'Madre Maria Pia Notari School (MMPNS) | Catholic School in Parañaque',
    description: DESCRIPTION_HOME,
    canonicalPath: '/',
  },
  '/about': {
    title: 'About MMPNS | Catholic Private School in Parañaque',
    description:
      'Learn about Madre Maria Pia Notari School (MMPNS), a Catholic private school in Multinational Village, Parañaque under the Sisters Adorers of the Holy Eucharist — our mission, vision, and heritage since 1988.',
    canonicalPath: '/about',
  },
  '/academics': {
    title: 'Academic Programs | Kindergarten, Elementary & Junior High in Parañaque',
    description:
      'Explore the academic programs at MMPNS in Parañaque: Kindergarten, Elementary, and Junior High School. A values-centered Catholic curriculum that develops well-rounded, faith-filled learners.',
    canonicalPath: '/academics',
  },
  '/admissions': {
    title: 'Admissions & Enrollment | MMPNS Parañaque',
    description:
      'Enroll at Madre Maria Pia Notari School, a private Catholic school in Parañaque. See requirements, enrollment procedures, and FAQs for Kindergarten, Elementary, and Junior High School admissions.',
    canonicalPath: '/admissions',
  },
  '/student-life': {
    title: 'Student Life | MMPNS Parañaque',
    description:
      'Discover student life at MMPNS in Parañaque — clubs, sports, arts, faith formation, and activities that shape confident, compassionate students.',
    canonicalPath: '/student-life',
  },
  '/news': {
    title: 'News & Announcements | MMPNS Parañaque',
    description:
      'Latest news, events, and announcements from Madre Maria Pia Notari School (MMPNS), a Catholic school in Multinational Village, Parañaque.',
    canonicalPath: '/news',
  },
  '/alumni': {
    title: 'Alumni | Madre Maria Pia Notari School (MMPNS)',
    description:
      'Connect with the MMPNS alumni community. Reconnect, give back, and stay involved with Madre Maria Pia Notari School in Parañaque.',
    canonicalPath: '/alumni',
  },
  '/alumni-gallery': {
    title: 'Alumni Gallery | MMPNS Parañaque',
    description:
      'Stories and memories from the alumni of Madre Maria Pia Notari School (MMPNS) in Parañaque.',
    canonicalPath: '/alumni-gallery',
  },
  '/faculty-staff': {
    title: 'Faculty & Staff | MMPNS Parañaque',
    description:
      'Meet the dedicated faculty and staff of Madre Maria Pia Notari School (MMPNS), a Catholic private school in Parañaque.',
    canonicalPath: '/faculty-staff',
  },
  '/contact': {
    title: 'Contact MMPNS | Catholic School in Multinational Village, Parañaque',
    description:
      'Contact Madre Maria Pia Notari School (MMPNS) in Multinational Village, Parañaque. Find our address, phone number, email, office hours, and Facebook page.',
    canonicalPath: '/contact',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | MMPNS',
    description:
      'Privacy policy for the Madre Maria Pia Notari School (MMPNS) website.',
    canonicalPath: '/privacy-policy',
  },
};

const DEFAULT_SEO: PageSeo = PAGE_SEO['/'];

/** Private / portal routes that should never be indexed. */
const NOINDEX_PREFIXES = [
  '/teacher-portal',
  '/student-portal',
  '/principal-portal',
  '/librarian-portal',
  '/registrar-portal',
  '/admin-portal',
  '/admin',
  '/superadmin',
  '/developer',
  '/downloadable-forms',
];

const normalizePath = (pathname: string): string => {
  if (!pathname) return '/';
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
};

/** Resolve the SEO metadata for a given pathname. */
export const getSeoForPath = (pathname: string): PageSeo => {
  const path = normalizePath(pathname);

  if (NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return {
      title: 'Madre Maria Pia Notari School (MMPNS)',
      description: DESCRIPTION_HOME,
      canonicalPath: path,
      noindex: true,
    };
  }

  return PAGE_SEO[path] ?? DEFAULT_SEO;
};
