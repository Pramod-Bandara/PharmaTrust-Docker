"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { MedicineBatch, EnvironmentalData } from "@/types";
import { useBatches } from "@/hooks/useBatches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Search,
  CheckCircle,
  AlertTriangle,
  Package,
  Scan,
  TrendingUp,
  ClipboardCheck,
  Activity,
  RefreshCw,
  DownloadCloud,
} from "lucide-react";
import BatchVerificationModal from "@/components/pharmacist/BatchVerificationModal";
import QRScannerModal from "@/components/common/QRScannerModal";
import SimpleBatchList from "@/components/common/SimpleBatchList";
import MLStatusPanel, {
  BatchStatistics,
  MLLogEntry,
  MLStatistics,
} from "@/components/common/MLStatusPanel";

interface ComplianceSummary {
  batchId: string;
  name: string;
  stage: MedicineBatch["currentStage"];
  blockchainStatus: "verified" | "not_recorded" | "verification_failed";
  blockchainSource?: string;
  qualityStatus: MedicineBatch["qualityStatus"];
  anomalies?: number;
  supplyChainCount: number;
  complianceStatus: "compliant" | "monitor" | "non_compliant";
  complianceScore: number;
  recommendation: string;
  lastChecked: string;
}

const complianceStatusClass = (
  status: ComplianceSummary["complianceStatus"],
) => {
  switch (status) {
    case "compliant":
      return "bg-green-100 text-green-800";
    case "monitor":
      return "bg-yellow-100 text-yellow-800";
    case "non_compliant":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const blockchainStatusClass = (
  status: ComplianceSummary["blockchainStatus"],
) => {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-800";
    case "not_recorded":
      return "bg-yellow-100 text-yellow-800";
    case "verification_failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const PharmacistDashboard = () => {
  const { user: _user } = useAuth();
  const { batches, loading, error, refetch } = useBatches();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(
    null,
  );
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [complianceSummaries, setComplianceSummaries] = useState<
    ComplianceSummary[]
  >([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState("");
  const [mlStats, setMlStats] = useState<MLStatistics | null>(null);
  const [mlBatchStats, setMlBatchStats] = useState<BatchStatistics | null>(
    null,
  );
  const [mlLogs, setMlLogs] = useState<MLLogEntry[]>([]);
  const [mlError, setMlError] = useState<string | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlLastUpdated, setMlLastUpdated] = useState(new Date());
  const [mlAutoRefresh, setMlAutoRefresh] = useState(true);
  const [mlSelectedBatchId, setMlSelectedBatchId] = useState("");

  const fetchMlStats = useCallback(async () => {
    try {
      setMlLoading(true);
      setMlError(null);

      const [statsResponse, logsResponse] = await Promise.all([
        fetch("/api/iot/ml/statistics"),
        fetch("/api/iot/readings?limit=100"),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setMlStats(statsData.stats ?? null);
      } else {
        const errData = await statsResponse.json().catch(() => ({}));
        setMlError(errData.error || "Failed to load ML statistics");
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        const normalizedLogs = Array.isArray(logsData)
          ? logsData
          : Array.isArray(
                (logsData as { items?: EnvironmentalData[] } | null)?.items,
              )
            ? (logsData as { items?: EnvironmentalData[] }).items
            : [];
        setMlLogs((normalizedLogs || []) as MLLogEntry[]);
      }

      setMlLastUpdated(new Date());
    } catch (err) {
      setMlError(
        err instanceof Error ? err.message : "Failed to load ML statistics",
      );
    } finally {
      setMlLoading(false);
    }
  }, []);

  const fetchBatchMlStats = useCallback(async (batchId: string) => {
    if (!batchId) {
      setMlBatchStats(null);
      return;
    }

    try {
      setMlError(null);
      const response = await fetch(
        `/api/iot/ml/batch/${encodeURIComponent(batchId)}/statistics`,
      );
      if (response.ok) {
        const data = await response.json();
        setMlBatchStats({ batchId: data.batchId, stats: data.stats });
      } else if (response.status === 404) {
        // Batch not found or no data yet - this is not an error condition
        setMlBatchStats(null);
        setMlError(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        setMlError(errData.error || "Failed to load batch ML statistics");
        setMlBatchStats(null);
      }
    } catch (err) {
      setMlError(
        err instanceof Error
          ? err.message
          : "Failed to load batch ML statistics",
      );
      setMlBatchStats(null);
    }
  }, []);

  const computeComplianceSummaries = useCallback(
    async (targetBatches: MedicineBatch[]) => {
      if (!targetBatches.length) {
        setComplianceSummaries([]);
        setComplianceError("");
        return;
      }

      setComplianceLoading(true);
      setComplianceError("");

      try {
        const summaries = await Promise.all(
          targetBatches.map(async (batch) => {
            try {
              const [blockchainResponse, iotResponse] = await Promise.all([
                batch.blockchainHash
                  ? apiClient.verifyBatch(batch.batchId)
                  : Promise.resolve(null),
                apiClient.getIoTReadings(batch.batchId, 30),
              ]);

              const blockchainStatus: ComplianceSummary["blockchainStatus"] =
                !batch.blockchainHash
                  ? "not_recorded"
                  : blockchainResponse &&
                      blockchainResponse.success &&
                      blockchainResponse.data?.isVerified
                    ? "verified"
                    : "verification_failed";

              const anomalies =
                iotResponse.success && Array.isArray(iotResponse.data)
                  ? iotResponse.data.filter((reading) => reading.isAnomaly)
                      .length
                  : undefined;

              let complianceScore = 0;
              complianceScore +=
                blockchainStatus === "verified"
                  ? 40
                  : blockchainStatus === "not_recorded"
                    ? 15
                    : 0;
              complianceScore +=
                batch.qualityStatus === "good"
                  ? 30
                  : batch.qualityStatus === "unknown"
                    ? 15
                    : 5;

              if (typeof anomalies === "number") {
                complianceScore +=
                  anomalies === 0 ? 15 : anomalies <= 2 ? 8 : 0;
              } else {
                complianceScore += 5;
              }

              complianceScore +=
                batch.supplyChain.length >= 3
                  ? 10
                  : batch.supplyChain.length > 0
                    ? 5
                    : 0;

              const complianceStatus: ComplianceSummary["complianceStatus"] =
                complianceScore >= 80
                  ? "compliant"
                  : complianceScore >= 60
                    ? "monitor"
                    : "non_compliant";

              const recommendation = (() => {
                switch (complianceStatus) {
                  case "compliant":
                    return "Meets DSCSA compliance requirements. Safe to dispense.";
                  case "monitor":
                    return "Monitor environmental trends and confirm blockchain records.";
                  default:
                    return "Requires investigation before dispensing. Generate formal report.";
                }
              })();

              return {
                batchId: batch.batchId,
                name: batch.name,
                stage: batch.currentStage,
                blockchainStatus,
                blockchainSource: blockchainResponse?.data?.source,
                qualityStatus: batch.qualityStatus,
                anomalies,
                supplyChainCount: batch.supplyChain.length,
                complianceStatus,
                complianceScore,
                recommendation,
                lastChecked: new Date().toISOString(),
              } satisfies ComplianceSummary;
            } catch (innerError) {
              console.error("Failed to build compliance summary", innerError);
              return {
                batchId: batch.batchId,
                name: batch.name,
                stage: batch.currentStage,
                blockchainStatus: "verification_failed" as const,
                qualityStatus: batch.qualityStatus,
                supplyChainCount: batch.supplyChain.length,
                complianceStatus: "non_compliant" as const,
                complianceScore: 25,
                recommendation:
                  "Compliance data unavailable. Re-run verification manually.",
                lastChecked: new Date().toISOString(),
              } satisfies ComplianceSummary;
            }
          }),
        );

        setComplianceSummaries(summaries);
      } catch (summaryError) {
        console.error("Compliance computation failed", summaryError);
        setComplianceError(
          "Failed to compute compliance summaries. Try refreshing.",
        );
        setComplianceSummaries([]);
      } finally {
        setComplianceLoading(false);
      }
    },
    [],
  );

  const downloadComplianceReport = useCallback(
    (targetSummaries: ComplianceSummary[]) => {
      if (!targetSummaries.length) {
        return;
      }

      const payload = {
        generatedAt: new Date().toISOString(),
        totalBatches: targetSummaries.length,
        compliantCount: targetSummaries.filter(
          (item) => item.complianceStatus === "compliant",
        ).length,
        monitorCount: targetSummaries.filter(
          (item) => item.complianceStatus === "monitor",
        ).length,
        nonCompliantCount: targetSummaries.filter(
          (item) => item.complianceStatus === "non_compliant",
        ).length,
        data: targetSummaries,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pharmacist-compliance-report.json";
      link.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const fetchBatches = useCallback(async () => {
    try {
      setComplianceError("");

      // Refresh batches using the centralized hook
      await refetch();
      // Note: batches will be updated by the hook, so we'll compute compliance summaries
      // in a separate effect that watches for batches changes
    } catch {
      setComplianceSummaries([]);
    }
  }, [refetch]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Separate effect to compute compliance summaries when batches change
  useEffect(() => {
    if (batches.length > 0) {
      computeComplianceSummaries(batches);
    }
  }, [batches, computeComplianceSummaries]);

  useEffect(() => {
    fetchMlStats();
  }, [fetchMlStats]);

  useEffect(() => {
    if (mlSelectedBatchId) {
      fetchBatchMlStats(mlSelectedBatchId);
    } else {
      setMlBatchStats(null);
    }
  }, [fetchBatchMlStats, mlSelectedBatchId]);

  useEffect(() => {
    if (!mlAutoRefresh) {
      return;
    }
    const interval = setInterval(() => {
      fetchMlStats();
      if (mlSelectedBatchId) {
        fetchBatchMlStats(mlSelectedBatchId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [mlAutoRefresh, mlSelectedBatchId, fetchMlStats, fetchBatchMlStats]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchBatches();
      return;
    }

    try {
      const response = await apiClient.getBatch(searchTerm.trim());

      if (response.success && response.data) {
        // Use the centralized hook to update batches
        await refetch();
        setComplianceError("");
        await computeComplianceSummaries([response.data]);
      } else {
        setComplianceSummaries([]);
        setComplianceError("No compliance data for the requested batch");
      }
    } catch {
      setComplianceSummaries([]);
      setComplianceError(
        "Unable to retrieve compliance data for the requested batch",
      );
    }
  };

  const handleQRScan = (batchId: string) => {
    setSearchTerm(batchId);
    setShowQRScanner(false);
    // Trigger search with the scanned batch ID
    setTimeout(() => handleSearch(), 100);
  };

  const filteredBatches = useMemo(() => {
    if (!searchTerm.trim()) {
      return batches;
    }

    const term = searchTerm.toLowerCase();
    return batches.filter(
      (batch) =>
        batch.batchId.toLowerCase().includes(term) ||
        batch.name.toLowerCase().includes(term),
    );
  }, [batches, searchTerm]);

  const visibleComplianceSummaries = useMemo(() => {
    if (!complianceSummaries.length) {
      return [] as ComplianceSummary[];
    }

    const visibleBatchIds = new Set(
      filteredBatches.map((batch) => batch.batchId),
    );
    return complianceSummaries.filter((summary) =>
      visibleBatchIds.has(summary.batchId),
    );
  }, [complianceSummaries, filteredBatches]);

  // Statistics
  const stats = {
    total: batches.length,
    verified: batches.filter((b) => b.blockchainHash).length,
    goodQuality: batches.filter((b) => b.qualityStatus === "good").length,
    compromised: batches.filter((b) => b.qualityStatus === "compromised")
      .length,
    atPharmacist: batches.filter((b) => b.currentStage === "pharmacist").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800";
      case "compromised":
        return "bg-red-100 text-red-800";
      case "unknown":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "manufacturer":
        return "bg-blue-100 text-blue-800";
      case "supplier":
        return "bg-purple-100 text-purple-800";
      case "pharmacist":
        return "bg-orange-100 text-orange-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !searchTerm) {
    return (
      <DashboardLayout title="Pharmacist Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Pharmacist Dashboard"
      subtitle="Verify medicine authenticity and quality before dispensing"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Available for verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Blockchain Verified
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.verified}
            </div>
            <p className="text-xs text-muted-foreground">
              Authenticity confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Good Quality</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.goodQuality}
            </div>
            <p className="text-xs text-muted-foreground">Safe for dispensing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.compromised}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Pharmacy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.atPharmacist}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for dispensing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ML Insights */}
      <div className="mb-8">
        <MLStatusPanel
          selectedBatchId={mlSelectedBatchId}
          batches={batches}
          onBatchChange={(id) => setMlSelectedBatchId(id)}
          autoRefresh={mlAutoRefresh}
          onToggleAutoRefresh={() => setMlAutoRefresh((prev) => !prev)}
          onRefresh={async () => {
            await fetchMlStats();
            if (mlSelectedBatchId) {
              await fetchBatchMlStats(mlSelectedBatchId);
            }
          }}
          loading={mlLoading}
          lastUpdated={mlLastUpdated}
          mlStats={mlStats}
          mlBatchStats={mlBatchStats}
          mlError={mlError}
          logs={mlLogs}
        />
      </div>

      {/* Search and Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Batch Verification</span>
          </CardTitle>
          <CardDescription>
            Search by batch ID or medicine name to verify authenticity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Enter batch ID or medicine name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={() => setShowQRScanner(true)}>
              <Scan className="h-4 w-4 mr-2" />
              Scan QR
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                fetchBatches();
              }}
            >
              Show All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Management - Using SimpleBatchList Component */}
      <SimpleBatchList
        batches={filteredBatches}
        title="Pharmacist Batch Verification"
        description="Medicine batches available for verification and compliance checking"
        onBatchSelect={setSelectedBatch}
        emptyMessage={
          searchTerm
            ? "No batches match your search"
            : "No medicine batches are currently available for verification"
        }
        showFilters={true}
      />

      {/* Compliance Reporting */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <ClipboardCheck className="h-5 w-5" />
              <span>Compliance Reporting</span>
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => computeComplianceSummaries(filteredBatches)}
                disabled={complianceLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadComplianceReport(visibleComplianceSummaries)
                }
                disabled={!visibleComplianceSummaries.length}
              >
                <DownloadCloud className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {complianceError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{complianceError}</AlertDescription>
            </Alert>
          )}

          {complianceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : visibleComplianceSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
              <Activity className="h-8 w-8 mb-3" />
              <p>
                No compliance data available for the current selection. Run a
                verification to populate this report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="py-3 text-left">Batch</th>
                    <th className="py-3 text-left">Stage</th>
                    <th className="py-3 text-left">Blockchain</th>
                    <th className="py-3 text-left">Quality</th>
                    <th className="py-3 text-left">Anomalies</th>
                    <th className="py-3 text-left">Supply Chain</th>
                    <th className="py-3 text-left">Compliance Status</th>
                    <th className="py-3 text-left">Score</th>
                    <th className="py-3 text-left">Recommendation</th>
                    <th className="py-3 text-left">Last Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleComplianceSummaries.map((summary) => (
                    <tr key={summary.batchId} className="hover:bg-muted/50">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{summary.name}</span>
                          <span className="text-xs text-muted-foreground font-mono break-all max-w-xs">
                            {summary.batchId}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge className={getStageColor(summary.stage)}>
                          {summary.stage.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge
                          className={blockchainStatusClass(
                            summary.blockchainStatus,
                          )}
                        >
                          {summary.blockchainStatus === "verified" &&
                            "VERIFIED"}
                          {summary.blockchainStatus === "not_recorded" &&
                            "NOT RECORDED"}
                          {summary.blockchainStatus === "verification_failed" &&
                            "FAILED"}
                        </Badge>
                        {summary.blockchainSource && (
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                            Source: {summary.blockchainSource}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge
                          className={getStatusColor(summary.qualityStatus)}
                        >
                          {summary.qualityStatus.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {typeof summary.anomalies === "number" ? (
                          <span
                            className={
                              summary.anomalies > 0
                                ? "text-red-600 font-semibold"
                                : "text-green-600"
                            }
                          >
                            {summary.anomalies}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span>{summary.supplyChainCount} stages</span>
                      </td>
                      <td className="py-3">
                        <Badge
                          className={complianceStatusClass(
                            summary.complianceStatus,
                          )}
                        >
                          {summary.complianceStatus
                            .replace("_", " ")
                            .toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className="font-medium">
                          {summary.complianceScore}
                        </span>
                      </td>
                      <td className="py-3 max-w-xs">
                        <p className="text-xs text-muted-foreground leading-snug">
                          {summary.recommendation}
                        </p>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(summary.lastChecked).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedBatch && (
        <BatchVerificationModal
          batch={selectedBatch}
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}
    </DashboardLayout>
  );
};

export default withAuth(PharmacistDashboard);
