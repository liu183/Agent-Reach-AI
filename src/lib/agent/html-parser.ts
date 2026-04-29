import * as cheerio from 'cheerio';

/**
 * Smart HTML simplification for LLM consumption.
 * Strips unnecessary elements and keeps main content.
 */
export function simplifyHtml(rawHtml: string, maxChars = 30000): string {
  const $ = cheerio.load(rawHtml);

  // Remove non-content elements
  $('script, style, nav, footer, header, iframe, noscript, svg, canvas').remove();
  $('aside, .sidebar, .nav, .menu, .advertisement, .ad, .promo, .cookie-banner, .popup, .modal').remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $('[style*="display:none"], [style*="display: none"], [style*="visibility:hidden"]').remove();
  $('[class*="hidden"], [class*="ad-"], [class*="cookie"], [class*="banner"], [class*="popup"]').remove();

  // Try to find main content
  let mainContent = $('main').first();
  if (mainContent.length === 0) {
    mainContent = $('[role="main"]').first();
  }
  if (mainContent.length === 0) {
    mainContent = $('article').first();
  }
  if (mainContent.length === 0) {
    mainContent = $('.content, .main-content, .post, .entry, #content').first();
  }
  if (mainContent.length === 0) {
    mainContent = $.root();
  }

  // Remove inline styles and data attributes
  mainContent.find('*').each((_, el) => {
    const attribs = $(el).attr();
    if (attribs) {
      const clean: Record<string, string> = {};
      for (const [key, val] of Object.entries(attribs)) {
        if (key === 'href' || key === 'src' || key === 'alt' || key === 'title' || key === 'class') {
          clean[key] = val;
        }
      }
      $(el).attr(clean);
    }
  });

  // Truncate long lists
  mainContent.find('ul, ol').each((_, el) => {
    const items = $(el).children('li');
    if (items.length > 6) {
      items.slice(6).remove();
      $(el).append('<li>... and more items</li>');
    }
  });

  // Get text content
  let text = mainContent.text();

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/ {2,}/g, ' ');
  text = text.trim();

  // Truncate to max chars
  if (text.length > maxChars) {
    text = text.substring(0, maxChars) + '\n\n... [content truncated]';
  }

  return text;
}

/**
 * Extract title from HTML
 */
export function extractTitle(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    $('h1').first().text() ||
    'Untitled Page';
  return title.trim();
}

/**
 * Extract meta description
 */
export function extractDescription(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);
  return (
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    ''
  ).trim();
}
