import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Demo user accounts for verification
const DEMO_USERS = [
  {
    _id: 'demo-mfg-001',
    username: 'mfg1',
    role: 'manufacturer',
    entityName: 'PharmaCorp Manufacturing'
  },
  {
    _id: 'demo-sup-001',
    username: 'sup1',
    role: 'supplier',
    entityName: 'MedSupply Distribution'
  },
  {
    _id: 'demo-phm-001',
    username: 'phm1',
    role: 'pharmacist',
    entityName: 'HealthPlus Pharmacy'
  },
  {
    _id: 'demo-adm-001',
    username: 'admin',
    role: 'admin',
    entityName: 'PharmaTrust Admin'
  }
];

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Demo mode token verification
    if (DEMO_MODE) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        const demoUser = DEMO_USERS.find(user => user._id === decoded.userId);
        
        if (demoUser) {
          return NextResponse.json({
            user: {
              _id: demoUser._id,
              username: demoUser.username,
              role: demoUser.role,
              entityName: demoUser.entityName
            }
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          });
        } else {
          return NextResponse.json(
            { error: 'Invalid demo token' },
            { 
              status: 401,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              }
            }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid or expired demo token' },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        );
      }
    }

    // Production mode - try auth service
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Token verification failed' },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Auth verify API error:', error);
    
    // If in demo mode and auth service fails, provide helpful error
    if (DEMO_MODE) {
      return NextResponse.json(
        { error: 'Demo mode active. Please login with demo credentials first.' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}
