import { NextRequest, NextResponse } from 'next/server';

const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL || 'http://localhost:4003';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${IOT_SERVICE_URL}/readings${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(request),
        'Content-Type': 'application/json',
      },
    });
    const text = await response.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Fall back to empty structure if upstream returned HTML
      data = { items: [] };
    }

    if (!response.ok) {
      // If upstream complains about missing batchId, degrade gracefully to empty list
      const msg = typeof data?.error === 'string' ? data.error.toLowerCase() : '';
      if (response.status === 400 && msg.includes('batchid is required')) {
        return NextResponse.json([], { status: 200 });
      }
      return NextResponse.json(
        { error: (typeof data.error === 'string' && data.error) || 'Failed to fetch IoT readings' },
        { status: response.status }
      );
    }

    // Normalize to array for frontend callers
    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    return NextResponse.json(items);
  } catch (error) {
    console.error('IoT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${IOT_SERVICE_URL}/readings`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(request),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to submit IoT reading' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('IoT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
