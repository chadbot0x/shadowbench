import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  
  // Forward all query params, sanitize values
  searchParams.forEach((value, key) => {
    // Strip HTML tags and limit length
    const sanitized = value.replace(/<[^>]*>/g, '').slice(0, 200);
    params.set(key, sanitized);
  });

  // Defaults
  if (!params.has('closed')) params.set('closed', 'false');
  if (!params.has('order')) params.set('order', 'volume');
  if (!params.has('ascending')) params.set('ascending', 'false');

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?${params.toString()}`,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
