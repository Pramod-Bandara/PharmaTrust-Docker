'use client';

import React from 'react';
import { EnvironmentalData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets } from 'lucide-react';

interface RealtimeChartProps {
  data: EnvironmentalData[];
  type: 'temperature' | 'humidity';
  title: string;
  unit: string;
  safeRange: { min: number; max: number };
}

const RealtimeChart = ({ data, type, title, unit, safeRange }: RealtimeChartProps) => {
  // Get last 50 readings for the chart
  const chartData = data
    .filter(d => d[type] !== undefined)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-50);

  const Icon = type === 'temperature' ? Thermometer : Droplets;
  const iconColor = type === 'temperature' ? 'text-red-500' : 'text-blue-500';

  // Calculate chart dimensions
  const chartWidth = 400;
  const chartHeight = 200;
  const padding = 40;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>Real-time monitoring chart</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate min/max values for scaling
  const values = chartData.map(d => d[type]);
  const minValue = Math.min(...values, safeRange.min - 5);
  const maxValue = Math.max(...values, safeRange.max + 5);
  const valueRange = maxValue - minValue;

  // Generate SVG path for the line chart
  const pathData = chartData.map((point, index) => {
    const x = padding + (index / (chartData.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((point[type] - minValue) / valueRange) * (chartHeight - 2 * padding);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate points for anomalies
  const anomalyPoints = chartData
    .map((point, index) => ({
      ...point,
      x: padding + (index / (chartData.length - 1)) * (chartWidth - 2 * padding),
      y: chartHeight - padding - ((point[type] - minValue) / valueRange) * (chartHeight - 2 * padding),
    }))
    .filter(point => point.isAnomaly);

  // Safe range visualization
  const safeRangeTop = chartHeight - padding - ((safeRange.max - minValue) / valueRange) * (chartHeight - 2 * padding);
  const safeRangeBottom = chartHeight - padding - ((safeRange.min - minValue) / valueRange) * (chartHeight - 2 * padding);

  const currentValue = chartData[chartData.length - 1]?.[type];
  const isCurrentAnomalous = currentValue < safeRange.min || currentValue > safeRange.max;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            <span>{title}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-lg font-bold ${isCurrentAnomalous ? 'text-red-600' : 'text-green-600'}`}>
              {currentValue?.toFixed(1)}{unit}
            </span>
            {isCurrentAnomalous && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                OUT OF RANGE
              </span>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Safe range: {safeRange.min}{unit} - {safeRange.max}{unit}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg width={chartWidth} height={chartHeight} className="border rounded">
            {/* Safe range background */}
            <rect
              x={padding}
              y={safeRangeTop}
              width={chartWidth - 2 * padding}
              height={safeRangeBottom - safeRangeTop}
              fill="rgba(34, 197, 94, 0.1)"
              stroke="rgba(34, 197, 94, 0.3)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + ratio * (chartHeight - 2 * padding);
              const value = maxValue - ratio * valueRange;
              return (
                <g key={ratio}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding - 5}
                    y={y + 4}
                    fontSize="10"
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {value.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Main line chart */}
            <path
              d={pathData}
              fill="none"
              stroke={type === 'temperature' ? '#ef4444' : '#3b82f6'}
              strokeWidth="2"
            />

            {/* Data points */}
            {chartData.map((point, index) => {
              const x = padding + (index / (chartData.length - 1)) * (chartWidth - 2 * padding);
              const y = chartHeight - padding - ((point[type] - minValue) / valueRange) * (chartHeight - 2 * padding);
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={point.isAnomaly ? '#dc2626' : (type === 'temperature' ? '#ef4444' : '#3b82f6')}
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}

            {/* Anomaly highlights */}
            {anomalyPoints.map((point, index) => (
              <circle
                key={`anomaly-${index}`}
                cx={point.x}
                cy={point.y}
                r="6"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                opacity="0.7"
              />
            ))}

            {/* Time labels */}
            {chartData.length > 1 && [0, Math.floor(chartData.length / 2), chartData.length - 1].map((index) => {
              const x = padding + (index / (chartData.length - 1)) * (chartWidth - 2 * padding);
              const time = new Date(chartData[index].timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              return (
                <text
                  key={index}
                  x={x}
                  y={chartHeight - 10}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {time}
                </text>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded-full ${type === 'temperature' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <span>Normal Reading</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Anomaly</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-green-400 opacity-50"></div>
              <span>Safe Range</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeChart;
