// Simple script to generate JWT keys
// First install: npm install jose
// Then run: node scripts/generate-keys-simple.mjs

import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';

console.log('🔑 Generating JWT keys for Convex Auth...\n');

const { publicKey, privateKey } = await generateKeyPair('RS256', {
  extractable: true,
});

const privateKeyPEM = await exportPKCS8(privateKey);
const publicKeyJWK = await exportJWK(publicKey);

const jwks = {
  keys: [{
    use: "sig",
    kty: publicKeyJWK.kty,
    kid: publicKeyJWK.kid || "default",
    alg: "RS256",
    n: publicKeyJWK.n,
    e: publicKeyJWK.e
  }]
};

console.log('✅ Keys generated!\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('📋 COPY THIS TO CONVEX DASHBOARD - JWT_PRIVATE_KEY');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(privateKeyPEM.trim());
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📋 COPY THIS TO CONVEX DASHBOARD - JWKS');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(JSON.stringify(jwks, null, 2));
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📝 SETUP INSTRUCTIONS');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('1. Go to: https://dashboard.convex.dev');
console.log('2. Select your project: compassionate-albatross-460');
console.log('3. Go to: Settings > Environment Variables');
console.log('4. Delete the OLD JWKS variable (if it has a URL)');
console.log('5. Add JWT_PRIVATE_KEY:');
console.log('   - Name: JWT_PRIVATE_KEY');
console.log('   - Value: (paste the private key above)');
console.log('   - NO trailing spaces!');
console.log('6. Add JWKS:');
console.log('   - Name: JWKS');
console.log('   - Value: (paste the JSON above - JUST the JSON, no "JWKS=")');
console.log('7. Click Save');
console.log('8. Wait 30 seconds for redeploy');
console.log('9. Try login again\n');

