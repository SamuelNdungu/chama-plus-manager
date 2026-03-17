#!/usr/bin/env node

/**
 * Monthly Obligations Job Runner
 * 
 * This script is designed to be called by cron on the 1st of every month.
 * It runs the monthly obligations generator and logs output.
 * 
 * Cron entry:
 * 0 0 1 * * /usr/bin/node /home/samuel/apps/AkibaPlus/backend/jobs/runMonthly.mjs >> /var/log/akibaplus-cron.log 2>&1
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the main job script
const jobScript = join(__dirname, 'generateMonthlyObligations.mjs');

console.log('=========================================');
console.log('AkibaPlus Cron Job Runner');
console.log('=========================================');
console.log(`Started at: ${new Date().toISOString()}`);
console.log(`Job script: ${jobScript}\n`);

// Spawn the job process
const job = spawn('node', [jobScript], {
  stdio: 'inherit', // Inherit stdio to see output
  env: process.env
});

job.on('close', (code) => {
  console.log(`\nJob process exited with code ${code}`);
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log('=========================================\n');
  process.exit(code);
});

job.on('error', (error) => {
  console.error(`\n❌ Failed to start job process: ${error.message}`);
  process.exit(1);
});
