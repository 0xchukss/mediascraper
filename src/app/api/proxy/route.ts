import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const range = request.headers.get('Range');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...(range ? { Range: range } : {}),
      }
    });

    // Forward the headers
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      // Only forward necessary headers
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}
