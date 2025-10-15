import { NextRequest, NextResponse } from 'next/server';

const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://blockchain:4004';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    const url = batchId 
      ? `${BLOCKCHAIN_SERVICE_URL}/events?batchId=${encodeURIComponent(batchId)}`
      : `${BLOCKCHAIN_SERVICE_URL}/events`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch blockchain events' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blockchain events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
