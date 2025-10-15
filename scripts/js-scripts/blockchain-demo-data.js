#!/usr/bin/env node

/**
 * PharmaTrust Blockchain Demo Data Generator
 * Creates mock blockchain records for demonstration purposes
 * Simulates NFT minting and verification for medicine batches
 */

const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'pharmatrust';

// Mock blockchain network data
const MOCK_NETWORKS = {
  'polygon-mumbai': {
    name: 'Polygon Mumbai Testnet',
    chainId: 80001,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com'
  },
  'ethereum-goerli': {
    name: 'Ethereum Goerli Testnet',
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/demo',
    blockExplorer: 'https://goerli.etherscan.io'
  }
};

// Mock contract addresses
const MOCK_CONTRACTS = {
  'medicine-nft': '0x1234567890123456789012345678901234567890',
  'supply-chain': '0x0987654321098765432109876543210987654321'
};

function generateMockTransactionHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function generateMockBlockHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function generateMockAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

function generateMockBlockNumber() {
  return Math.floor(Math.random() * 1000000) + 8000000; // Realistic block numbers
}

function createMockNFTMetadata(batch) {
  return {
    name: `Medicine Batch ${batch.batchId}`,
    description: `Pharmaceutical NFT for ${batch.name} - Batch ${batch.batchId}`,
    image: `https://pharmatrust.demo/nft-images/${batch.batchId}.png`,
    external_url: `https://pharmatrust.demo/batch/${batch.batchId}`,
    attributes: [
      {
        trait_type: 'Batch ID',
        value: batch.batchId
      },
      {
        trait_type: 'Medicine Name',
        value: batch.name
      },
      {
        trait_type: 'Category',
        value: batch.category || 'Pharmaceutical'
      },
      {
        trait_type: 'Manufacturer',
        value: batch.manufacturerId
      },
      {
        trait_type: 'Manufacturing Date',
        value: new Date(batch.createdAt).toISOString().split('T')[0]
      },
      {
        trait_type: 'Expiry Date',
        value: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : 'N/A'
      },
      {
        trait_type: 'Quality Status',
        value: batch.qualityStatus
      },
      {
        trait_type: 'Current Stage',
        value: batch.currentStage
      },
      {
        trait_type: 'Dosage',
        value: batch.dosage || 'N/A'
      },
      {
        trait_type: 'Form',
        value: batch.form || 'N/A'
      }
    ],
    properties: {
      batch_id: batch.batchId,
      manufacturer_id: batch.manufacturerId,
      created_at: batch.createdAt,
      quality_status: batch.qualityStatus,
      supply_chain_length: batch.supplyChain?.length || 0
    }
  };
}

function createMockTransactionRecord(batch, network = 'polygon-mumbai') {
  const transactionHash = generateMockTransactionHash();
  const blockHash = generateMockBlockHash();
  const blockNumber = generateMockBlockNumber();
  const timestamp = new Date(batch.createdAt).getTime() + Math.floor(Math.random() * 86400000); // Within 24 hours of batch creation
  
  return {
    transactionHash,
    blockHash,
    blockNumber,
    timestamp: new Date(timestamp).toISOString(),
    from: generateMockAddress(),
    to: MOCK_CONTRACTS['medicine-nft'],
    gasUsed: Math.floor(Math.random() * 100000) + 50000,
    gasPrice: Math.floor(Math.random() * 50) + 10,
    network: MOCK_NETWORKS[network],
    contractAddress: MOCK_CONTRACTS['medicine-nft'],
    tokenId: Math.floor(Math.random() * 10000) + 1,
    status: 'confirmed',
    confirmations: Math.floor(Math.random() * 100) + 12
  };
}

function createMockVerificationRecord(batch) {
  return {
    batchId: batch.batchId,
    isVerified: true,
    verificationMethod: 'blockchain-nft',
    verifiedAt: new Date().toISOString(),
    verificationScore: Math.random() > 0.1 ? 100 : Math.floor(Math.random() * 30) + 70, // 90% chance of 100% score
    blockchainData: {
      exists: true,
      tokenId: Math.floor(Math.random() * 10000) + 1,
      owner: generateMockAddress(),
      mintedAt: batch.createdAt,
      lastTransfer: batch.supplyChain?.length > 1 ? batch.supplyChain[batch.supplyChain.length - 1].timestamp : batch.createdAt
    },
    metadata: createMockNFTMetadata(batch),
    warnings: batch.qualityStatus === 'compromised' ? ['Quality compromised due to environmental anomalies'] : [],
    recommendations: batch.qualityStatus === 'compromised' ? ['Verify storage conditions', 'Check with manufacturer'] : ['Batch verified successfully']
  };
}

async function generateBlockchainDemoData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('📦 Fetching medicine batches...');
    const batches = await db.collection('medicine_batches').find({}).toArray();
    
    if (batches.length === 0) {
      console.log('⚠️  No medicine batches found. Run seed-database.js first.');
      return;
    }
    
    console.log('🔗 Creating blockchain demo data...');
    
    // Create blockchain_records collection for mock blockchain data
    await db.collection('blockchain_records').deleteMany({});
    
    const blockchainRecords = [];
    const verificationRecords = [];
    
    for (const batch of batches) {
      // 80% of batches have blockchain records
      if (Math.random() < 0.8) {
        const transactionRecord = createMockTransactionRecord(batch);
        const verificationRecord = createMockVerificationRecord(batch);
        
        blockchainRecords.push({
          batchId: batch.batchId,
          transactionHash: transactionRecord.transactionHash,
          blockHash: transactionRecord.blockHash,
          blockNumber: transactionRecord.blockNumber,
          network: 'polygon-mumbai',
          contractAddress: MOCK_CONTRACTS['medicine-nft'],
          tokenId: transactionRecord.tokenId,
          mintedAt: transactionRecord.timestamp,
          metadata: createMockNFTMetadata(batch),
          transaction: transactionRecord,
          status: 'confirmed',
          createdAt: new Date().toISOString()
        });
        
        verificationRecords.push({
          batchId: batch.batchId,
          ...verificationRecord,
          createdAt: new Date().toISOString()
        });
        
        // Update the batch with blockchain hash
        await db.collection('medicine_batches').updateOne(
          { batchId: batch.batchId },
          { 
            $set: { 
              blockchainHash: transactionRecord.transactionHash,
              tokenId: transactionRecord.tokenId,
              blockchainNetwork: 'polygon-mumbai'
            } 
          }
        );
      }
    }
    
    if (blockchainRecords.length > 0) {
      await db.collection('blockchain_records').insertMany(blockchainRecords);
      console.log(`   ✅ Created ${blockchainRecords.length} blockchain records`);
    }
    
    // Create verification_records collection for quick verification lookups
    await db.collection('verification_records').deleteMany({});
    if (verificationRecords.length > 0) {
      await db.collection('verification_records').insertMany(verificationRecords);
      console.log(`   ✅ Created ${verificationRecords.length} verification records`);
    }
    
    // Create indexes for blockchain collections
    await db.collection('blockchain_records').createIndex({ batchId: 1 }, { unique: true });
    await db.collection('blockchain_records').createIndex({ transactionHash: 1 }, { unique: true });
    await db.collection('verification_records').createIndex({ batchId: 1 }, { unique: true });
    
    console.log('   ✅ Created blockchain collection indexes');
    
    // Generate some mock supply chain events on blockchain
    console.log('📋 Creating supply chain blockchain events...');
    const supplyChainEvents = [];
    
    for (const batch of batches) {
      if (batch.supplyChain && batch.supplyChain.length > 1) {
        for (let i = 1; i < batch.supplyChain.length; i++) {
          const event = batch.supplyChain[i];
          const eventTimestamp = new Date(event.timestamp).getTime();
          
          supplyChainEvents.push({
            batchId: batch.batchId,
            eventType: 'stage_transition',
            fromStage: batch.supplyChain[i-1].stage,
            toStage: event.stage,
            entityId: event.entityId,
            location: event.location,
            notes: event.notes,
            timestamp: event.timestamp,
            transactionHash: generateMockTransactionHash(),
            blockNumber: generateMockBlockNumber(),
            gasUsed: Math.floor(Math.random() * 30000) + 20000,
            network: 'polygon-mumbai',
            contractAddress: MOCK_CONTRACTS['supply-chain'],
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    
    if (supplyChainEvents.length > 0) {
      await db.collection('supply_chain_events').deleteMany({});
      await db.collection('supply_chain_events').insertMany(supplyChainEvents);
      await db.collection('supply_chain_events').createIndex({ batchId: 1 });
      await db.collection('supply_chain_events').createIndex({ transactionHash: 1 });
      console.log(`   ✅ Created ${supplyChainEvents.length} supply chain blockchain events`);
    }
    
    // Print summary
    console.log('\n📋 Blockchain Demo Data Summary:');
    console.log(`   🔗 Blockchain Records: ${blockchainRecords.length}`);
    console.log(`   ✅ Verification Records: ${verificationRecords.length}`);
    console.log(`   📋 Supply Chain Events: ${supplyChainEvents.length}`);
    console.log(`   🌐 Network: ${MOCK_NETWORKS['polygon-mumbai'].name}`);
    console.log(`   📄 Contract Address: ${MOCK_CONTRACTS['medicine-nft']}`);
    
    console.log('\n✅ Blockchain demo data generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating blockchain demo data:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the script
if (require.main === module) {
  generateBlockchainDemoData().catch(console.error);
}

module.exports = { generateBlockchainDemoData };
