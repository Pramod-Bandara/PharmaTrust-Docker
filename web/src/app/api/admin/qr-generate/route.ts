import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId } = body;
    
    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }
    
    // Generate QR code data
    const qrData = {
      batchId,
      url: `pharmatrust://verify/${batchId}`,
      timestamp: new Date().toISOString()
    };
    
    // Generate actual QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#2E86AB',
        light: '#FFFFFF'
      }
    });
    
    const response = {
      success: true,
      qrCode: qrCodeDataURL,
      payload: qrData,
      downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(qrData, null, 2))}`
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
