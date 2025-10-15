import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Path to the mobile App.tsx file
    const mobileAppPath = path.join(process.cwd(), '..', 'mobile', 'App.tsx');

    // Check if file exists and read it
    try {
      const appCode = await fs.readFile(mobileAppPath, 'utf-8');

      // Also read package.json for dependencies
      const packageJsonPath = path.join(process.cwd(), '..', 'mobile', 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      return NextResponse.json({
        success: true,
        data: {
          appCode,
          dependencies: packageJson.dependencies || {},
          name: packageJson.name || 'pharmatrust-mobile',
          version: packageJson.version || '1.0.0',
        }
      });
    } catch (fileError) {
      console.error('Error reading mobile app files:', fileError);

      // Return a fallback/demo version if the actual file can't be read
      const fallbackCode = `import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_BASE = 'http://localhost:3000';

export default function App() {
  const [batchId, setBatchId] = useState('');
  const [result, setResult] = useState(null);

  const verify = async () => {
    try {
      const res = await fetch(\`\${API_BASE}/api/mobile/verify?batchId=\${encodeURIComponent(batchId)}\`);
      const json = await res.json();
      if (json.success && json.data) setResult(json.data);
    } catch (e) {
      console.error('Verification failed:', e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.header}>PharmaTrust</Text>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%' }}>
        <TextInput
          value={batchId}
          onChangeText={setBatchId}
          placeholder="Enter Batch ID"
          style={styles.input}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={verify}>
          <Text style={styles.buttonText}>Verify</Text>
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.card}>
          <Text style={styles.title}>Batch {result.batchId}</Text>
          <Text style={styles.text}>Status: {result.qualityStatus}</Text>
          <Text style={styles.text}>Authenticity: {result.authenticity}</Text>
        </View>
      )}

      <Text style={styles.footer}>PharmaTrust Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    gap: 16
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8
  },
  button: {
    backgroundColor: '#2E86AB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
    width: '100%'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121'
  },
  text: {
    color: '#6C757D'
  },
  footer: {
    marginTop: 16,
    color: '#6C757D',
    fontSize: 12
  }
});`;

      return NextResponse.json({
        success: true,
        data: {
          appCode: fallbackCode,
          dependencies: {
            "expo": "~50.0.0",
            "react": "18.2.0",
            "react-native": "0.73.6"
          },
          name: 'pharmatrust-mobile',
          version: '1.0.0',
          isFallback: true,
          message: 'Using fallback demo code. Mobile app source not accessible.'
        }
      });
    }
  } catch (error) {
    console.error('Mobile app code API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mobile app code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, autoSave = false } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    // In development mode, optionally save the code back to the file
    if (autoSave && process.env.NODE_ENV === 'development') {
      const mobileAppPath = path.join(process.cwd(), '..', 'mobile', 'App.tsx');

      try {
        await fs.writeFile(mobileAppPath, code, 'utf-8');

        return NextResponse.json({
          success: true,
          message: 'Mobile app code updated successfully',
          savedAt: new Date().toISOString()
        });
      } catch (writeError) {
        console.error('Error writing mobile app file:', writeError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to save mobile app code',
            details: writeError instanceof Error ? writeError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Code validated successfully (not saved in production)',
      autoSave: false
    });
  } catch (error) {
    console.error('Mobile app code update API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process mobile app code update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
