/**
 * Centralized API client for all fetch calls.
 * In standalone mode (Vercel production), relative URLs like '/api/...'
 * may not resolve correctly. This helper constructs absolute URLs
 * using window.location.origin on the client side.
 */

export function apiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin to build absolute URL
    const base = window.location.origin;
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
  // Server-side: just return the path (Next.js handles it)
  return path;
}

/**
 * Get the stored auth token from localStorage.
 * Used when API_AUTH_TOKEN is set on the server.
 */
function getApiAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('agent-reach-auth-token') || '';
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = apiUrl(path);
  const token = getApiAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Include auth token if available
  if (token) {
    headers['x-api-key'] = token;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error (${res.status}): ${errorText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Helper for SSE (Server-Sent Events) connections
 */
export function apiEventSource(path: string): EventSource {
  const url = apiUrl(path);

  // For SSE, we can't set custom headers on EventSource.
  // Append token as query param if available.
  const token = getApiAuthToken();
  if (token) {
    const separator = path.includes('?') ? '&' : '?';
    return new EventSource(`${url}${separator}token=${encodeURIComponent(token)}`);
  }

  return new EventSource(url);
}
