import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Demo user accounts for bypass
const DEMO_USERS = [
  {
    _id: 'demo-mfg-001',
    username: 'mfg1',
    password: 'demo123',
    role: 'manufacturer',
    entityName: 'PharmaCorp Manufacturing'
  },
  {
    _id: 'demo-sup-001',
    username: 'sup1',
    password: 'demo123',
    role: 'supplier',
    entityName: 'MedSupply Distribution'
  },
  {
    _id: 'demo-phm-001',
    username: 'phm1',
    password: 'demo123',
    role: 'pharmacist',
    entityName: 'HealthPlus Pharmacy'
  },
  {
    _id: 'demo-adm-001',
    username: 'admin',
    password: 'admin123',
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
    const body = await request.json();
    const { username, password, idToken, provider } = body;

    // Handle Firebase ID token authentication
    if (idToken) {
      try {
        const decodedToken = await verifyFirebaseIdToken(idToken);
        
        // Create a user record based on Firebase user data
        const firebaseUser = {
          _id: decodedToken.uid,
          username: decodedToken.email || decodedToken.uid,
          role: 'manufacturer', // Default role, could be customized based on custom claims
          entityName: decodedToken.name || 'Firebase User'
        };

        // Generate JWT token for backend services compatibility
        const token = jwt.sign(
          { 
            userId: firebaseUser._id, 
            username: firebaseUser.username, 
            role: firebaseUser.role,
            firebase: true,
            firebaseUid: decodedToken.uid
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
          { 
            userId: firebaseUser._id, 
            username: firebaseUser.username, 
            type: 'refresh',
            firebase: true
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        const responseData = {
          token,
          refreshToken,
          user: firebaseUser
        };

        console.log(`Firebase login successful for ${firebaseUser.username} (${provider || 'email'})`);

        return NextResponse.json(responseData, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      } catch (firebaseError) {
        console.error('Firebase ID token verification failed:', firebaseError);
        return NextResponse.json(
          { error: 'Invalid Firebase ID token' },
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

    // Demo mode bypass
    if (DEMO_MODE) {
      const demoUser = DEMO_USERS.find(user => 
        user.username === username && user.password === password
      );

      if (demoUser) {
        // Generate JWT token for demo user
        const token = jwt.sign(
          { 
            userId: demoUser._id, 
            username: demoUser.username, 
            role: demoUser.role 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
          { 
            userId: demoUser._id, 
            username: demoUser.username, 
            type: 'refresh' 
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        const responseData = {
          token,
          refreshToken,
          user: {
            _id: demoUser._id,
            username: demoUser.username,
            role: demoUser.role,
            entityName: demoUser.entityName
          }
        };

        console.log(`Demo login successful for ${username} (${demoUser.role})`);

        return NextResponse.json(responseData, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid demo credentials. Use: mfg1/demo123, sup1/demo123, phm1/demo123, or admin/admin123' },
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
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Authentication failed' },
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
    console.error('Auth API error:', error);
    
    // If in demo mode and auth service fails, provide helpful error
    if (DEMO_MODE) {
      return NextResponse.json(
        { error: 'Demo mode active. Use demo credentials: mfg1/demo123, sup1/demo123, phm1/demo123, or admin/admin123' },
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
