// Generate JWT keys for Convex Auth
// Run: node scripts/generate-keys.mjs

import { generateKeyPairSync } from 'crypto';
import { createPublicKey } from 'crypto';

console.log('🔑 Generating JWT keys for Convex Auth...\n');

// Generate RSA key pair
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Convert public key to JWK format manually
const publicKeyObj = createPublicKey(publicKey);
const publicKeyDer = publicKeyObj.export({ format: 'der', type: 'spki' });

// Extract modulus (n) and exponent (e) from DER
// This is a simplified extraction - for production, use jose library
const der = Buffer.from(publicKeyDer);
const nStart = der.indexOf(Buffer.from([0x02, 0x82, 0x01, 0x00])) + 4;
const nLength = 256; // 2048 bits = 256 bytes
const n = der.slice(nStart, nStart + nLength);
const eStart = der.indexOf(Buffer.from([0x02, 0x03]), nStart + nLength) + 3;
const e = der.slice(eStart, eStart + 3);

// Base64URL encode
function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const nB64 = base64UrlEncode(n);
const eB64 = base64UrlEncode(e);

// Create JWKS
const jwks = {
  keys: [{
    use: "sig",
    kty: "RSA",
    kid: "default",
    alg: "RS256",
    n: nB64,
    e: eB64 === "AQAB" ? "AQAB" : eB64
  }]
};

console.log('✅ Keys generated!\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('📋 STEP 1: Copy JWT_PRIVATE_KEY to Convex Dashboard');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Variable Name: JWT_PRIVATE_KEY');
console.log('Value:');
console.log(privateKey.trim());
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📋 STEP 2: Copy JWKS to Convex Dashboard');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Variable Name: JWKS');
console.log('Value (copy this ENTIRE JSON object):');
console.log(JSON.stringify(jwks, null, 2));
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📝 INSTRUCTIONS:');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('1. Go to: https://dashboard.convex.dev');
console.log('2. Select your project');
console.log('3. Go to: Settings > Environment Variables');
console.log('4. Add/Update JWT_PRIVATE_KEY:');
console.log('   - Paste the private key from STEP 1');
console.log('   - Make sure NO trailing spaces after -----END PRIVATE KEY-----');
console.log('5. Add/Update JWKS:');
console.log('   - Paste the JSON from STEP 2');
console.log('   - Make sure it\'s valid JSON (no "JWKS=" prefix!)');
console.log('6. Click Save');
console.log('7. Wait for functions to redeploy');
console.log('8. Try logging in again\n');
console.log('⚠️  IMPORTANT:');
console.log('   - JWKS must be JSON, NOT a URL');
console.log('   - No "JWKS=" prefix');
console.log('   - No quotes around the JSON');
console.log('   - Just paste the raw JSON object\n');

