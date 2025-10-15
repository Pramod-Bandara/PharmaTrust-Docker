import { NextRequest, NextResponse } from 'next/server';

const MEDICINE_SERVICE_URL = process.env.MEDICINE_SERVICE_URL || 'http://localhost:4002';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${MEDICINE_SERVICE_URL}/api/medicine/batches${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(request),
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch batches' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Medicine API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${MEDICINE_SERVICE_URL}/api/medicine/batches`, {
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
        { error: data.error || 'Failed to create batch' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Medicine API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
