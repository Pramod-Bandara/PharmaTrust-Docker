'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';

interface MLStatistics {
  totalBatches: number;
  totalReadings: number;
  adaptiveThresholds: number;
  averageConfidence: number;
  medicineModels: string[];
}

interface BatchStatistics {
  batchId: string;
  stats: {
    totalReadings: number;
    anomalyRate: number;
    averageTemperature: number;
    averageHumidity: number;
    temperatureRange: { min: number; max: number };
    humidityRange: { min: number; max: number };
    medicineModel: {
      name: string;
      temperatureRange: { min: number; max: number; optimal: number };
      humidityRange: { min: number; max: number; optimal: number };
    };
  };
}

const MLAnalyticsCard = () => {
  const [mlStats, setMLStats] = useState<MLStatistics | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMLStatistics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/iot/ml/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch ML statistics');
      }
      const data = await response.json();
      setMLStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchBatchStatistics = async () => {
    try {
      // Fetch statistics for some sample batches
      const sampleBatches = ['ASPIRIN_BATCH_001', 'INSULIN_BATCH_001', 'LISINOPRIL_BATCH_001'];
      const batchPromises = sampleBatches.map(async (batchId) => {
        try {
          const response = await fetch(`/api/iot/ml/batch/${batchId}/statistics`);
          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (err) {
          console.warn(`Failed to fetch stats for ${batchId}:`, err);
        }
        return null;
      });

      const results = await Promise.all(batchPromises);
      setBatchStats(results.filter(Boolean) as BatchStatistics[]);
    } catch (err) {
      console.error('Error fetching batch statistics:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMLStatistics(), fetchBatchStatistics()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([fetchMLStatistics(), fetchBatchStatistics()]);
  };

  const getAnomalyRateColor = (rate: number) => {
    if (rate > 0.2) return 'text-red-600';
    if (rate > 0.1) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>ML Analytics Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading ML analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ML System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>ML Analytics Dashboard</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mlStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{mlStats.totalBatches}</div>
                <div className="text-sm text-gray-600">Monitored Batches</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{mlStats.totalReadings.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Readings</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{mlStats.adaptiveThresholds}</div>
                <div className="text-sm text-gray-600">Adaptive Models</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className={`text-2xl font-bold ${getConfidenceColor(mlStats.averageConfidence)}`}>
                  {Math.round(mlStats.averageConfidence * 100)}%
                </div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              ML service not available or no data
            </div>
          )}

          {/* Medicine Models */}
          {mlStats?.medicineModels && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Available Medicine Models</h4>
              <div className="flex flex-wrap gap-2">
                {mlStats.medicineModels.map((model) => (
                  <Badge key={model} variant="outline" className="text-xs">
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch-Specific Analytics */}
      {batchStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Batch Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batchStats.map((batch) => (
                <div key={batch.batchId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 break-all max-w-xs">{batch.batchId}</h4>
                    <Badge variant="outline">{batch.stats.medicineModel.name}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Total Readings</div>
                      <div className="font-medium">{batch.stats.totalReadings}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Anomaly Rate</div>
                      <div className={`font-medium ${getAnomalyRateColor(batch.stats.anomalyRate)}`}>
                        {Math.round(batch.stats.anomalyRate * 100)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Temperature</div>
                      <div className="font-medium">{batch.stats.averageTemperature}°C</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Humidity</div>
                      <div className="font-medium">{batch.stats.averageHumidity}%</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Temp Range:</span> {batch.stats.temperatureRange.min}°C - {batch.stats.temperatureRange.max}°C
                        <br />
                        <span className="font-medium">Optimal:</span> {batch.stats.medicineModel.temperatureRange.optimal}°C
                      </div>
                      <div>
                        <span className="font-medium">Humidity Range:</span> {batch.stats.humidityRange.min}% - {batch.stats.humidityRange.max}%
                        <br />
                        <span className="font-medium">Optimal:</span> {batch.stats.medicineModel.humidityRange.optimal}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ML Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>ML Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Target className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Adaptive Thresholds</h4>
                <p className="text-sm text-gray-600">
                  Machine learning models that adapt to historical data patterns for each batch
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Pattern Recognition</h4>
                <p className="text-sm text-gray-600">
                  Detects sudden spikes, gradual drift, and threshold violations automatically
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Activity className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Time-Series Forecasting</h4>
                <p className="text-sm text-gray-600">
                  Predicts future environmental conditions and risk levels
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Medicine-Specific Models</h4>
                <p className="text-sm text-gray-600">
                  Customized tolerance models for different pharmaceutical products
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MLAnalyticsCard;
