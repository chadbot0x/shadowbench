import { NextRequest, NextResponse } from 'next/server';
import { listWebhooks, registerWebhook, deleteWebhook } from '@/lib/webhook-dispatcher';

function getApiKey(req: NextRequest): string {
  return req.headers.get('X-API-Key') || 'anonymous';
}

export async function GET(req: NextRequest) {
  const apiKey = getApiKey(req);
  return NextResponse.json({ webhooks: listWebhooks(apiKey) });
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  const body = await req.json();

  if (!body.url || typeof body.min_spread_pct !== 'number') {
    return NextResponse.json({ error: 'url and min_spread_pct required' }, { status: 400 });
  }

  const hook = registerWebhook(apiKey, {
    url: body.url,
    min_spread_pct: body.min_spread_pct,
    categories: body.categories,
    platforms: body.platforms,
    secret: body.secret,
  });

  return NextResponse.json({ webhook: hook }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const apiKey = getApiKey(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const deleted = deleteWebhook(apiKey, id);
  if (!deleted) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
