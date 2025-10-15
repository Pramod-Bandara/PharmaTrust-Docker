#!/bin/bash

# Generate client certificates for HiveMQ Cloud
# Run this script to create client certificates for more secure authentication

echo "🔐 Generating MQTT Client Certificates for PharmaTrust"

# Create certs directory
mkdir -p certs/mqtt

# Generate client private key
openssl genrsa -out certs/mqtt/client-key.pem 2048

# Generate client certificate signing request
openssl req -new -key certs/mqtt/client-key.pem -out certs/mqtt/client-csr.pem \
  -subj "/C=US/ST=CA/L=San Francisco/O=PharmaTrust/OU=IoT/CN=pharmatrust-client"

# Generate self-signed client certificate (for development)
openssl x509 -req -in certs/mqtt/client-csr.pem -signkey certs/mqtt/client-key.pem \
  -out certs/mqtt/client-cert.pem -days 365

echo "✅ Client certificates generated in certs/mqtt/"
echo "📋 Upload client-cert.pem to HiveMQ Cloud console for enhanced security"
echo "🔧 Update Arduino code to use certificate authentication"
