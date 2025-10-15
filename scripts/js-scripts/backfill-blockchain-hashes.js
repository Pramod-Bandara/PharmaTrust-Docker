#!/usr/bin/env node

/**
 * Backfill blockchain hashes for existing medicine batches
 * This script generates blockchain hashes for batches that don't have them
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmatrust';

async function backfillBlockchainHashes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('pharmatrust');
    
    // Find all batches without blockchain hashes
    const batchesWithoutHash = await db.collection('medicine_batches')
      .find({ blockchainHash: null })
      .toArray();
    
    console.log(`Found ${batchesWithoutHash.length} batches without blockchain hashes`);
    
    for (const batch of batchesWithoutHash) {
      const txHash = `mock_${batch.batchId}_${Date.now()}`;
      const timestamp = Date.now();
      
      // Update the batch with blockchain hash
      await db.collection('medicine_batches').updateOne(
        { _id: batch._id },
        { $set: { blockchainHash: txHash } }
      );
      
      // Create blockchain record matching existing schema
      await db.collection('blockchain_records').insertOne({
        batchId: batch.batchId,
        transactionHash: txHash,
        blockHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000) + 8000000,
        network: 'polygon-mumbai',
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: Math.floor(Math.random() * 10000),
        mintedAt: batch.createdAt,
        metadata: {
          name: `Medicine Batch ${batch.batchId}`,
          description: `Pharmaceutical NFT for ${batch.name} - Batch ${batch.batchId}`,
          image: `https://pharmatrust.demo/nft-images/${batch.batchId}.png`,
          external_url: `https://pharmatrust.demo/batch/${batch.batchId}`,
          attributes: [
            { trait_type: 'Batch ID', value: batch.batchId },
            { trait_type: 'Medicine Name', value: batch.name },
            { trait_type: 'Category', value: batch.category },
            { trait_type: 'Manufacturer', value: batch.manufacturerId },
            { trait_type: 'Quality Status', value: batch.qualityStatus },
            { trait_type: 'Current Stage', value: batch.currentStage },
            { trait_type: 'Dosage', value: batch.dosage },
            { trait_type: 'Form', value: batch.form }
          ],
          properties: {
            batch_id: batch.batchId,
            manufacturer_id: batch.manufacturerId,
            created_at: batch.createdAt,
            quality_status: batch.qualityStatus,
            supply_chain_length: batch.supplyChain?.length || 1,
            backfilled: true
          }
        },
        transaction: {
          transactionHash: txHash,
          blockHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          blockNumber: Math.floor(Math.random() * 1000000) + 8000000,
          timestamp: batch.createdAt,
          from: '0xf5baa4fc66b84903ca90c3c23d832399c9440b16',
          to: '0x1234567890123456789012345678901234567890',
          gasUsed: Math.floor(Math.random() * 50000) + 100000,
          gasPrice: Math.floor(Math.random() * 50) + 10,
          network: {
            name: 'Polygon Mumbai Testnet',
            chainId: 80001,
            rpcUrl: 'https://rpc-mumbai.maticvigil.com',
            blockExplorer: 'https://mumbai.polygonscan.com'
          },
          contractAddress: '0x1234567890123456789012345678901234567890',
          tokenId: Math.floor(Math.random() * 10000),
          status: 'confirmed',
          confirmations: Math.floor(Math.random() * 100) + 10
        },
        status: 'confirmed',
        createdAt: new Date()
      });
      
      console.log(`✓ Backfilled blockchain hash for batch ${batch.batchId}: ${txHash}`);
    }
    
    console.log(`\n✅ Successfully backfilled blockchain hashes for ${batchesWithoutHash.length} batches`);
    
    // Verify the results
    const remainingWithoutHash = await db.collection('medicine_batches')
      .countDocuments({ blockchainHash: null });
    
    console.log(`Remaining batches without blockchain hash: ${remainingWithoutHash}`);
    
  } catch (error) {
    console.error('Error backfilling blockchain hashes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the script
if (require.main === module) {
  backfillBlockchainHashes().catch(console.error);
}

module.exports = { backfillBlockchainHashes };
