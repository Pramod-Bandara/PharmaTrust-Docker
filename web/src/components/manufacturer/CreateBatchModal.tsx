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
import { X, Loader2, Package } from "lucide-react";

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCreated: (batch: MedicineBatch) => void;
}

const CreateBatchModal = ({
  isOpen,
  onClose,
  onBatchCreated,
}: CreateBatchModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    medicineType: "",
    dosage: "",
    expiryDate: "",
    quantity: "",
    unit: "tablets",
    enableBlockchain: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"creating" | "blockchain" | "complete">(
    "creating",
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name.trim()) {
      setError("Medicine name is required");
      return;
    }
    if (!formData.medicineType.trim()) {
      setError("Medicine type is required");
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (!formData.unit.trim()) {
      setError("Unit is required");
      return;
    }
    if (!formData.expiryDate) {
      setError("Expiry date is required");
      return;
    }

    // Validate expiry date is in the future
    const expiryDate = new Date(formData.expiryDate);
    if (expiryDate <= new Date()) {
      setError("Expiry date must be in the future");
      return;
    }

    try {
      setLoading(true);
      setStep("creating");

      // Step 1: Create batch in medicine service
      const batchResponse = await apiClient.createBatch({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        medicineType: formData.medicineType.trim(),
        dosage: formData.dosage.trim() || undefined,
        expiryDate: formData.expiryDate,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit.trim(),
      });

      if (!batchResponse.success || !batchResponse.data) {
        setError(batchResponse.error || "Failed to create batch");
        return;
      }

      const newBatch = batchResponse.data.batch;

      // Step 2: Record on blockchain if enabled
      if (formData.enableBlockchain) {
        setStep("blockchain");
        try {
          const blockchainResponse = await apiClient.recordBatch({
            batchId: newBatch.batchId,
            name: newBatch.name,
            manufacturerId: newBatch.manufacturerId,
            metadata: {
              description: formData.description,
              medicineType: formData.medicineType,
              dosage: formData.dosage,
              quantity: formData.quantity,
              unit: formData.unit,
              expiryDate: formData.expiryDate,
              createdAt: newBatch.createdAt,
              entityName: user?.entityName,
            },
          });

          if (blockchainResponse.success && blockchainResponse.data) {
            // Update the batch with blockchain hash
            newBatch.blockchainHash = blockchainResponse.data.txHash;
          }
        } catch (blockchainError) {
          console.warn(
            "Blockchain recording failed, but batch was created:",
            blockchainError,
          );
          // Don't fail the entire process if blockchain fails
        }
      }

      setStep("complete");
      onBatchCreated(newBatch);
      setFormData({
        name: "",
        description: "",
        medicineType: "",
        dosage: "",
        expiryDate: "",
        quantity: "",
        unit: "tablets",
        enableBlockchain: true,
      });

      // Close modal after a brief delay to show success
      setTimeout(() => {
        onClose();
        setStep("creating");
      }, 1500);
    } catch (err) {
      setError("Network error occurred");
      console.error("Batch creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const getStepMessage = () => {
    switch (step) {
      case "creating":
        return "Creating medicine batch...";
      case "blockchain":
        return "Recording on blockchain...";
      case "complete":
        return "Batch created successfully!";
      default:
        return "Creating...";
    }
  };

  // Calculate minimum expiry date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minExpiryDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <CardTitle>Create New Batch</CardTitle>
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
            Create a new medicine batch for supply chain tracking
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Validation failed
                  <br />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Medicine Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Aspirin 500mg"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="medicineType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Medicine Type *
                </label>
                <Input
                  id="medicineType"
                  name="medicineType"
                  type="text"
                  required
                  value={formData.medicineType}
                  onChange={handleChange}
                  placeholder="e.g., Painkiller, Antibiotic"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="dosage"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Dosage (Optional)
                </label>
                <Input
                  id="dosage"
                  name="dosage"
                  type="text"
                  value={formData.dosage}
                  onChange={handleChange}
                  placeholder="e.g., 500mg, 10ml"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Quantity *
                </label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="e.g., 1000"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="unit"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit *
                </label>
                <select
                  id="unit"
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="tablets">Tablets</option>
                  <option value="capsules">Capsules</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="mg">Milligrams (mg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="units">Units</option>
                  <option value="bottles">Bottles</option>
                  <option value="boxes">Boxes</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="expiryDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Expiry Date *
                </label>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  required
                  min={minExpiryDate}
                  value={formData.expiryDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (Optional)
                </label>
                <Input
                  id="description"
                  name="description"
                  type="text"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Additional details about the medicine"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                id="enableBlockchain"
                name="enableBlockchain"
                type="checkbox"
                checked={formData.enableBlockchain}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="enableBlockchain"
                className="text-sm font-medium text-gray-700"
              >
                Record on blockchain for authenticity verification
              </label>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Manufacturer:</strong>{" "}
                {user?.entityName || user?.username}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                A unique batch ID will be automatically generated upon creation.
              </p>
              {formData.enableBlockchain && (
                <p className="text-sm text-blue-600 mt-1">
                  ✓ This batch will be recorded on the blockchain for immutable
                  verification.
                </p>
              )}
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
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {getStepMessage()}
                  </>
                ) : (
                  "Create Batch"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateBatchModal;
