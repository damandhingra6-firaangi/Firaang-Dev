export const SITE_NAME = "Firaang";
export const SITE_TITLE_DEFAULT = "Firaang | Different By Design";
export const SITE_DESCRIPTION =
  "Firaang crafts premium clothing and jewellery with bold, expressive design for modern wardrobes.";
export const SITE_THEME_COLOR = "#fff8fa";
export const SITE_BACKGROUND_COLOR = "#ffffff";
export const SITE_LANGUAGE = "en-IN";
export const SITE_LOCALE = "en_IN";
export const SITE_URL_FALLBACK = "https://www.firaang.com";
export const DEFAULT_OG_IMAGE = "/Home Page Banner.png";
export const DEFAULT_OG_IMAGE_ALT = "Firaang signature campaign banner";
export const FAVICON_SOURCE = "/FiraangLogoDesign.png";

export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_BASE_URL?.trim();
  const baseUrl = fromEnv || SITE_URL_FALLBACK;

  try {
    return new URL(baseUrl).origin;
  } catch {
    return SITE_URL_FALLBACK;
  }
}

export function toAbsoluteUrl(path: string) {
  if (!path) {
    return getSiteUrl();
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
