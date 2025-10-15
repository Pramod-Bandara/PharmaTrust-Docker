"use client";

import React, { useState } from "react";
import { MedicineBatch } from "@/types";
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
import {
  Package,
  Search,
  Eye,
  Calendar,
  Building,
  AlertTriangle,
  CheckCircle,
  Shield,
  TruckIcon,
} from "lucide-react";
import TransferBatchModal from "./TransferBatchModal";

interface BatchManagementCardProps {
  batches: MedicineBatch[];
  onBatchSelect: (batch: MedicineBatch) => void;
  onRefresh: () => void;
}

const BatchManagementCard = ({
  batches,
  onBatchSelect,
  onRefresh,
}: BatchManagementCardProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [transferBatch, setTransferBatch] = useState<MedicineBatch | null>(
    null,
  );

  // Filter batches based on search and filters
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.manufacturerId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage =
      stageFilter === "all" || batch.currentStage === stageFilter;
    const matchesQuality =
      qualityFilter === "all" || batch.qualityStatus === qualityFilter;

    return matchesSearch && matchesStage && matchesQuality;
  });

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

  const stages = ["all", "manufacturer", "supplier", "pharmacist", "customer"];
  const qualityStatuses = ["all", "good", "compromised", "unknown"];

  const handleTransferComplete = (updatedBatch: MedicineBatch) => {
    setTransferBatch(null);
    onRefresh();
  };

  const canTransfer = (batch: MedicineBatch) => {
    // Can only transfer if not at final stage
    return batch.currentStage !== "customer";
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Batch Management</span>
            </div>
            <Badge variant="outline">
              {filteredBatches.length} of {batches.length} batches
            </Badge>
          </CardTitle>
          <CardDescription>
            Search, filter, and manage all medicine batches in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by batch ID, medicine name, or manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage === "all"
                      ? "All Stages"
                      : stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {qualityStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "all"
                      ? "All Quality"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ||
                  stageFilter !== "all" ||
                  qualityFilter !== "all"
                    ? "No batches match your criteria"
                    : "No batches available"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ||
                  stageFilter !== "all" ||
                  qualityFilter !== "all"
                    ? "Try adjusting your search terms or filters to find batches."
                    : "No medicine batches have been created yet. Create your first batch to get started."}
                </p>
                {(searchTerm ||
                  stageFilter !== "all" ||
                  qualityFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStageFilter("all");
                      setQualityFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              filteredBatches.map((batch) => (
                <div
                  key={batch._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{batch.name}</h3>
                        <Badge variant="outline" className="break-all max-w-xs">
                          {batch.batchId}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>Manufacturer: {batch.manufacturerId}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Created:{" "}
                            {new Date(batch.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(batch.qualityStatus)}>
                          {batch.qualityStatus === "good" && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {batch.qualityStatus === "compromised" && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {batch.qualityStatus === "unknown" && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {batch.qualityStatus.toUpperCase()}
                        </Badge>

                        <Badge className={getStageColor(batch.currentStage)}>
                          {batch.currentStage.toUpperCase()}
                        </Badge>

                        {batch.blockchainHash && (
                          <Badge className="bg-green-100 text-green-800">
                            <Shield className="h-3 w-3 mr-1" />
                            BLOCKCHAIN VERIFIED
                          </Badge>
                        )}
                      </div>

                      {/* Supply Chain Progress */}
                      <div className="mt-3">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Supply Chain Progress:</span>
                          <div className="flex items-center space-x-1">
                            {[
                              "manufacturer",
                              "supplier",
                              "pharmacist",
                              "customer",
                            ].map((stage, index) => {
                              const isCompleted = batch.supplyChain.some(
                                (entry) => entry.stage === stage,
                              );
                              const isCurrent = batch.currentStage === stage;

                              return (
                                <div key={stage} className="flex items-center">
                                  <div
                                    className={`w-3 h-3 rounded-full border-2 ${
                                      isCompleted
                                        ? "bg-green-500 border-green-500"
                                        : isCurrent
                                          ? "bg-blue-500 border-blue-500"
                                          : "bg-gray-200 border-gray-300"
                                    }`}
                                  />
                                  {index < 3 && (
                                    <div
                                      className={`w-4 h-0.5 ${
                                        batch.supplyChain.length > index + 1
                                          ? "bg-green-500"
                                          : "bg-gray-300"
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {canTransfer(batch) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransferBatch(batch)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <TruckIcon className="h-4 w-4 mr-2" />
                          Transfer
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onBatchSelect(batch)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary Stats */}
          {filteredBatches.length > 0 && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {
                      filteredBatches.filter((b) => b.qualityStatus === "good")
                        .length
                    }
                  </div>
                  <div className="text-xs text-gray-600">Good Quality</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {
                      filteredBatches.filter(
                        (b) => b.qualityStatus === "compromised",
                      ).length
                    }
                  </div>
                  <div className="text-xs text-gray-600">Compromised</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {filteredBatches.filter((b) => b.blockchainHash).length}
                  </div>
                  <div className="text-xs text-gray-600">
                    Blockchain Verified
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {new Set(filteredBatches.map((b) => b.manufacturerId)).size}
                  </div>
                  <div className="text-xs text-gray-600">Manufacturers</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Transfer Modal */}
        {transferBatch && (
          <TransferBatchModal
            isOpen={!!transferBatch}
            onClose={() => setTransferBatch(null)}
            batch={transferBatch}
            onTransferComplete={handleTransferComplete}
          />
        )}
      </Card>
    </>
  );
};

export default BatchManagementCard;
