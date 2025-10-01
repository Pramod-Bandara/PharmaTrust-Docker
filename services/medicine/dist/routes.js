import { Router } from 'express';
import { database } from './database.js';
import { requireAuth, requireRole } from './middleware.js';
import { generateBatchId, isValidStageTransition, detectAnomaly, createQualityAlert, calculateQualityStatus, validateBatchData, formatBatchResponse, getPaginationParams, getSortParams } from './utils.js';
const router = Router();
// Get all batches with pagination and filtering
router.get('/batches', requireAuth, async (req, res) => {
    try {
        const { page, limit, skip } = getPaginationParams(req.query);
        const sort = getSortParams(req.query);
        // Build filter based on query parameters
        const filter = {};
        if (req.query.stage) {
            filter.currentStage = req.query.stage;
        }
        if (req.query.qualityStatus) {
            filter.qualityStatus = req.query.qualityStatus;
        }
        if (req.query.manufacturerId) {
            filter.manufacturerId = req.query.manufacturerId;
        }
        // Role-based filtering
        if (req.user?.role === 'manufacturer') {
            filter.manufacturerId = req.user.username;
        }
        const [batches, total] = await Promise.all([
            database.medicineBatches.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray(),
            database.medicineBatches.countDocuments(filter)
        ]);
        const response = {
            success: true,
            data: {
                batches: batches.map(formatBatchResponse),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch batches'
        });
    }
});
// Get single batch by ID
router.get('/batches/:batchId', requireAuth, async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await database.medicineBatches.findOne({ batchId });
        if (!batch) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }
        // Get recent environmental data for this batch
        const environmentalData = await database.environmentalData
            .find({ batchId })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();
        const response = {
            success: true,
            data: {
                batch: formatBatchResponse(batch),
                environmentalData
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch batch'
        });
    }
});
// Create new batch
router.post('/batches', requireAuth, requireRole('manufacturer', 'admin'), async (req, res) => {
    try {
        const batchData = req.body;
        // Validate input data
        const validation = validateBatchData(batchData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                data: { errors: validation.errors }
            });
        }
        const batchId = generateBatchId();
        const now = new Date();
        // Create initial supply chain entry
        const initialSupplyChainEntry = {
            stage: 'manufacturer',
            timestamp: now,
            handledBy: req.user.username,
            notes: 'Batch created'
        };
        const newBatch = {
            batchId,
            name: batchData.name.trim(),
            description: batchData.description?.trim(),
            medicineType: batchData.medicineType.trim(),
            dosage: batchData.dosage?.trim(),
            expiryDate: new Date(batchData.expiryDate),
            quantity: batchData.quantity,
            unit: batchData.unit.trim(),
            manufacturerId: req.user.username,
            manufacturerName: req.user.username, // In production, get from user profile
            currentStage: 'manufacturer',
            qualityStatus: 'good',
            supplyChain: [initialSupplyChainEntry],
            qualityAlerts: [],
            createdAt: now,
            updatedAt: now
        };
        const result = await database.medicineBatches.insertOne(newBatch);
        const response = {
            success: true,
            data: {
                batch: formatBatchResponse(newBatch),
                insertedId: result.insertedId
            },
            message: 'Batch created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creating batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create batch'
        });
    }
});
// Update batch
router.put('/batches/:batchId', requireAuth, async (req, res) => {
    try {
        const { batchId } = req.params;
        const updateData = req.body;
        const batch = await database.medicineBatches.findOne({ batchId });
        if (!batch) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }
        // Role-based access control
        if (req.user?.role === 'manufacturer' && batch.manufacturerId !== req.user.username) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        const updateFields = {
            updatedAt: new Date()
        };
        if (updateData.name)
            updateFields.name = updateData.name.trim();
        if (updateData.description !== undefined)
            updateFields.description = updateData.description?.trim();
        if (updateData.qualityStatus)
            updateFields.qualityStatus = updateData.qualityStatus;
        const result = await database.medicineBatches.updateOne({ batchId }, { $set: updateFields });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }
        const updatedBatch = await database.medicineBatches.findOne({ batchId });
        const response = {
            success: true,
            data: { batch: formatBatchResponse(updatedBatch) },
            message: 'Batch updated successfully'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error updating batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update batch'
        });
    }
});
// Transfer batch to next stage
router.post('/batches/:batchId/transfer', requireAuth, async (req, res) => {
    try {
        const { batchId } = req.params;
        const transferData = req.body;
        const batch = await database.medicineBatches.findOne({ batchId });
        if (!batch) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }
        // Validate stage transition
        if (!isValidStageTransition(batch.currentStage, transferData.toStage)) {
            return res.status(400).json({
                success: false,
                error: `Invalid stage transition from ${batch.currentStage} to ${transferData.toStage}`
            });
        }
        // Create new supply chain entry
        const newSupplyChainEntry = {
            stage: transferData.toStage,
            timestamp: new Date(),
            handledBy: transferData.handledBy || req.user.username,
            location: transferData.location,
            notes: transferData.notes
        };
        const result = await database.medicineBatches.updateOne({ batchId }, {
            $set: {
                currentStage: transferData.toStage,
                updatedAt: new Date()
            },
            $push: {
                supplyChain: newSupplyChainEntry
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }
        const updatedBatch = await database.medicineBatches.findOne({ batchId });
        const response = {
            success: true,
            data: { batch: formatBatchResponse(updatedBatch) },
            message: `Batch transferred to ${transferData.toStage} stage`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error transferring batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to transfer batch'
        });
    }
});
// Process environmental data and update quality status
router.post('/batches/:batchId/environmental-data', async (req, res) => {
    try {
        const { batchId } = req.params;
        const { temperature, humidity, deviceId } = req.body;
        if (typeof temperature !== 'number' || typeof humidity !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Temperature and humidity must be numbers'
            });
        }
        const batch = await database.medicineBatches.findOne({ batchId });
        if (!batch) {
            return res.status(404).json({
                success: false,
                error: 'Batch not found'
            });
        }
        const now = new Date();
        // Detect anomaly
        const anomalyResult = detectAnomaly(temperature, humidity, batchId);
        // Create environmental data record
        const environmentalData = {
            batchId,
            deviceId: deviceId || 'unknown',
            temperature,
            humidity,
            timestamp: now,
            isAnomaly: anomalyResult.isAnomaly,
            severity: anomalyResult.severity,
            anomalyReason: anomalyResult.reason
        };
        // Store environmental data
        await database.environmentalData.insertOne(environmentalData);
        // Create quality alert if anomaly detected
        let newAlert = null;
        if (anomalyResult.isAnomaly) {
            newAlert = createQualityAlert(environmentalData, anomalyResult);
            if (newAlert) {
                // Add alert to batch
                await database.medicineBatches.updateOne({ batchId }, {
                    $push: { qualityAlerts: newAlert },
                    $set: { updatedAt: now }
                });
            }
        }
        // Recalculate quality status
        const updatedBatch = await database.medicineBatches.findOne({ batchId });
        if (updatedBatch) {
            const newQualityStatus = calculateQualityStatus(updatedBatch.qualityAlerts);
            if (newQualityStatus !== updatedBatch.qualityStatus) {
                await database.medicineBatches.updateOne({ batchId }, {
                    $set: {
                        qualityStatus: newQualityStatus,
                        updatedAt: now
                    }
                });
            }
        }
        const response = {
            success: true,
            data: {
                environmentalData,
                anomalyDetected: anomalyResult.isAnomaly,
                alert: newAlert
            },
            message: anomalyResult.isAnomaly ? 'Environmental anomaly detected' : 'Environmental data recorded'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error processing environmental data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process environmental data'
        });
    }
});
// Get environmental data for a batch
router.get('/batches/:batchId/environmental-data', requireAuth, async (req, res) => {
    try {
        const { batchId } = req.params;
        const { page, limit, skip } = getPaginationParams(req.query);
        const [data, total] = await Promise.all([
            database.environmentalData
                .find({ batchId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            database.environmentalData.countDocuments({ batchId })
        ]);
        const response = {
            success: true,
            data: {
                environmentalData: data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching environmental data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch environmental data'
        });
    }
});
// Resolve quality alert
router.put('/batches/:batchId/alerts/:alertId/resolve', requireAuth, requireRole('manufacturer', 'admin'), async (req, res) => {
    try {
        const { batchId, alertId } = req.params;
        const result = await database.medicineBatches.updateOne({
            batchId,
            'qualityAlerts.id': alertId
        }, {
            $set: {
                'qualityAlerts.$.resolved': true,
                'qualityAlerts.$.resolvedAt': new Date(),
                'qualityAlerts.$.resolvedBy': req.user.username,
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Batch or alert not found'
            });
        }
        // Recalculate quality status
        const batch = await database.medicineBatches.findOne({ batchId });
        if (batch) {
            const newQualityStatus = calculateQualityStatus(batch.qualityAlerts);
            if (newQualityStatus !== batch.qualityStatus) {
                await database.medicineBatches.updateOne({ batchId }, {
                    $set: {
                        qualityStatus: newQualityStatus,
                        updatedAt: new Date()
                    }
                });
            }
        }
        const response = {
            success: true,
            message: 'Alert resolved successfully'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resolve alert'
        });
    }
});
// Get batch statistics
router.get('/statistics', requireAuth, async (req, res) => {
    try {
        const filter = {};
        // Role-based filtering
        if (req.user?.role === 'manufacturer') {
            filter.manufacturerId = req.user.username;
        }
        const [totalBatches, batchesByStage, batchesByQuality, recentBatches] = await Promise.all([
            database.medicineBatches.countDocuments(filter),
            database.medicineBatches
                .aggregate([
                { $match: filter },
                { $group: { _id: '$currentStage', count: { $sum: 1 } } }
            ])
                .toArray(),
            database.medicineBatches
                .aggregate([
                { $match: filter },
                { $group: { _id: '$qualityStatus', count: { $sum: 1 } } }
            ])
                .toArray(),
            database.medicineBatches
                .find(filter)
                .sort({ createdAt: -1 })
                .limit(5)
                .toArray()
        ]);
        const response = {
            success: true,
            data: {
                totalBatches,
                batchesByStage: batchesByStage.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                batchesByQuality: batchesByQuality.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                recentBatches: recentBatches.map(formatBatchResponse)
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});
export default router;
