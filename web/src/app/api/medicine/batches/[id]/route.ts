import { NextRequest, NextResponse } from 'next/server';

const MEDICINE_SERVICE_URL = process.env.MEDICINE_SERVICE_URL || 'http://localhost:4002';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const response = await fetch(`${MEDICINE_SERVICE_URL}/api/medicine/batches/${resolvedParams.id}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(request),
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Batch not found' },
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
