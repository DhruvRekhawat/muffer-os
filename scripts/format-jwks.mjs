// Helper script to format JWKS correctly for Convex dashboard
// Usage: node scripts/format-jwks.mjs

console.log('=== JWKS FORMAT FOR CONVEX DASHBOARD ===\n');
console.log('The JWKS value in Convex dashboard must be PURE JSON, not "JWKS={...}"\n');
console.log('Example format:\n');
console.log(JSON.stringify({
  keys: [{
    use: "sig",
    kty: "RSA",
    kid: "default",
    alg: "RS256",
    n: "your-modulus-value-here",
    e: "AQAB"
  }]
}, null, 2));
console.log('\n=== INSTRUCTIONS ===');
console.log('1. If you have JWT_PRIVATE_KEY, generate matching JWKS using:');
console.log('   - Online: https://mkjwk.org/ (Key Size: 2048, Algorithm: RS256)');
console.log('   - Or install jose: npm install jose');
console.log('\n2. Copy ONLY the JSON object (without "JWKS=" prefix)');
console.log('\n3. In Convex Dashboard > Settings > Environment Variables:');
console.log('   - Variable Name: JWKS');
console.log('   - Value: (paste the JSON object above)');
console.log('\n4. Make sure there are NO:');
console.log('   - "JWKS=" prefix');
console.log('   - Trailing commas');
console.log('   - Comments');
console.log('   - Extra quotes around the JSON\n');

