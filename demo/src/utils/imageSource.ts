const EMPTY_IMAGE_VALUES = new Set(['', 'null', 'undefined', 'none']);

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const isStaleSiteDefaultImageSrc = (value: string) => {
  const lowerValue = value.toLowerCase();
  const decodedValue = safeDecode(value).toLowerCase();

  return (
    lowerValue.includes('site-defaults%2f') ||
    lowerValue.includes('site-defaults%252f') ||
    decodedValue.includes('site-defaults/')
  );
};

export const sanitizeStoredImageSrc = (value: unknown, fallbackSrc: string) => {
  if (typeof value !== 'string') {
    return fallbackSrc;
  }

  const trimmedValue = value.trim();
  const lowerValue = trimmedValue.toLowerCase();

  if (
    EMPTY_IMAGE_VALUES.has(lowerValue) ||
    lowerValue.startsWith('blob:') ||
    lowerValue.startsWith('file:') ||
    lowerValue.startsWith('about:')
  ) {
    return fallbackSrc;
  }

  if (isStaleSiteDefaultImageSrc(trimmedValue)) {
    return fallbackSrc;
  }

  return trimmedValue;
};
