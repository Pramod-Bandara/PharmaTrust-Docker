import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function GET(request: NextRequest) {
  try {
    const resp = await fetch(`${AUTH_SERVICE_URL}/api/auth/users`, {
      headers: { Authorization: getAuthHeader(request) },
    });
    const text = await resp.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: 'Upstream returned non-JSON' }, { status: 502 });
    }
    if (!resp.ok) return NextResponse.json({ error: data.error || 'Failed to fetch users' }, { status: resp.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const resp = await fetch(`${AUTH_SERVICE_URL}/api/auth/users`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(request),
        'Content-Type': 'application/json',
      },
      body,
    });
    const text = await resp.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: 'Upstream returned non-JSON' }, { status: 502 });
    }
    if (!resp.ok) return NextResponse.json({ error: data.error || 'Failed to create user' }, { status: resp.status });
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


