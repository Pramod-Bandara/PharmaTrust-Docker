import { NextRequest, NextResponse } from 'next/server';

const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL || 'http://localhost:4003';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { batchId } = resolvedParams;
    
    const response = await fetch(`${IOT_SERVICE_URL}/ml/batch/${encodeURIComponent(batchId)}/statistics`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(request),
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch batch ML statistics' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Batch ML Statistics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
