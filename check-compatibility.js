// check-compatibility.js
// Run this before npm install to check if your system is compatible

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Checking System Compatibility...\n');

let allGood = true;

// Check Node.js version
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  
  console.log(`✓ Node.js: ${nodeVersion}`);
  
  if (majorVersion < 18) {
    console.log('  ⚠️  WARNING: Node.js 18+ is recommended');
    console.log('  Download: https://nodejs.org/\n');
    allGood = false;
  } else {
    console.log('  ✓ Version compatible\n');
  }
} catch (err) {
  console.log('✗ Could not check Node.js version\n');
  allGood = false;
}

// Check npm version
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  const majorVersion = parseInt(npmVersion.split('.')[0]);
  
  console.log(`✓ npm: ${npmVersion}`);
  
  if (majorVersion < 9) {
    console.log('  ⚠️  WARNING: npm 9+ is recommended');
    console.log('  Update: npm install -g npm@latest\n');
  } else {
    console.log('  ✓ Version compatible\n');
  }
} catch (err) {
  console.log('✗ npm not found\n');
  allGood = false;
}

// Check for .env.local
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  .env.local not found');
  console.log('  Action needed: Copy .env.local.example to .env.local');
  console.log('  Command: cp .env.local.example .env.local\n');
  allGood = false;
} else {
  console.log('✓ .env.local exists\n');
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (allGood) {
  console.log('✅ All checks passed! You can proceed with:');
  console.log('   npm install');
  console.log('   npm run dev\n');
} else {
  console.log('⚠️  Please fix the issues above before proceeding\n');
}
