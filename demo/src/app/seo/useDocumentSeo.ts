import { useEffect } from 'react';

import { SITE_URL, type PageSeo } from './siteMeta';

/**
 * Imperatively syncs the document <head> (title, description, canonical, robots,
 * Open Graph / Twitter tags) to the current route's SEO metadata.
 *
 * This is purely metadata: it never renders anything and does not affect the UI
 * or any user-facing behavior. It updates existing tags from index.html in place
 * and creates any that are missing.
 */

const upsertMetaByName = (name: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertMetaByProperty = (property: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const buildCanonicalUrl = (canonicalPath: string): string => {
  if (canonicalPath === '/' || canonicalPath === '') {
    return `${SITE_URL}/`;
  }
  return `${SITE_URL}${canonicalPath.startsWith('/') ? '' : '/'}${canonicalPath}`;
};

export const useDocumentSeo = (seo: PageSeo): void => {
  useEffect(() => {
    const url = buildCanonicalUrl(seo.canonicalPath);

    document.title = seo.title;
    upsertMetaByName('description', seo.description);
    upsertMetaByName('robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');
    upsertCanonical(url);

    upsertMetaByProperty('og:title', seo.title);
    upsertMetaByProperty('og:description', seo.description);
    upsertMetaByProperty('og:url', url);

    upsertMetaByName('twitter:title', seo.title);
    upsertMetaByName('twitter:description', seo.description);
  }, [seo.title, seo.description, seo.canonicalPath, seo.noindex]);
};
