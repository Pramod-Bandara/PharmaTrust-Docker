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
  AlertTriangle,
  CheckCircle,
  Shield,
  TruckIcon,
  Filter,
} from "lucide-react";

interface SimpleBatchListProps {
  batches: MedicineBatch[];
  title?: string;
  description?: string;
  onBatchSelect?: (batch: MedicineBatch) => void;
  onTransfer?: (batch: MedicineBatch) => void;
  showTransferButton?: boolean;
  emptyMessage?: string;
  showFilters?: boolean;
}

const SimpleBatchList = ({
  batches,
  title = "Medicine Batches",
  description = "View and manage medicine batches",
  onBatchSelect,
  onTransfer,
  showTransferButton = false,
  emptyMessage = "No batches available",
  showFilters = true,
}: SimpleBatchListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filter batches
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

  const canTransfer = (batch: MedicineBatch) => {
    return batch.currentStage !== "customer";
  };

  const stages = ["all", "manufacturer", "supplier", "pharmacist", "customer"];
  const qualityStatuses = ["all", "good", "compromised", "unknown"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>{title}</span>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {filteredBatches.length} of {batches.length} batches
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by batch ID, name, or manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && showFilterPanel && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md">
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

            {(searchTerm || stageFilter !== "all" || qualityFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStageFilter("all");
                  setQualityFilter("all");
                }}
                className="text-sm"
              >
                Clear All
              </Button>
            )}
          </div>
        )}

        {/* Batch List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || stageFilter !== "all" || qualityFilter !== "all"
                  ? "No batches match your criteria"
                  : emptyMessage}
              </h3>
              <p className="text-gray-500 text-sm">
                {searchTerm || stageFilter !== "all" || qualityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Batches will appear here once they are available"}
              </p>
            </div>
          ) : (
            filteredBatches.map((batch) => (
              <div
                key={batch._id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center space-x-3">
                      <h3 className="text-base font-semibold text-gray-900">
                        {batch.name}
                      </h3>
                      <Badge variant="outline" className="text-xs font-mono">
                        {batch.batchId}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4" />
                        <span>{batch.medicineType}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Created: {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {batch.quantity && (
                        <div className="flex items-center space-x-1">
                          <span>
                            Qty: {batch.quantity} {batch.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getStatusColor(batch.qualityStatus)}>
                        {batch.qualityStatus === "good" && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {batch.qualityStatus === "compromised" && (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {batch.qualityStatus.toUpperCase()}
                      </Badge>

                      <Badge className={getStageColor(batch.currentStage)}>
                        {batch.currentStage.toUpperCase()}
                      </Badge>

                      {batch.blockchainHash && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          VERIFIED
                        </Badge>
                      )}
                    </div>

                    {/* Supply Chain Progress Indicator */}
                    <div className="flex items-center space-x-1">
                      {["manufacturer", "supplier", "pharmacist", "customer"].map(
                        (stage, index) => {
                          const isCompleted = batch.supplyChain.some(
                            (entry) => entry.stage === stage
                          );
                          const isCurrent = batch.currentStage === stage;

                          return (
                            <div key={stage} className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isCompleted
                                    ? "bg-green-500"
                                    : isCurrent
                                      ? "bg-blue-500"
                                      : "bg-gray-300"
                                }`}
                              />
                              {index < 3 && (
                                <div
                                  className={`w-8 h-0.5 ${
                                    batch.supplyChain.length > index + 1
                                      ? "bg-green-500"
                                      : "bg-gray-300"
                                  }`}
                                />
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    {onBatchSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onBatchSelect(batch)}
                        className="whitespace-nowrap"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    {showTransferButton &&
                      onTransfer &&
                      canTransfer(batch) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTransfer(batch)}
                          className="whitespace-nowrap text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <TruckIcon className="h-4 w-4 mr-2" />
                          Transfer
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Statistics */}
        {filteredBatches.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-green-600">
                  {filteredBatches.filter((b) => b.qualityStatus === "good").length}
                </div>
                <div className="text-xs text-gray-600">Good Quality</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {
                    filteredBatches.filter((b) => b.qualityStatus === "compromised")
                      .length
                  }
                </div>
                <div className="text-xs text-gray-600">Compromised</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {filteredBatches.filter((b) => b.blockchainHash).length}
                </div>
                <div className="text-xs text-gray-600">Verified</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">
                  {new Set(filteredBatches.map((b) => b.manufacturerId)).size}
                </div>
                <div className="text-xs text-gray-600">Manufacturers</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleBatchList;
