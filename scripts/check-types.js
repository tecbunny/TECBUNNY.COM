#!/usr/bin/env node

/**
 * TypeScript Error Tracking Script
 * Helps identify and track remaining TypeScript errors
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 TypeScript Error Analysis\n');

try {
  // Run TypeScript compiler and capture errors
  console.log('Running TypeScript type check...');
  const result = execSync('npx tsc --noEmit', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ No TypeScript errors found!');
  
} catch (error) {
  const output = error.stdout || error.stderr || '';
  
  if (output.includes('Found') && output.includes('error')) {
    // Parse error summary
    const lines = output.split('\n');
    const errorSummary = lines.find(line => line.includes('Found') && line.includes('error'));
    
    if (errorSummary) {
      console.log(`📊 ${errorSummary}\n`);
    }
    
    // Categorize errors
    const errors = {
      'exactOptionalPropertyTypes': 0,
      'undefined assignable': 0,
      'missing properties': 0,
      'type mismatch': 0,
      'possibly undefined': 0,
      'other': 0
    };
    
    lines.forEach(line => {
      if (line.includes('exactOptionalPropertyTypes')) {
        errors['exactOptionalPropertyTypes']++;
      } else if (line.includes('undefined') && line.includes('not assignable')) {
        errors['undefined assignable']++;
      } else if (line.includes('missing') && line.includes('properties')) {
        errors['missing properties']++;
      } else if (line.includes('not assignable to type')) {
        errors['type mismatch']++;
      } else if (line.includes('possibly') && line.includes('undefined')) {
        errors['possibly undefined']++;
      } else if (line.includes('error TS')) {
        errors['other']++;
      }
    });
    
    console.log('📋 Error Categories:');
    Object.entries(errors).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`  ${category}: ${count} errors`);
      }
    });
    
    console.log('\n🔧 Recommended Fixes:');
    
    if (errors['exactOptionalPropertyTypes'] > 0) {
      console.log('  • Consider relaxing exactOptionalPropertyTypes in tsconfig.json');
    }
    
    if (errors['undefined assignable'] > 0) {
      console.log('  • Add null checks or provide default values');
    }
    
    if (errors['possibly undefined'] > 0) {
      console.log('  • Use optional chaining (?.) or nullish coalescing (??)');
    }
    
    if (errors['type mismatch'] > 0) {
      console.log('  • Review interface definitions and type assertions');
    }
    
    console.log('\n💡 Quick Commands:');
    console.log('  npx tsc --noEmit                    # Full type check');
    console.log('  npx tsc --noEmit --skipLibCheck     # Skip library checks');
    console.log('  npm run lint:check                  # ESLint check');
    
  } else {
    console.log('❌ TypeScript compilation failed');
    console.log(output);
  }
}

console.log('\n✅ Type error analysis complete!');