#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const platform = process.env.VERCEL ? 'Vercel' : process.env.NETLIFY ? 'Netlify' : 'Local';
console.log(`\n🔍 ${platform} Environment Variables Check\n`);
console.log('='.repeat(50));

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const optional = [
  'VITE_STRIPE_PUBLISHABLE_KEY'
];

// In Vercel/Netlify, env vars are in process.env directly
// For local builds, try to load .env file
let envVars = { ...process.env };

// Only try to load .env if we're not in Vercel or Netlify
if (!process.env.VERCEL && !process.env.NETLIFY) {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!envVars[key]) {
          envVars[key] = value;
        }
      }
    });
  } catch (e) {
    // .env file doesn't exist
  }
}

let allPresent = true;

required.forEach(varName => {
  const value = envVars[varName];
  if (value && value.trim() !== '') {
    console.log(`✓ ${varName}: SET (${value.substring(0, 20)}...)`);
  } else {
    console.log(`✗ ${varName}: NOT SET`);
    allPresent = false;
  }
});

optional.forEach(varName => {
  const value = envVars[varName];
  if (value && value.trim() !== '') {
    console.log(`✓ ${varName}: SET (${value.substring(0, 20)}...) [OPTIONAL]`);
  } else {
    console.log(`○ ${varName}: NOT SET [OPTIONAL]`);
  }
});

console.log('='.repeat(50));

if (!allPresent) {
  console.error('\n❌ ERROR: Missing required environment variables!\n');
  if (process.env.VERCEL) {
    console.error('Please set them in Vercel Dashboard:');
    console.error('Project Settings → Environment Variables → Add New\n');
  } else if (process.env.NETLIFY) {
    console.error('Please set them in Netlify Dashboard:');
    console.error('Site settings → Environment variables → Add a variable\n');
  } else {
    console.error('Please create a .env file in the project root with the required variables.\n');
  }
  console.error('Make sure they are set for "Production" deploy context.\n');
  process.exit(1);
}

console.log('\n✓ All environment variables are set!\n');
