import aboutOrganizationalChart from '../../assets/about/organizational_chart.jpeg';
import academicInstitutionalQuality from '../../assets/academic_programs/institutional_quality.png';
import brandLogo from '../../assets/brand/logo.png';
import homepageElementary from '../../assets/homepage/elementary.png';
import homepageHeroMain from '../../assets/homepage/hero1.png';
import homepageHeroGarden from '../../assets/homepage/hero2.png';
import homepageJuniorHigh from '../../assets/homepage/junior_high.png';
import homepageKindergarten from '../../assets/homepage/kindergarten.png';
import homepageMariaPia from '../../assets/homepage/maria_pia.png';
import noImage from '../assets/no_image.png';
import studentLifeArtGuild from '../../assets/student_life/art_guild.png';
import studentLifeBasketball from '../../assets/student_life/basketball.png';
import studentLifeFireSafety from '../../assets/student_life/fireSafety.png';
import studentLifeGleeClub from '../../assets/student_life/glee_club.png';
import studentLifeHero from '../../assets/student_life/hero.png';
import studentLifeIntramurals from '../../assets/student_life/intrmurals.png';
import studentLifeSteward from '../../assets/student_life/steward.jpg';

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
    localSrc: aboutOrganizationalChart,
    storagePath: 'site-defaults/about/organizational_chart.jpeg',
  },
  academicInstitutionalQuality: {
    key: 'academicInstitutionalQuality',
    localSrc: academicInstitutionalQuality,
    storagePath: 'site-defaults/academic_programs/institutional_quality.png',
  },
  alumniGalleryJames: {
    key: 'alumniGalleryJames',
    localSrc: noImage,
    storagePath: 'site-defaults/alumni_gallery/james_profile.png',
  },
  alumniGalleryJamesVintage: {
    key: 'alumniGalleryJamesVintage',
    localSrc: noImage,
    storagePath: 'site-defaults/alumni_gallery/james_vintage.png',
  },
  brandLogo: {
    key: 'brandLogo',
    localSrc: brandLogo,
    storagePath: 'site-defaults/brand/logo.png',
  },
  sharedElementary: {
    key: 'sharedElementary',
    localSrc: homepageElementary,
    storagePath: 'site-defaults/shared/elementary.png',
  },
  sharedJuniorHigh: {
    key: 'sharedJuniorHigh',
    localSrc: homepageJuniorHigh,
    storagePath: 'site-defaults/shared/junior_high.png',
  },
  sharedKindergarten: {
    key: 'sharedKindergarten',
    localSrc: homepageKindergarten,
    storagePath: 'site-defaults/shared/kindergarten.png',
  },
  sharedMariaPia: {
    key: 'sharedMariaPia',
    localSrc: homepageMariaPia,
    storagePath: 'site-defaults/shared/maria_pia.png',
  },
  homeHeroMain: {
    key: 'homeHeroMain',
    localSrc: homepageHeroMain,
    storagePath: 'site-defaults/homepage/hero1.png',
  },
  homeHeroGarden: {
    key: 'homeHeroGarden',
    localSrc: homepageHeroGarden,
    storagePath: 'site-defaults/homepage/hero2.png',
  },
  studentLifeArtGuild: {
    key: 'studentLifeArtGuild',
    localSrc: studentLifeArtGuild,
    storagePath: 'site-defaults/student_life/art_guild.png',
  },
  studentLifeBasketball: {
    key: 'studentLifeBasketball',
    localSrc: studentLifeBasketball,
    storagePath: 'site-defaults/student_life/basketball.png',
  },
  studentLifeFireSafety: {
    key: 'studentLifeFireSafety',
    localSrc: studentLifeFireSafety,
    storagePath: 'site-defaults/student_life/fireSafety.png',
  },
  studentLifeGleeClub: {
    key: 'studentLifeGleeClub',
    localSrc: studentLifeGleeClub,
    storagePath: 'site-defaults/student_life/glee_club.png',
  },
  studentLifeHero: {
    key: 'studentLifeHero',
    localSrc: studentLifeHero,
    storagePath: 'site-defaults/student_life/hero.png',
  },
  studentLifeIntramurals: {
    key: 'studentLifeIntramurals',
    localSrc: studentLifeIntramurals,
    storagePath: 'site-defaults/student_life/intrmurals.png',
  },
  studentLifeSteward: {
    key: 'studentLifeSteward',
    localSrc: studentLifeSteward,
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
