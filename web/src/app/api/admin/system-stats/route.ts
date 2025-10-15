import { NextRequest, NextResponse } from 'next/server';

const MEDICINE_SERVICE_URL = process.env.MEDICINE_SERVICE_URL || 'http://localhost:4002';
const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL || 'http://localhost:4003';

function getAuthHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = getAuthHeader(request);
    
    // Fetch data from multiple services
    const [batchesResponse, iotResponse] = await Promise.allSettled([
      fetch(`${MEDICINE_SERVICE_URL}/api/medicine/batches`, {
        headers: { 'Authorization': authHeader }
      }),
      fetch(`${IOT_SERVICE_URL}/readings?limit=100`, {
        headers: { 'Authorization': authHeader }
      })
    ]);
    
    let totalBatches = 0;
    let totalReadings = 0;
    let anomalies = 0;
    
    if (batchesResponse.status === 'fulfilled' && batchesResponse.value.ok) {
      const batchData = await batchesResponse.value.json();
      totalBatches = batchData.batches?.length || 0;
    }
    
    if (iotResponse.status === 'fulfilled' && iotResponse.value.ok) {
      const iotData = await iotResponse.value.json();
      totalReadings = iotData.items?.length || 0;
      anomalies = iotData.items?.filter((item: any) => item.isAnomaly)?.length || 0;
    }
    
    const stats = {
      totalBatches,
      totalReadings,
      anomalies,
      systemHealth: 'healthy',
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('System stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
