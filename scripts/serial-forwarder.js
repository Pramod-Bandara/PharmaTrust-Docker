#!/usr/bin/env node
// Serial forwarder: reads newline-delimited JSON from an Arduino-like device
// and forwards to the IoT HTTP endpoint. Requires: npm i serialport axios

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

const PORT_PATH = process.env.USB_PORT || process.argv[2];
const BAUD = Number(process.env.USB_BAUD || 115200);
const GATEWAY_HOST = process.env.GATEWAY_HOST || 'http://localhost:3000';
const POST_PATH = process.env.IOT_POST_PATH || '/api/iot/readings';
const INTERVAL_GUARD_MS = 1000; // ignore bursts faster than this

if (!PORT_PATH) {
  console.error('Usage: node serial-forwarder.js <PORT>');
  console.error('Example: node serial-forwarder.js /dev/tty.usbserial-1410');
  process.exit(1);
}

const url = `${GATEWAY_HOST}${POST_PATH}`;

function safeParse(line) {
  try { return JSON.parse(line); } catch { return null; }
}

let lastSentAtByDevice = new Map();

async function forward(payload) {
  try {
    const now = Date.now();
    const deviceId = payload.deviceId || 'UNO_DHT22_001';
    const last = lastSentAtByDevice.get(deviceId) || 0;
    if (now - last < INTERVAL_GUARD_MS) return; // simple de-bounce
    lastSentAtByDevice.set(deviceId, now);

    const resp = await axios.post(url, payload, { timeout: 8000, headers: { 'Content-Type': 'application/json' } });
    if (!(resp.status >= 200 && resp.status < 400)) {
      console.error('Non-OK response', resp.status);
    } else {
      console.log('Forwarded reading', JSON.stringify(payload));
    }
  } catch (e) {
    console.error('Forward failed', e.message);
  }
}

function main() {
  const port = new SerialPort({ path: PORT_PATH, baudRate: BAUD, autoOpen: false });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.on('error', (err) => console.error('Serial error:', err.message));
  port.on('close', () => console.error('Serial port closed'));

  parser.on('data', (line) => {
    const trimmed = String(line).trim();
    if (!trimmed) return;
    const json = safeParse(trimmed);
    if (!json) {
      // ignore non-JSON lines
      return;
    }
    // Expect { batchId, deviceId, temperature, humidity, timestamp? }
    if (typeof json.batchId === 'string' && typeof json.temperature === 'number' && typeof json.humidity === 'number') {
      forward(json);
    }
  });

  port.open((err) => {
    if (err) {
      console.error('Failed to open serial port:', err.message);
      process.exit(2);
    }
    console.log('Serial port open:', PORT_PATH, '->', url);
  });
}

main();


