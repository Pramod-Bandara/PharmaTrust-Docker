import { NextRequest, NextResponse } from 'next/server';

const MOBILE_GATEWAY_URL = process.env.MOBILE_GATEWAY_URL || 'http://localhost:4010';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'batchId is required' },
        { status: 400 }
      );
    }

    // Forward the request to the mobile gateway service
    const response = await fetch(
      `${MOBILE_GATEWAY_URL}/api/mobile/verify?batchId=${encodeURIComponent(batchId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Forward authorization header if present
          ...(request.headers.get('authorization')
            ? { 'Authorization': request.headers.get('authorization') as string }
            : {}
          ),
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Mobile verify API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify batch. Mobile gateway service unavailable.'
      },
      { status: 502 }
    );
  }
}
