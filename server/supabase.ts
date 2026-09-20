import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseContext } from '@supabase/server';
import type { Request, Response, NextFunction } from 'express';

export type SupabaseContextResult = Awaited<ReturnType<typeof createSupabaseContext>>;

// Check if secret key is the masked placeholder or actually provided
export function isRealKey(key?: string): boolean {
  if (!key) return false;
  return !key.includes('••••') && !key.includes('...');
}

export function getSupabaseConfig() {
  let url = process.env.SUPABASE_URL?.trim();
  if (url && url.endsWith('/rest/v1/')) {
    url = url.slice(0, -'/rest/v1/'.length);
  } else if (url && url.endsWith('/rest/v1')) {
    url = url.slice(0, -'/rest/v1'.length);
  }
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const jwksUrl = process.env.SUPABASE_JWKS_URL?.trim();

  const isConfigured = Boolean(url && (isRealKey(publishableKey) || isRealKey(secretKey)));
  const hasSecretKey = isRealKey(secretKey);
  const hasPublishableKey = isRealKey(publishableKey);

  return {
    url,
    publishableKey,
    secretKey,
    jwksUrl,
    isConfigured,
    hasSecretKey,
    hasPublishableKey,
  };
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, secretKey, publishableKey, hasSecretKey, hasPublishableKey } = getSupabaseConfig();
  if (!url || (!hasSecretKey && !hasPublishableKey)) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  const activeKey = hasSecretKey ? secretKey! : publishableKey!;
  cachedClient = createClient(url, activeKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

/**
 * Verify inbound Supabase credentials using @supabase/server
 */
export async function verifyInboundSupabaseRequest(
  req: Request
): Promise<SupabaseContextResult | null> {
  const { isConfigured, url } = getSupabaseConfig();
  if (!isConfigured || !url) {
    return null;
  }

  try {
    // Construct a standard Fetch Request from the incoming Express request
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        } else {
          headers.set(key, value);
        }
      }
    }

    const webRequest = new globalThis.Request(fullUrl, {
      method: req.method,
      headers,
    });

    const context = await createSupabaseContext(webRequest, {
      auth: 'none',
    });

    return context;
  } catch (err) {
    console.warn('Supabase context extraction error:', err);
    return null;
  }
}
