import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// Handle both Docker (mongo) and local development (localhost) environments
const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.MONGODB_URI || "mongodb://mongo:27017/pharmatrust"
    : "mongodb://localhost:27017/pharmatrust";
const MONGODB_DB = process.env.MONGODB_DB || "pharmatrust";

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function GET(request: NextRequest) {
  try {
    const client = await connectToDatabase();
    const db = client.db(MONGODB_DB);
    const collection = db.collection("medicine_batches");

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const qualityStatus = searchParams.get("qualityStatus");
    const manufacturerId = searchParams.get("manufacturerId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Build filter
    const filter: any = {};
    if (stage) filter.currentStage = stage;
    if (qualityStatus) filter.qualityStatus = qualityStatus;
    if (manufacturerId) filter.manufacturerId = manufacturerId;

    // Fetch batches
    const batches = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = await collection.countDocuments(filter);

    // Transform the data to match the expected format
    const transformedBatches = batches.map((batch) => ({
      _id: batch._id.toString(),
      batchId: batch.batchId,
      name: batch.name,
      description: batch.description,
      manufacturerId: batch.manufacturerId,
      manufacturerName: batch.manufacturerName || batch.manufacturerId,
      currentStage: batch.currentStage,
      qualityStatus: batch.qualityStatus,
      blockchainHash: batch.blockchainHash,
      nftTokenId: batch.nftTokenId,
      supplyChain: batch.supplyChain || [],
      qualityAlerts: batch.qualityAlerts || [],
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      // Medicine details
      medicineType: batch.medicineType,
      dosage: batch.dosage,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      unit: batch.unit,
      // Legacy fields for backwards compatibility
      category: batch.category,
      form: batch.form,
      lotNumber: batch.lotNumber,
    }));

    return NextResponse.json({
      success: true,
      data: transformedBatches,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("Admin batches API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch batches",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
