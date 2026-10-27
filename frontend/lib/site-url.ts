const DEFAULT_SITE_URL = "https://www.princesbrothers.com";

export function getSiteUrl(): URL {
  const configuredUrl = process.env.APP_URL?.trim() || DEFAULT_SITE_URL;
  let url: URL;

  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("APP_URL must be an absolute HTTP(S) origin.");
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_URL must be an absolute HTTP(S) origin.");
  }

  return new URL(url.origin);
}
