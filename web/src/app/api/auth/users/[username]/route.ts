import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await request.text();
    const resp = await fetch(`${AUTH_SERVICE_URL}/api/auth/users/${encodeURIComponent(resolvedParams.username)}`, {
      method: 'PUT',
      headers: {
        Authorization: getAuthHeader(request),
        'Content-Type': 'application/json',
      },
      body,
    });
    const text = await resp.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : {}; } catch { return NextResponse.json({ error: 'Upstream returned non-JSON' }, { status: 502 }); }
    if (!resp.ok) return NextResponse.json({ error: (data as { error?: string }).error || 'Failed to update user' }, { status: resp.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const resolvedParams = await params;
    const resp = await fetch(`${AUTH_SERVICE_URL}/api/auth/users/${encodeURIComponent(resolvedParams.username)}`, {
      method: 'DELETE',
      headers: { Authorization: getAuthHeader(request) },
    });
    const text = await resp.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : {}; } catch { return NextResponse.json({ error: 'Upstream returned non-JSON' }, { status: 502 }); }
    if (!resp.ok) return NextResponse.json({ error: (data as { error?: string }).error || 'Failed to delete user' }, { status: resp.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


