/**
 * Browser Toolkit — HTTP-based web interaction tools for the ReAct agent.
 * Uses Jina Reader for page fetching, HTTP POST for form submission,
 * and Cheerio-based parsing (via html-parser) for content extraction.
 */

import * as cheerio from 'cheerio';
import { JINA_READER_URL } from '@/lib/constants';
import {
  PageSnapshot,
  LinkInfo,
  FormInfo,
  FormFieldInfo,
} from './agent-types';
import { extractTitle, simplifyHtml } from './html-parser';

/**
 * Fetch a web page and extract structured snapshot
 */
export async function fetchPage(url: string): Promise<PageSnapshot> {
  let rawHtml = '';

  // Try direct fetch first (faster, no external dependency)
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    rawHtml = await resp.text();
  } catch {
    // Fallback: Jina Reader (handles JS rendering, anti-bot)
    try {
      const resp = await fetch(`${JINA_READER_URL}${url}`, {
        headers: {
          Accept: 'text/plain',
          'X-Return-Format': 'html',
          'X-No-Cache': 'true',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) throw new Error(`Jina HTTP ${resp.status}`);
      rawHtml = await resp.text();
    } catch (err) {
      throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Parse page using Cheerio-based html-parser
  const title = extractTitle(rawHtml);
  const { text, links, forms } = extractPageStructure(rawHtml, url);

  return {
    url,
    title,
    content: text,
    links,
    forms,
    contentLength: text.length,
  };
}

/**
 * Navigate to a link (extracted from page) by fetching the target URL
 */
export async function navigateToLink(linkHref: string, currentUrl: string): Promise<PageSnapshot> {
  // Resolve relative URLs
  const targetUrl = new URL(linkHref, currentUrl).href;
  return fetchPage(targetUrl);
}

/**
 * Submit a form via HTTP POST
 */
export async function submitForm(
  formAction: string,
  method: string,
  fields: Record<string, string>,
  currentUrl: string
): Promise<PageSnapshot> {
  const targetUrl = new URL(formAction, currentUrl).href;
  const isGet = method.toUpperCase() === 'GET';

  if (isGet) {
    const params = new URLSearchParams(fields).toString();
    const fullUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${params}`;
    return fetchPage(fullUrl);
  } else {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: new URLSearchParams(fields).toString(),
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) throw new Error(`Form submit failed: HTTP ${resp.status}`);
    const html = await resp.text();
    const title = extractTitle(html);
    const { text, links, forms } = extractPageStructure(html, targetUrl);
    return { url: targetUrl, title, content: text, links, forms, contentLength: text.length };
  }
}

// ===== HTML Parsing Helpers (Cheerio-based) =====

/**
 * Extract links, forms, and simplified text from HTML using Cheerio.
 * Uses html-parser's simplifyHtml for content extraction,
 * and Cheerio selectors for link/form structural parsing.
 */
function extractPageStructure(html: string, baseUrl: string): {
  text: string;
  links: LinkInfo[];
  forms: FormInfo[];
} {
  const $ = cheerio.load(html);
  const links: LinkInfo[] = [];
  const forms: FormInfo[] = [];

  // Extract links using Cheerio
  let linkIndex = 0;
  $('a[href]').each((_, el) => {
    if (linkIndex >= 50) return false;
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim().substring(0, 100);
    if (
      text &&
      href &&
      !href.startsWith('#') &&
      !href.startsWith('javascript:') &&
      href.length < 500
    ) {
      links.push({ text, href, index: linkIndex });
      linkIndex++;
    }
  });

  // Extract forms using Cheerio
  let formIndex = 0;
  $('form').each((_, el) => {
    if (formIndex >= 10) return false;
    const action = $(el).attr('action') || baseUrl;
    const method = ($(el).attr('method') || 'GET').toUpperCase();

    const inputs: FormFieldInfo[] = [];
    $(el)
      .find('input, textarea, select')
      .each((_, inputEl) => {
        const tagName = inputEl.tagName?.toLowerCase();
        const name = $(inputEl).attr('name');
        if (!name) return;

        const type =
          tagName === 'textarea'
            ? 'textarea'
            : tagName === 'select'
              ? 'select'
              : ($(inputEl).attr('type') || 'text').toLowerCase();

        // Skip non-interactive input types
        if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return;

        const label =
          $(inputEl).attr('label') || $(inputEl).attr('placeholder') || name;
        const placeholder = $(inputEl).attr('placeholder');
        const required = $(inputEl).prop('required') === true;

        const field: FormFieldInfo = { name, type, label, placeholder, required };

        // Extract select options
        if (type === 'select') {
          const options: string[] = [];
          $(inputEl)
            .find('option[value]')
            .each((_, optEl) => {
              const val = $(optEl).attr('value');
              const optText = $(optEl).text().trim();
              if (val) options.push(`${val}: ${optText}`);
            });
          if (options.length > 0) field.options = options.slice(0, 20);
        }

        inputs.push(field);
      });

    // Find submit button text
    let submitText = 'Submit';
    const submitBtn = $(el).find('button[type="submit"]').first();
    if (submitBtn.length > 0) {
      submitText = submitBtn.text().trim() || 'Submit';
    } else {
      const submitInput = $(el).find('input[type="submit"]').first();
      if (submitInput.length > 0) {
        submitText = submitInput.attr('value') || 'Submit';
      }
    }

    forms.push({ action, method, inputs, submitText, index: formIndex });
    formIndex++;
  });

  // Use html-parser's simplifyHtml for high-quality content extraction
  const text = simplifyHtml(html);

  return { text, links, forms };
}

/**
 * Format a page snapshot for the LLM prompt
 */
export function formatPageForLLM(snapshot: PageSnapshot, maxChars: number = 30000): string {
  let content = snapshot.content;
  if (content.length > maxChars) {
    content = content.substring(0, maxChars) + '\n\n[Content truncated...]';
  }

  let output = `# Page: ${snapshot.title}\nURL: ${snapshot.url}\n\n`;

  // Links section
  if (snapshot.links.length > 0) {
    output += `## Available Links (${snapshot.links.length})\n`;
    for (const link of snapshot.links.slice(0, 30)) {
      output += `- [Link ${link.index}] "${link.text}" → ${link.href}\n`;
    }
    output += '\n';
  }

  // Forms section
  if (snapshot.forms.length > 0) {
    output += `## Available Forms (${snapshot.forms.length})\n`;
    for (const form of snapshot.forms) {
      output += `- [Form ${form.index}] Action: ${form.action} (Method: ${form.method})\n`;
      for (const field of form.inputs) {
        const opts = field.options ? ` [Options: ${field.options.length}]` : '';
        output += `  - Field: "${field.name}" (Type: ${field.type}, Required: ${field.required}${opts})`;
        if (field.placeholder) output += ` Placeholder: "${field.placeholder}"`;
        output += '\n';
      }
      if (form.submitText) output += `  - Submit Button: "${form.submitText}"\n`;
    }
    output += '\n';
  }

  // Page content
  output += `## Page Content\n${content}\n`;

  return output;
}
