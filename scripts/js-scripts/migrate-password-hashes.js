#!/usr/bin/env node

/**
 * PharmaTrust Password Hash Migration Script
 *
 * Migrates user passwords from SHA256 to bcrypt hashing.
 * This script detects SHA256-hashed passwords (64 hex characters)
 * and re-hashes them using bcrypt with the original demo passwords.
 *
 * Usage: node migrate-password-hashes.js
 */

const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "pharmatrust";

// Known demo user passwords for migration
const KNOWN_PASSWORDS = {
  'mfg1': 'demo123',
  'sup1': 'demo123',
  'phm1': 'demo123',
  'admin': 'admin123'
};

async function isSHA256Hash(hash) {
  // SHA256 hashes are exactly 64 hexadecimal characters
  return /^[a-f0-9]{64}$/i.test(hash);
}

async function migrateSHA256ToBcrypt(password) {
  return await bcrypt.hash(password, 12);
}

async function migratePasswordHashes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('🔍 Checking for users with SHA256 password hashes...');
    const users = await db.collection('users').find({}).toArray();

    if (users.length === 0) {
      console.log('⚠️  No users found in database.');
      return;
    }

    console.log(`📊 Found ${users.length} users`);

    let migratedCount = 0;
    let skippedCount = 0;
    let unknownCount = 0;

    for (const user of users) {
      const isSHA256 = await isSHA256Hash(user.passwordHash);

      if (!isSHA256) {
        console.log(`   ✓ ${user.username} - Already using bcrypt`);
        skippedCount++;
        continue;
      }

      // Check if we know the original password
      const knownPassword = KNOWN_PASSWORDS[user.username];

      if (!knownPassword) {
        console.log(`   ⚠️  ${user.username} - SHA256 hash detected but password unknown (skipping)`);
        unknownCount++;
        continue;
      }

      // Migrate to bcrypt
      console.log(`   🔄 ${user.username} - Migrating from SHA256 to bcrypt...`);
      const newHash = await migrateSHA256ToBcrypt(knownPassword);

      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            passwordHash: newHash,
            isActive: user.isActive !== undefined ? user.isActive : true
          }
        }
      );

      console.log(`   ✅ ${user.username} - Migration complete`);
      migratedCount++;
    }

    console.log('\n📋 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} users`);
    console.log(`   ✓ Already bcrypt: ${skippedCount} users`);

    if (unknownCount > 0) {
      console.log(`   ⚠️  Unknown passwords: ${unknownCount} users`);
      console.log('      These users need manual password reset via admin panel');
    }

    console.log('\n✅ Password hash migration completed successfully!');

  } catch (error) {
    console.error('❌ Error migrating password hashes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

if (require.main === module) {
  migratePasswordHashes().catch(console.error);
}

module.exports = { migratePasswordHashes };
