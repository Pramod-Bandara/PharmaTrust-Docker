"use client";

import React, { useState } from "react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MedicineBatch } from "@/types";
import { useBatchesByManufacturer } from "@/hooks/useBatches";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Package,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import CreateBatchModal from "@/components/manufacturer/CreateBatchModal";
import BatchDetailsModal from "@/components/manufacturer/BatchDetailsModal";

const ManufacturerBatchesPage = () => {
  const { user } = useAuth();
  const { batches, loading, error, refetch } = useBatchesByManufacturer(
    user?.username || "",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterQuality, setFilterQuality] = useState<string>("all");

  const handleBatchCreated = (_newBatch: MedicineBatch) => {
    refetch();
    setShowCreateModal(false);
  };

  // Filter batches based on search and filters
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batchId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage =
      filterStage === "all" || batch.currentStage === filterStage;
    const matchesQuality =
      filterQuality === "all" || batch.qualityStatus === filterQuality;

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

  if (loading) {
    return (
      <DashboardLayout title="My Batches">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Batches"
      subtitle="View and manage all your medicine batches"
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by batch name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter by Stage */}
          <div className="sm:w-48">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Stages</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="supplier">Supplier</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Filter by Quality */}
          <div className="sm:w-48">
            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Quality Status</option>
              <option value="good">Good</option>
              <option value="compromised">Compromised</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredBatches.length} of {batches.length} batches
            </span>
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="grid gap-4">
        {filteredBatches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStage !== "all" || filterQuality !== "all"
                  ? "No batches match your filters"
                  : "No batches created yet"}
              </h3>
              <p className="text-gray-500 text-center mb-4">
                {searchTerm || filterStage !== "all" || filterQuality !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Start by creating your first medicine batch to track through the supply chain."}
              </p>
              {!searchTerm &&
                filterStage === "all" &&
                filterQuality === "all" && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Batch
                  </Button>
                )}
            </CardContent>
          </Card>
        ) : (
          filteredBatches.map((batch) => (
            <Card key={batch._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{batch.name}</h3>
                      <Badge variant="outline" className="break-all max-w-xs">
                        {batch.batchId}
                      </Badge>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Created:{" "}
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </div>
                      {batch.medicineType && (
                        <div>Type: {batch.medicineType}</div>
                      )}
                      {batch.quantity && batch.unit && (
                        <div>
                          Quantity: {batch.quantity} {batch.unit}
                        </div>
                      )}
                      {batch.expiryDate && (
                        <div>
                          Expires:{" "}
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 flex-wrap gap-2">
                      <Badge className={getStatusColor(batch.qualityStatus)}>
                        {batch.qualityStatus.toUpperCase()}
                      </Badge>
                      <Badge className={getStageColor(batch.currentStage)}>
                        {batch.currentStage.toUpperCase()}
                      </Badge>
                      {batch.blockchainHash && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700"
                        >
                          Blockchain Verified
                        </Badge>
                      )}
                      {batch.qualityAlerts &&
                        batch.qualityAlerts.some((a) => !a.resolved) && (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700"
                          >
                            {
                              batch.qualityAlerts.filter((a) => !a.resolved)
                                .length
                            }{" "}
                            Alert(s)
                          </Badge>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBatch(batch)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateBatchModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onBatchCreated={handleBatchCreated}
        />
      )}

      {selectedBatch && (
        <BatchDetailsModal
          batch={selectedBatch}
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default withAuth(ManufacturerBatchesPage);
