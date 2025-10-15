"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Loader2,
  TruckIcon,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  User,
  FileText,
} from "lucide-react";

interface TransferBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: MedicineBatch;
  onTransferComplete: (updatedBatch: MedicineBatch) => void;
}

type SupplyChainStage = "manufacturer" | "supplier" | "pharmacist" | "customer";

const TransferBatchModal = ({
  isOpen,
  onClose,
  batch,
  onTransferComplete,
}: TransferBatchModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    toStage: getNextStage(batch.currentStage),
    handledBy: "",
    location: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  function getNextStage(
    currentStage: SupplyChainStage
  ): SupplyChainStage {
    const stageOrder: SupplyChainStage[] = [
      "manufacturer",
      "supplier",
      "pharmacist",
      "customer",
    ];
    const currentIndex = stageOrder.indexOf(currentStage);
    if (currentIndex < stageOrder.length - 1) {
      return stageOrder[currentIndex + 1];
    }
    return currentStage;
  }

  function getPossibleNextStages(
    currentStage: SupplyChainStage
  ): SupplyChainStage[] {
    const stageOrder: SupplyChainStage[] = [
      "manufacturer",
      "supplier",
      "pharmacist",
      "customer",
    ];
    const currentIndex = stageOrder.indexOf(currentStage);

    // Can only move forward in the supply chain
    if (currentIndex < stageOrder.length - 1) {
      return stageOrder.slice(currentIndex + 1);
    }
    return [];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!formData.toStage) {
      setError("Destination stage is required");
      return;
    }

    if (formData.toStage === batch.currentStage) {
      setError("Destination stage cannot be the same as current stage");
      return;
    }

    // Validate stage progression
    const possibleStages = getPossibleNextStages(batch.currentStage);
    if (!possibleStages.includes(formData.toStage)) {
      setError(
        `Invalid stage transition. Batch can only move to: ${possibleStages.join(", ")}`
      );
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.transferBatch(batch.batchId, {
        toStage: formData.toStage,
        handledBy: formData.handledBy.trim() || user?.username || "admin",
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (!response.success || !response.data) {
        setError(response.error || "Failed to transfer batch");
        return;
      }

      setSuccess(true);
      onTransferComplete(response.data.batch);

      // Close modal after a brief delay to show success
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          toStage: getNextStage(batch.currentStage),
          handledBy: "",
          location: "",
          notes: "",
        });
      }, 1500);
    } catch (err) {
      setError("Network error occurred");
      console.error("Batch transfer error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "manufacturer":
        return "🏭";
      case "supplier":
        return "🚚";
      case "pharmacist":
        return "💊";
      case "customer":
        return "👤";
      default:
        return "📦";
    }
  };

  const possibleNextStages = getPossibleNextStages(batch.currentStage);
  const canTransfer = possibleNextStages.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TruckIcon className="h-5 w-5 text-blue-600" />
              <CardTitle>Transfer Batch</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Transfer batch through the supply chain stages
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Batch Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold">{batch.name}</h3>
                <p className="text-sm text-gray-600">Batch ID: {batch.batchId}</p>
              </div>
              <Badge className={getStageColor(batch.currentStage)}>
                {getStageIcon(batch.currentStage)} {batch.currentStage.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Manufacturer:</span>{" "}
                <span className="font-medium">{batch.manufacturerName}</span>
              </div>
              <div>
                <span className="text-gray-600">Quality Status:</span>{" "}
                <Badge
                  className={
                    batch.qualityStatus === "good"
                      ? "bg-green-100 text-green-800"
                      : batch.qualityStatus === "compromised"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {batch.qualityStatus.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Supply Chain Progress Visualization */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Supply Chain Progress
            </h4>
            <div className="flex items-center justify-between">
              {["manufacturer", "supplier", "pharmacist", "customer"].map(
                (stage, index) => {
                  const isCompleted = batch.supplyChain.some(
                    (entry) => entry.stage === stage
                  );
                  const isCurrent = batch.currentStage === stage;
                  const isNext = formData.toStage === stage;

                  return (
                    <div key={stage} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${
                            isCompleted || isCurrent
                              ? "bg-blue-500 border-blue-500 text-white"
                              : isNext
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-gray-200 border-gray-300"
                          }`}
                        >
                          {isCompleted || isCurrent ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isNext ? (
                            <ArrowRight className="h-5 w-5" />
                          ) : (
                            getStageIcon(stage)
                          )}
                        </div>
                        <span className="text-xs mt-1 text-center">
                          {stage}
                        </span>
                      </div>
                      {index < 3 && (
                        <div
                          className={`h-0.5 flex-1 ${
                            batch.supplyChain.length > index + 1
                              ? "bg-blue-500"
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

          {!canTransfer ? (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This batch has reached the final stage (customer) and cannot be
                transferred further.
              </AlertDescription>
            </Alert>
          ) : null}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Batch transferred successfully!
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="toStage"
                className="flex items-center text-sm font-medium text-gray-700 mb-1"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Destination Stage *
              </label>
              <select
                id="toStage"
                name="toStage"
                required
                value={formData.toStage}
                onChange={handleChange}
                disabled={loading || !canTransfer}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {possibleNextStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {getStageIcon(stage)} {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the next stage in the supply chain
              </p>
            </div>

            <div>
              <label
                htmlFor="handledBy"
                className="flex items-center text-sm font-medium text-gray-700 mb-1"
              >
                <User className="h-4 w-4 mr-1" />
                Handled By (Optional)
              </label>
              <Input
                id="handledBy"
                name="handledBy"
                type="text"
                value={formData.handledBy}
                onChange={handleChange}
                placeholder={`e.g., ${user?.username || "username"}`}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Person or entity handling the transfer (defaults to your username)
              </p>
            </div>

            <div>
              <label
                htmlFor="location"
                className="flex items-center text-sm font-medium text-gray-700 mb-1"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Location (Optional)
              </label>
              <Input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Warehouse A, Distribution Center, Pharmacy Branch"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Physical location where the batch is being transferred
              </p>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="flex items-center text-sm font-medium text-gray-700 mb-1"
              >
                <FileText className="h-4 w-4 mr-1" />
                Transfer Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes about this transfer..."
                disabled={loading}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Any relevant information about the transfer
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Transfer Summary</p>
                  <p>
                    This batch will be transferred from{" "}
                    <strong>{batch.currentStage}</strong> to{" "}
                    <strong>{formData.toStage}</strong>.
                  </p>
                  <p className="mt-1">
                    The supply chain history will be updated and all stakeholders
                    will be able to track this change.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !canTransfer}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <TruckIcon className="mr-2 h-4 w-4" />
                    Transfer Batch
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferBatchModal;
