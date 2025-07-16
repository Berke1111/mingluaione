import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/test-token
 * Checks if REPLICATE_API_TOKEN is loaded in the environment.
 * Returns { loaded: boolean, tokenLength: number }
 * Logs the token (masked except last 4 chars) to the server console.
 */
export async function GET(_req: NextRequest) {
  // Read the token from environment variables
  const token = process.env.REPLICATE_API_TOKEN || '';
  const loaded = !!token && token.length > 0;
  const tokenLength = token.length;

  // Mask all but the last 4 characters for logging
  const masked = loaded
    ? '*'.repeat(Math.max(0, token.length - 4)) + token.slice(-4)
    : '(not set)';
  console.log(`[REPLICATE_API_TOKEN] Loaded: ${loaded}, Length: ${tokenLength}, Value: ${masked}`);

  // Return JSON response
  return NextResponse.json({ loaded, tokenLength });
} 