/*
  PharmaTrust Demo Workflow Script
  - Seeds database (medicine service)
  - Logs in as manufacturer
  - Creates a new batch
  - Posts normal and anomaly IoT readings
  - Mints and verifies a blockchain record

  Usage: node scripts/demo-workflow.js [--base http://localhost:3000]
  Prereq: docker-compose up (gateway + services running)
*/

const { spawn } = require('child_process');

const BASE = (() => {
  const idx = process.argv.indexOf('--base');
  return idx > -1 && process.argv[idx + 1] ? process.argv[idx + 1] : 'http://localhost:3000';
})();

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runSeed() {
  console.log('🌱 Seeding database via services/medicine...');
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'seed'], {
      cwd: __dirname + '/../services/medicine',
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('seed failed')));
  });
}

async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function createBatch(token) {
  const nowPlusYear = new Date(Date.now() + 365*24*60*60*1000).toISOString();
  const payload = {
    name: 'Demo PainRelief 250mg',
    description: 'Automated demo batch',
    medicineType: 'Analgesic',
    dosage: '250mg',
    expiryDate: nowPlusYear,
    quantity: 200,
    unit: 'tablets'
  };
  const res = await fetch(`${BASE}/api/medicine/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Create batch failed: ${res.status}`);
  const data = await res.json();
  const batchId = data?.data?.batch?.batchId;
  if (!batchId) throw new Error('No batchId returned');
  return batchId;
}

async function postIoTReading(batchId, { temperature, humidity, deviceId = 'DHT22_001' }) {
  const res = await fetch(`${BASE}/api/iot/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, deviceId, temperature, humidity })
  });
  if (!res.ok) throw new Error(`IoT post failed: ${res.status}`);
  return res.json();
}

async function mintBlockchain(batchId, name, manufacturerId) {
  const res = await fetch(`${BASE}/api/blockchain/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, name, manufacturerId, metadata: { source: 'demo-workflow' } })
  });
  if (!res.ok) throw new Error(`Mint failed: ${res.status}`);
  return res.json();
}

async function verifyBlockchain(batchId) {
  const res = await fetch(`${BASE}/api/blockchain/verify?batchId=${encodeURIComponent(batchId)}`);
  if (!res.ok) throw new Error(`Verify failed: ${res.status}`);
  return res.json();
}

(async () => {
  try {
    console.log('🔗 Gateway base:', BASE);
    await runSeed();

    console.log('🔐 Logging in as manufacturer mfg1...');
    const { token, user } = await login('mfg1', 'demo123');
    console.log('✅ Logged in:', user);

    console.log('🏭 Creating a new demo batch...');
    const batchId = await createBatch(token);
    console.log('✅ Created batch:', batchId);

    console.log('🌡️ Posting normal IoT reading...');
    const normal = await postIoTReading(batchId, { temperature: 22.3, humidity: 50.1 });
    console.log('   ->', normal);

    await delay(500);
    console.log('🚨 Posting anomaly IoT reading...');
    const anomaly = await postIoTReading(batchId, { temperature: 29.8, humidity: 78.2 });
    console.log('   ->', anomaly);

    console.log('⛓️  Minting blockchain record...');
    const mintRes = await mintBlockchain(batchId, 'Demo PainRelief 250mg', user.username);
    console.log('   ->', mintRes);

    console.log('🔎 Verifying blockchain record...');
    const verifyRes = await verifyBlockchain(batchId);
    console.log('   ->', verifyRes);

    console.log('\n🎉 Demo workflow completed successfully.');
  } catch (err) {
    console.error('❌ Demo workflow failed:', err);
    process.exit(1);
  }
})();


