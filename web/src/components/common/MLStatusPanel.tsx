"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EnvironmentalData, MedicineBatch } from "@/types";
import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarClock,
  Database,
  ListTree,
  RefreshCw,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export interface MLStatistics {
  totalBatches: number;
  totalReadings: number;
  adaptiveThresholds: number;
  averageConfidence: number;
  medicineModels: string[];
}

interface BatchStatisticsPayload {
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
}

export interface BatchStatistics {
  batchId: string;
  stats: BatchStatisticsPayload;
}

export interface MLLogEntry extends EnvironmentalData {
  confidence?: number;
  mlReasons?: {
    temperature?: boolean;
    humidity?: boolean;
    suddenChange?: boolean;
    gradualDrift?: boolean;
    pattern?: string;
  };
  prediction?: {
    nextTemperature?: number;
    nextHumidity?: number;
    riskLevel?: number;
  };
}

interface MLStatusPanelProps {
  selectedBatchId: string;
  batches: MedicineBatch[];
  onBatchChange: (batchId: string) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  loading: boolean;
  lastUpdated: Date;
  mlStats: MLStatistics | null;
  mlBatchStats: BatchStatistics | null;
  mlError: string | null;
  logs: MLLogEntry[];
  showRefreshControls?: boolean;
}

const severityTone: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-orange-100 text-orange-800 border-orange-200",
  UNKNOWN: "bg-gray-100 text-gray-800 border-gray-200",
};

const formatSeverity = (severity?: string | null) => {
  if (!severity) return "UNKNOWN";
  return severity.toUpperCase();
};

const formatConfidence = (confidence?: number) => {
  if (typeof confidence !== "number") return "—";
  return `${Math.round(confidence * 100)}%`;
};

const formatRisk = (risk?: number) => {
  if (typeof risk !== "number") return "—";
  return `${Math.round(risk * 100)}%`;
};

const ControlPanel = ({
  selectedBatchId,
  batches,
  onBatchChange,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  loading,
  lastUpdated,
  showRefreshControls = false,
}: Pick<
  MLStatusPanelProps,
  | "selectedBatchId"
  | "batches"
  | "onBatchChange"
  | "autoRefresh"
  | "onToggleAutoRefresh"
  | "onRefresh"
  | "loading"
  | "lastUpdated"
  | "showRefreshControls"
>) => {
  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" />
          <span>ML Control Panel</span>
        </CardTitle>
        <CardDescription>
          Configure machine learning monitoring settings and select batches for
          focused analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="text-sm text-muted-foreground">Focused batch</label>
          <select
            className="border rounded px-2 py-2 text-sm min-w-[220px]"
            value={selectedBatchId}
            onChange={(event) => onBatchChange(event.target.value)}
          >
            <option value="">All monitored batches</option>
            {batches.map((batch) => (
              <option key={batch._id} value={batch.batchId}>
                {batch.name} ({batch.batchId})
              </option>
            ))}
          </select>
        </div>

        {showRefreshControls && (
          <div className="flex items-center gap-3">
            <Badge
              className={
                autoRefresh
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }
            >
              <Activity className="h-4 w-4 mr-1" />
              Auto refresh {autoRefresh ? "ON" : "OFF"}
            </Badge>
            <Button variant="outline" size="sm" onClick={onToggleAutoRefresh}>
              {autoRefresh ? "Pause" : "Resume"}
            </Button>
            <Button size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh now
            </Button>
          </div>
        )}

        <div className="flex items-center text-xs text-muted-foreground">
          <CalendarClock className="h-4 w-4 mr-2" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

const StatusSection = ({
  mlStats,
  mlBatchStats,
  mlError,
  loading,
  selectedBatchId,
}: Pick<
  MLStatusPanelProps,
  "mlStats" | "mlBatchStats" | "mlError" | "loading" | "selectedBatchId"
>) => {
  const confidenceTone = useMemo(() => {
    if (!mlStats) return "text-gray-600";
    if (mlStats.averageConfidence >= 0.8) return "text-green-600";
    if (mlStats.averageConfidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  }, [mlStats]);

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Brain className="h-5 w-5 text-purple-600" />
          <span>ML Status Overview</span>
        </CardTitle>
        <CardDescription>
          Monitor machine learning model performance and anomaly detection
          across all batches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mlError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{mlError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-blue-50/60 p-4">
            <div className="flex items-center justify-between text-sm text-blue-700">
              <span>Total batches</span>
              <Database className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-blue-900">
              {mlStats?.totalBatches ?? (loading ? "…" : "0")}
            </div>
          </div>

          <div className="rounded-lg border bg-green-50/60 p-4">
            <div className="flex items-center justify-between text-sm text-green-700">
              <span>Readings processed</span>
              <Signal className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-green-900">
              {mlStats
                ? mlStats.totalReadings.toLocaleString()
                : loading
                  ? "…"
                  : "0"}
            </div>
          </div>

          <div className="rounded-lg border bg-purple-50/60 p-4">
            <div className="flex items-center justify-between text-sm text-purple-700">
              <span>Adaptive models</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-purple-900">
              {mlStats?.adaptiveThresholds ?? (loading ? "…" : "0")}
            </div>
          </div>

          <div className="rounded-lg border bg-orange-50/60 p-4">
            <div className="flex items-center justify-between text-sm text-orange-700">
              <span>Avg confidence</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className={`mt-2 text-2xl font-semibold ${confidenceTone}`}>
              {mlStats
                ? `${Math.round(mlStats.averageConfidence * 100)}%`
                : loading
                  ? "…"
                  : "—"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="border border-dashed bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <ListTree className="h-4 w-4 text-indigo-600" />
                <span>Medicine models</span>
              </CardTitle>
              <CardDescription>
                Configured tolerance profiles from the ML service.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {mlStats?.medicineModels?.length ? (
                mlStats.medicineModels.map((model) => (
                  <Badge
                    key={model}
                    variant="outline"
                    className="text-xs uppercase tracking-wide"
                  >
                    {model}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No models reported.
                </span>
              )}
            </CardContent>
          </Card>

          <Card className="border border-dashed bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Focused batch insight</span>
              </CardTitle>
              <CardDescription>
                Adaptive thresholds and anomaly rate for the selected batch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mlBatchStats ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Total readings
                    </span>
                    <span className="font-medium">
                      {mlBatchStats.stats.totalReadings}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Anomaly rate</span>
                    <span
                      className={`font-medium ${
                        mlBatchStats.stats.anomalyRate > 0.2
                          ? "text-red-600"
                          : mlBatchStats.stats.anomalyRate > 0.1
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {Math.round(mlBatchStats.stats.anomalyRate * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Avg temperature
                    </span>
                    <span className="font-medium">
                      {mlBatchStats.stats.averageTemperature}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg humidity</span>
                    <span className="font-medium">
                      {mlBatchStats.stats.averageHumidity}%
                    </span>
                  </div>
                </div>
              ) : selectedBatchId ? (
                <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
                  <span>
                    No ML data available for this batch yet. Environmental
                    readings are needed to generate statistics.
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Select a batch to view adaptive thresholds and model
                  statistics.
                </span>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

const LogsPanel = ({ logs }: Pick<MLStatusPanelProps, "logs">) => {
  const displayed = useMemo(() => {
    return [...logs]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 8);
  }, [logs]);

  if (displayed.length === 0) {
    return (
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <TrendingDown className="h-5 w-5 text-amber-600" />
            <span>ML event log</span>
          </CardTitle>
          <CardDescription>
            Recent anomaly classifications and severity breakdowns.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Machine learning logs will appear here once readings are received.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <TrendingDown className="h-5 w-5 text-amber-600" />
          <span>ML event log</span>
        </CardTitle>
        <CardDescription>
          Recent anomaly classifications and severity breakdowns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayed.map((log) => {
          const severity = formatSeverity(log.severity);
          const reasons = log.mlReasons || {};

          return (
            <div
              key={`${log._id}-${log.timestamp}`}
              className="rounded border p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    className={severityTone[severity] || severityTone.UNKNOWN}
                  >
                    {severity}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    Device {log.deviceId}
                  </span>
                  {log.batchId && (
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {log.batchId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Temperature</span>
                  <span className="font-medium">{log.temperature}°C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Humidity</span>
                  <span className="font-medium">{log.humidity}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">
                    {formatConfidence(log.confidence)}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">
                    Reasons:
                  </span>
                  <div className="mt-2 grid gap-2">
                    <span className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${reasons.temperature ? "text-red-500" : "text-muted-foreground"}`}
                      />
                      Temperature deviation
                    </span>
                    <span className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${reasons.humidity ? "text-blue-500" : "text-muted-foreground"}`}
                      />
                      Humidity deviation
                    </span>
                    <span className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${reasons.suddenChange ? "text-orange-500" : "text-muted-foreground"}`}
                      />
                      Sudden change detected
                    </span>
                    <span className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${reasons.gradualDrift ? "text-amber-500" : "text-muted-foreground"}`}
                      />
                      Gradual drift detected
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    Forecast:
                  </span>
                  <div className="mt-2 space-y-1">
                    <div>
                      <span className="text-muted-foreground">Next temp:</span>{" "}
                      <span className="font-medium">
                        {log.prediction?.nextTemperature ?? "—"}
                        {typeof log.prediction?.nextTemperature === "number"
                          ? "°C"
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Next humidity:
                      </span>{" "}
                      <span className="font-medium">
                        {log.prediction?.nextHumidity ?? "—"}
                        {typeof log.prediction?.nextHumidity === "number"
                          ? "%"
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risk level:</span>{" "}
                      <span className="font-medium">
                        {formatRisk(log.prediction?.riskLevel)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pattern:</span>{" "}
                      <span className="font-medium">
                        {reasons.pattern
                          ? reasons.pattern.replace(/_/g, " ")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const MLStatusPanel = (props: MLStatusPanelProps) => {
  const { logs } = props;
  const anomalies = useMemo(() => logs.filter((log) => log.isAnomaly), [logs]);

  return (
    <div className="space-y-6">
      <ControlPanel {...props} />
      <StatusSection {...props} />
      <LogsPanel logs={anomalies.length ? anomalies : logs} />
    </div>
  );
};

export default MLStatusPanel;
