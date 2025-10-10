#!/usr/bin/env node
// scripts/clearDb.js

import path from 'path';
import { fileURLToPath } from 'url';

// make sure .env is loaded if you use it in database.js
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { sequelize } from '../src/config/database.js';

async function clearDb() {
  try {
    console.log('⏳ Dropping all tables…');
    await sequelize.drop();
    console.log('⏳ Re-syncing schema (force)…');
    await sequelize.sync({ force: true });
    console.log('✅ Database cleared and schema re-created');
  } catch (err) {
    console.error('❌ Failed to clear DB:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    process.exit();
  }
}

clearDb();
