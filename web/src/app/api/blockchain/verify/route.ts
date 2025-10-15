import { NextRequest, NextResponse } from 'next/server';

const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://blockchain:4004';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BLOCKCHAIN_SERVICE_URL}/verify?batchId=${encodeURIComponent(batchId)}`);
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Blockchain verification failed' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blockchain verify API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId } = body;
    
    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BLOCKCHAIN_SERVICE_URL}/verify?batchId=${encodeURIComponent(batchId)}`);
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Blockchain verification failed' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Blockchain verify API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}