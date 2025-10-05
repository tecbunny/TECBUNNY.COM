#!/usr/bin/env node

/**
 * Dependency Health Check Script
 * Checks for deprecated packages, security vulnerabilities, and outdated dependencies
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Dependency Health Check\n');

// Function to run command and capture output
function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return output;
  } catch (error) {
    if (!silent) {
      console.error(`❌ Error running: ${command}`);
      console.error(error.message);
    }
    return null;
  }
}

// Check for known deprecated packages
console.log('📦 Checking for known deprecated packages...');

const knownDeprecated = [
  'path-match',
  'request', 
  'node-uuid',
  'uuid@3',
  'left-pad',
  'core-js@2'
];

const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

knownDeprecated.forEach(pkg => {
  const found = JSON.stringify(packageLock).includes(`"${pkg}"`);
  if (found) {
    console.log(`  ⚠️  Found deprecated package: ${pkg}`);
    
    // Suggest alternatives
    const alternatives = {
      'path-match': 'path-to-regexp (modern alternative)',
      'request': 'axios or node-fetch',
      'node-uuid': 'uuid (latest version)',
      'core-js@2': 'core-js@3'
    };
    
    if (alternatives[pkg]) {
      console.log(`     💡 Consider using: ${alternatives[pkg]}`);
    }
  } else {
    console.log(`  ✅ ${pkg} - not found`);
  }
});

// Check for security vulnerabilities
console.log('\n🔒 Checking for security vulnerabilities...');
const auditResult = runCommand('npm audit --audit-level=moderate --json', true);
if (auditResult) {
  try {
    const audit = JSON.parse(auditResult);
    const vulnCount = audit.metadata?.vulnerabilities?.total || 0;
    
    if (vulnCount > 0) {
      console.log(`  ⚠️  Found ${vulnCount} vulnerabilities`);
      console.log('     Run: npm audit fix');
    } else {
      console.log('  ✅ No known vulnerabilities found');
    }
  } catch (e) {
    console.log('  ℹ️  Could not parse audit results');
  }
} else {
  console.log('  ℹ️  Audit check skipped (command failed)');
}

// Check for outdated packages
console.log('\n📅 Checking for outdated packages...');
const outdatedResult = runCommand('npm outdated --json', true);
if (outdatedResult) {
  try {
    const outdated = JSON.parse(outdatedResult);
    const outdatedCount = Object.keys(outdated).length;
    
    if (outdatedCount > 0) {
      console.log(`  ⚠️  Found ${outdatedCount} outdated packages`);
      console.log('     Run: npm update or npm run deps:update');
      
      // Show top 5 most outdated
      const sorted = Object.entries(outdated)
        .slice(0, 5)
        .map(([name, info]) => `${name}: ${info.current} → ${info.latest}`);
      
      if (sorted.length > 0) {
        console.log('     Top outdated packages:');
        sorted.forEach(pkg => console.log(`       • ${pkg}`));
      }
    } else {
      console.log('  ✅ All packages are up to date');
    }
  } catch (e) {
    console.log('  ℹ️  Could not check outdated packages');
  }
} else {
  console.log('  ℹ️  Outdated check skipped (command failed)');
}

// Check package.json for best practices
console.log('\n⚙️  Checking package.json configuration...');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Check for engines specification
if (packageJson.engines) {
  console.log('  ✅ Node.js engine version specified');
} else {
  console.log('  ⚠️  Consider adding engines field to package.json');
}

// Check for proper script organization
const requiredScripts = ['build', 'dev', 'start', 'lint', 'typecheck'];
const hasAllScripts = requiredScripts.every(script => packageJson.scripts?.[script]);

if (hasAllScripts) {
  console.log('  ✅ All essential scripts are present');
} else {
  console.log('  ⚠️  Some essential scripts might be missing');
}

// Summary and recommendations
console.log('\n📋 Summary & Recommendations:');
console.log('');
console.log('🔧 Maintenance Commands:');
console.log('  npm audit fix           # Fix security vulnerabilities');
console.log('  npm update             # Update dependencies');
console.log('  npm run deps:check     # Check for outdated packages');
console.log('  npm run audit:fix      # Force fix security issues');
console.log('');
console.log('💡 Tips:');
console.log('  • Update Vercel CLI regularly to get latest fixes');
console.log('  • Review deprecated package warnings periodically');
console.log('  • Use npm overrides to suppress false positive warnings');
console.log('  • Run this script monthly to maintain dependency health');
console.log('');
console.log('✅ Dependency health check complete!');