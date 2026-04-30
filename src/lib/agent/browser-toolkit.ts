/**
 * Browser Toolkit — HTTP-based web interaction tools for the ReAct agent.
 * Uses Jina Reader for page fetching, HTTP POST for form submission,
 * and regex/DOM-like parsing for link/form extraction.
 */

import { JINA_READER_URL } from '@/lib/constants';
import {
  PageSnapshot,
  LinkInfo,
  FormInfo,
  FormFieldInfo,
} from './agent-types';

/**
 * Fetch a web page and extract structured snapshot
 */
export async function fetchPage(url: string): Promise<PageSnapshot> {
  let rawHtml = '';

  // Try Jina Reader first (handles JS rendering, anti-bot)
  try {
    const resp = await fetch(`${JINA_READER_URL}${url}`, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'html',
        'X-No-Cache': 'true',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) throw new Error(`Jina HTTP ${resp.status}`);
    rawHtml = await resp.text();
  } catch {
    // Fallback: direct fetch
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) throw new Error(`Direct HTTP ${resp.status}`);
      rawHtml = await resp.text();
    } catch (err) {
      throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Parse page
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

// ===== HTML Parsing Helpers =====

function extractTitle(html: string): string {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) return decodeEntities(titleMatch[1].trim()).substring(0, 200);

  // Try og:title meta
  const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
  if (ogMatch) return decodeEntities(ogMatch[1].trim()).substring(0, 200);

  return 'Untitled Page';
}

function extractPageStructure(html: string, baseUrl: string): {
  text: string;
  links: LinkInfo[];
  forms: FormInfo[];
} {
  const links: LinkInfo[] = [];
  const forms: FormInfo[] = [];

  // Extract links
  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  let linkIndex = 0;
  while ((linkMatch = linkRegex.exec(html)) !== null && linkIndex < 50) {
    const href = linkMatch[1];
    const text = cleanText(linkMatch[2]);
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:') && href.length < 500) {
      links.push({ text: text.substring(0, 100), href, index: linkIndex });
      linkIndex++;
    }
  }

  // Extract forms
  const formRegex = /<form[^>]*action=["']([^"']*)["'][^>]*method=["']([^"']*)["'][^>]*>([\s\S]*?)<\/form>/gi;
  let formMatch;
  let formIndex = 0;
  while ((formMatch = formRegex.exec(html)) !== null && formIndex < 10) {
    const action = formMatch[1];
    const method = formMatch[2].toUpperCase() || 'GET';
    const formHtml = formMatch[3];

    const inputs: FormFieldInfo[] = [];
    const inputRegex = /<(input|textarea|select)[^>]*>/gi;
    let inputMatch;

    while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
      const tag = inputMatch[1].toLowerCase();
      const fullTag = inputMatch[0];

      const name = getAttr(fullTag, 'name');
      const type = tag === 'textarea' ? 'textarea' : (getAttr(fullTag, 'type') || (tag === 'select' ? 'select' : 'text'));
      const label = getAttr(fullTag, 'label') || getAttr(fullTag, 'placeholder') || name;
      const placeholder = getAttr(fullTag, 'placeholder');
      const required = fullTag.includes('required');

      if (name && !['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) {
        const field: FormFieldInfo = { name, type, label, placeholder, required };

        // Extract select options
        if (type === 'select' || tag === 'select') {
          const options: string[] = [];
          const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
          let optMatch;
          while ((optMatch = optionRegex.exec(formHtml)) !== null) {
            if (optMatch[1]) options.push(`${optMatch[1]}: ${cleanText(optMatch[2])}`);
          }
          if (options.length > 0) field.options = options.slice(0, 20);
        }

        inputs.push(field);
      }
    }

    // Find submit button text
    const submitMatch = formHtml.match(/<button[^>]*type=["']submit["'][^>]*>([\s\S]*?)<\/button>/i)
      || formHtml.match(/<input[^>]*type=["']submit["'][^>]*value=["']([^"']*)["']/i);

    forms.push({
      action: action || baseUrl,
      method,
      inputs,
      submitText: submitMatch
        ? cleanText(submitMatch[1] || submitMatch[2] || 'Submit')
        : 'Submit',
      index: formIndex,
    });
    formIndex++;
  }

  // Also try form with method before action
  const formRegex2 = /<form[^>]*method=["']([^"']*)["'][^>]*action=["']([^"']*)["'][^>]*>([\s\S]*?)<\/form>/gi;
  while ((formMatch = formRegex2.exec(html)) !== null && formIndex < 10) {
    const method = formMatch[1].toUpperCase() || 'GET';
    const action = formMatch[2];
    const formHtml = formMatch[3];
    // Re-use same input parsing...
    const inputs: FormFieldInfo[] = [];
    const inputRegex = /<(input|textarea|select)[^>]*>/gi;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
      const tag = inputMatch[1].toLowerCase();
      const fullTag = inputMatch[0];
      const name = getAttr(fullTag, 'name');
      const type = tag === 'textarea' ? 'textarea' : (getAttr(fullTag, 'type') || 'text');
      if (name && !['hidden', 'submit', 'button'].includes(type)) {
        inputs.push({ name, type, label: name, required: fullTag.includes('required') });
      }
    }
    forms.push({ action: action || baseUrl, method, inputs, submitText: 'Submit', index: formIndex });
    formIndex++;
  }

  // Extract readable text content (remove scripts, styles, tags)
  const text = cleanText(html)
    .replace(/\s+/g, ' ')
    .trim();

  return { text, links, forms };
}

function getAttr(tag: string, attr: string): string {
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
  const match = tag.match(regex);
  return match ? match[1] : '';
}

function cleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&\w+;/g, '');
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
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
