import { NextRequest, NextResponse } from 'next/server';

const MEDICINE_SERVICE_URL = process.env.MEDICINE_SERVICE_URL || 'http://localhost:4002';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const batchId = resolvedParams.id;
    const body = await request.json();

    // Validate required fields
    if (!body.toStage) {
      return NextResponse.json(
        { success: false, error: 'toStage is required' },
        { status: 400 }
      );
    }

    // Validate stage value
    const validStages = ['manufacturer', 'supplier', 'pharmacist', 'customer'];
    if (!validStages.includes(body.toStage)) {
      return NextResponse.json(
        { success: false, error: 'Invalid stage value' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MEDICINE_SERVICE_URL}/api/medicine/batches/${encodeURIComponent(batchId)}/transfer`,
      {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(request),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toStage: body.toStage,
          handledBy: body.handledBy,
          location: body.location,
          notes: body.notes,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to transfer batch' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Batch transfer API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
