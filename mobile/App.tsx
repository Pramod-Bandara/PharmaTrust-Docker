import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { BarCodeScanner } from 'expo-barcode-scanner';

const API_BASE = Platform.select({ ios: 'http://localhost:3000', android: 'http://10.0.2.2:3000', default: 'http://localhost:3000' });
const MOBILE_API = `${API_BASE}/api/mobile`;

type VerifyResponse = {
  success: boolean;
  data?: {
    batchId: string;
    name?: string;
    qualityStatus?: 'good' | 'compromised' | 'unknown';
    currentStage?: string;
    lastTemperature?: number | null;
    lastHumidity?: number | null;
    lastTimestamp?: string | null;
    authenticity: 'Authentic' | 'Suspicious';
  };
  error?: string;
};

const tokens = {
  colors: {
    primary: '#2E86AB',
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    neutral: '#6C757D',
    bg: '#ffffff',
    text: '#212121'
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: 8
};

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse['data'] | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  // No persistence per brief; do not read cached results

  // No biometric per brief

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const parsed = JSON.parse(data);
      if (parsed.batchId) {
        setBatchId(parsed.batchId);
        await verify(parsed.batchId);
      } else {
        Alert.alert('Invalid QR', 'QR does not contain batchId');
      }
    } catch {
      setBatchId(data);
      await verify(data);
    }
  };

  const verify = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${MOBILE_API}/verify?batchId=${encodeURIComponent(id)}`);
      const json: VerifyResponse = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      if (json.data) setResult(json.data);
    } catch (e: any) {
      Alert.alert('Verification failed', e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const content = useMemo(() => {
    if (loading) return <ActivityIndicator size="large" color={tokens.colors.primary} />;
    if (!result) return <Text style={styles.muted}>Scan a QR or enter a Batch ID to verify.</Text>;
    const badgeColor = result.authenticity === 'Authentic' ? tokens.colors.success : tokens.colors.error;
    return (
      <View style={{ gap: tokens.spacing.md }}>
        <Text style={styles.title}>Batch {result.batchId}</Text>
        <View style={[styles.badge, { borderColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{result.authenticity}</Text>
        </View>
        <View style={styles.card}>
          <Row label="Name" value={result.name || '—'} />
          <Row label="Stage" value={result.currentStage || '—'} />
          <Row label="Quality" value={result.qualityStatus || 'unknown'} />
          <Row label="Temp" value={result.lastTemperature != null ? `${result.lastTemperature}°C` : '—'} />
          <Row label="Humidity" value={result.lastHumidity != null ? `${result.lastHumidity}%` : '—'} />
          <Row label="Last Update" value={result.lastTimestamp ? new Date(result.lastTimestamp).toLocaleString() : '—'} />
        </View>
      </View>
    );
  }, [loading, result]);

  if (hasPermission === null) return <View style={styles.container}><Text>Requesting camera permission…</Text></View>;
  if (hasPermission === false) return <View style={styles.container}><Text>No access to camera</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.header}>PharmaTrust</Text>

      <View style={{ flexDirection: 'row', gap: tokens.spacing.sm, alignItems: 'center' }}>
        <TextInput
          value={batchId}
          onChangeText={setBatchId}
          placeholder="Enter Batch ID"
          style={styles.input}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={() => verify(batchId)}>
          <Text style={styles.buttonText}>Verify</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setScanning(s => !s)}>
        <Text style={styles.secondaryButtonText}>{scanning ? 'Close Scanner' : 'Scan QR'}</Text>
      </TouchableOpacity>

      {scanning && (
        <View style={{ height: 280, borderRadius: tokens.radius, overflow: 'hidden', marginTop: tokens.spacing.md }}>
          <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={{ width: '100%', height: '100%' }} />
        </View>
      )}

      <View style={{ marginTop: tokens.spacing.lg, width: '100%' }}>
        {content}
      </View>

      <Text style={styles.footer}>Connected: {MOBILE_API}</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: tokens.colors.bg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: tokens.colors.text
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: tokens.radius,
    padding: tokens.spacing.sm
  },
  button: {
    backgroundColor: tokens.colors.primary,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#eef6fb',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius,
    alignSelf: 'flex-start'
  },
  secondaryButtonText: {
    color: tokens.colors.primary,
    fontWeight: '600'
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: tokens.radius,
    padding: tokens.spacing.md,
    backgroundColor: '#fff',
    gap: tokens.spacing.sm
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rowLabel: {
    color: tokens.colors.neutral
  },
  rowValue: {
    color: tokens.colors.text,
    fontWeight: '600'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text
  },
  badge: {
    borderWidth: 1,
    borderRadius: tokens.radius,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start'
  },
  badgeText: {
    fontWeight: '700'
  },
  muted: {
    color: tokens.colors.neutral
  },
  footer: {
    marginTop: tokens.spacing.md,
    color: tokens.colors.neutral
  }
});


