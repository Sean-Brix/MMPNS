export type SiteDefaultImageKey =
  | 'aboutOrgChart'
  | 'academicInstitutionalQuality'
  | 'alumniGalleryJames'
  | 'alumniGalleryJamesVintage'
  | 'brandLogo'
  | 'sharedElementary'
  | 'sharedJuniorHigh'
  | 'sharedKindergarten'
  | 'sharedMariaPia'
  | 'homeHeroMain'
  | 'homeHeroGarden'
  | 'studentLifeArtGuild'
  | 'studentLifeBasketball'
  | 'studentLifeFireSafety'
  | 'studentLifeGleeClub'
  | 'studentLifeHero'
  | 'studentLifeIntramurals'
  | 'studentLifeSteward';

export interface SiteDefaultImageDefinition {
  key: SiteDefaultImageKey;
  localSrc: string;
  storagePath: string;
}

export const SITE_DEFAULT_IMAGES: Record<SiteDefaultImageKey, SiteDefaultImageDefinition> = {
  aboutOrgChart: {
    key: 'aboutOrgChart',
    localSrc: '/images/about/organizational_chart.svg',
    storagePath: 'site-defaults/about/organizational_chart.svg',
  },
  academicInstitutionalQuality: {
    key: 'academicInstitutionalQuality',
    localSrc: '/images/academic_programs/institutional_quality.png',
    storagePath: 'site-defaults/academic_programs/institutional_quality.png',
  },
  alumniGalleryJames: {
    key: 'alumniGalleryJames',
    localSrc: '/images/no_image.png',
    storagePath: 'site-defaults/alumni_gallery/james_profile.png',
  },
  alumniGalleryJamesVintage: {
    key: 'alumniGalleryJamesVintage',
    localSrc: '/images/no_image.png',
    storagePath: 'site-defaults/alumni_gallery/james_vintage.png',
  },
  brandLogo: {
    key: 'brandLogo',
    localSrc: '/images/brand/logo.png',
    storagePath: 'site-defaults/brand/logo.png',
  },
  sharedElementary: {
    key: 'sharedElementary',
    localSrc: '/images/homepage/elementary.png',
    storagePath: 'site-defaults/shared/elementary.png',
  },
  sharedJuniorHigh: {
    key: 'sharedJuniorHigh',
    localSrc: '/images/homepage/junior_high.png',
    storagePath: 'site-defaults/shared/junior_high.png',
  },
  sharedKindergarten: {
    key: 'sharedKindergarten',
    localSrc: '/images/homepage/kindergarten.png',
    storagePath: 'site-defaults/shared/kindergarten.png',
  },
  sharedMariaPia: {
    key: 'sharedMariaPia',
    localSrc: '/images/homepage/maria_pia.png',
    storagePath: 'site-defaults/shared/maria_pia.png',
  },
  homeHeroMain: {
    key: 'homeHeroMain',
    localSrc: '/images/homepage/hero1.png',
    storagePath: 'site-defaults/homepage/hero1.png',
  },
  homeHeroGarden: {
    key: 'homeHeroGarden',
    localSrc: '/images/homepage/hero2.png',
    storagePath: 'site-defaults/homepage/hero2.png',
  },
  studentLifeArtGuild: {
    key: 'studentLifeArtGuild',
    localSrc: '/images/student_life/art_guild.png',
    storagePath: 'site-defaults/student_life/art_guild.png',
  },
  studentLifeBasketball: {
    key: 'studentLifeBasketball',
    localSrc: '/images/student_life/basketball.png',
    storagePath: 'site-defaults/student_life/basketball.png',
  },
  studentLifeFireSafety: {
    key: 'studentLifeFireSafety',
    localSrc: '/images/student_life/fireSafety.png',
    storagePath: 'site-defaults/student_life/fireSafety.png',
  },
  studentLifeGleeClub: {
    key: 'studentLifeGleeClub',
    localSrc: '/images/student_life/glee_club.png',
    storagePath: 'site-defaults/student_life/glee_club.png',
  },
  studentLifeHero: {
    key: 'studentLifeHero',
    localSrc: '/images/student_life/hero.png',
    storagePath: 'site-defaults/student_life/hero.png',
  },
  studentLifeIntramurals: {
    key: 'studentLifeIntramurals',
    localSrc: '/images/student_life/intrmurals.png',
    storagePath: 'site-defaults/student_life/intrmurals.png',
  },
  studentLifeSteward: {
    key: 'studentLifeSteward',
    localSrc: '/images/student_life/steward.jpg',
    storagePath: 'site-defaults/student_life/steward.jpg',
  },
};

export const SITE_DEFAULT_IMAGE_LIST = Object.values(SITE_DEFAULT_IMAGES);

export const PAGE_DEFAULT_IMAGES = {
  brand: {
    logo: SITE_DEFAULT_IMAGES.brandLogo.localSrc,
  },
  about: {
    orgChart: SITE_DEFAULT_IMAGES.aboutOrgChart.localSrc,
    schoolSeal: SITE_DEFAULT_IMAGES.brandLogo.localSrc,
    foundress: SITE_DEFAULT_IMAGES.sharedMariaPia.localSrc,
  },
  academics: {
    hero: SITE_DEFAULT_IMAGES.academicInstitutionalQuality.localSrc,
    kindergarten: SITE_DEFAULT_IMAGES.sharedKindergarten.localSrc,
    elementary: SITE_DEFAULT_IMAGES.sharedElementary.localSrc,
    juniorHigh: SITE_DEFAULT_IMAGES.sharedJuniorHigh.localSrc,
  },
  studentLife: {
    hero: SITE_DEFAULT_IMAGES.studentLifeHero.localSrc,
    varsitySports: SITE_DEFAULT_IMAGES.studentLifeBasketball.localSrc,
    gleeClub: SITE_DEFAULT_IMAGES.studentLifeGleeClub.localSrc,
    stewardshipClub: SITE_DEFAULT_IMAGES.studentLifeSteward.localSrc,
    artGuild: SITE_DEFAULT_IMAGES.studentLifeArtGuild.localSrc,
    intramurals: SITE_DEFAULT_IMAGES.studentLifeIntramurals.localSrc,
    fireSafety: SITE_DEFAULT_IMAGES.studentLifeFireSafety.localSrc,
  },
  home: {
    heroMain: SITE_DEFAULT_IMAGES.homeHeroMain.localSrc,
    heroGarden: SITE_DEFAULT_IMAGES.homeHeroGarden.localSrc,
    heroChristmas: SITE_DEFAULT_IMAGES.homeHeroGarden.localSrc,
    heroMass: SITE_DEFAULT_IMAGES.homeHeroMain.localSrc,
    foundressLegacy: SITE_DEFAULT_IMAGES.sharedMariaPia.localSrc,
    academicKindergarten: SITE_DEFAULT_IMAGES.sharedKindergarten.localSrc,
    academicElementary: SITE_DEFAULT_IMAGES.sharedElementary.localSrc,
    academicJuniorHigh: SITE_DEFAULT_IMAGES.sharedJuniorHigh.localSrc,
  },
} as const;

export const HOME_SLOT_SITE_IMAGE_KEY = {
  heroMain: 'homeHeroMain',
  heroGarden: 'homeHeroGarden',
  heroChristmas: 'homeHeroGarden',
  heroMass: 'homeHeroMain',
  foundressLegacy: 'sharedMariaPia',
  academicKindergarten: 'sharedKindergarten',
  academicElementary: 'sharedElementary',
  academicJuniorHigh: 'sharedJuniorHigh',
} as const;

export type HomeSlotSiteImageMap = typeof HOME_SLOT_SITE_IMAGE_KEY;
