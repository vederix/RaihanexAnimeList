/**
 * Sanitizes HTML strings from AniList API to prevent XSS while preserving safe formatting tags (b, i, em, strong, br, p, a, ul, li)
 * @param {string} dirtyHtml - Raw HTML string from API
 * @returns {string} Clean sanitized HTML
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  // Strip harmful elements, protocols, and attributes
  const clean = dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "") // Remove on* inline event handlers (onclick, onerror, onload, etc.)
    .replace(/javascript\s*:/gi, "blocked:");

  return clean;
}
