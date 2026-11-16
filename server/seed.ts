import { listWorkshops, openDb } from './db';
import { seedDemo } from './seed-demo';

/**
 * Seeds a fresh database with one workshop, a sample marking plan (with a v1
 * version) and a published training task. Safe to run repeatedly: it skips seeding
 * when a workshop already exists.
 */
const db = openDb(process.env.DB_PATH);

const existing = listWorkshops(db);
if (existing.length) {
  console.log(`[seed] database already has ${existing.length} workshop(s), skipping`);
  process.exit(0);
}

const { workshopId, planId, taskId } = seedDemo(db);
console.log('[seed] done');
console.log(`  workshop : /api/workshops (${workshopId})`);
console.log(`  plan     : /editor/${planId}`);
console.log(`  task     : /training/${taskId}`);
