// scripts/clearDb.js
import { sequelize } from '../config/database.js';
import models        from '../src/models';  // or import each model

(async () => {
  try {
    // drop all tables, then recreate (destructive!)
    await sequelize.drop();
    await sequelize.sync({ force: true });
    console.log('✅ Database cleared and schema re-created');
  } catch (err) {
    console.error('❌ Failed to clear DB:', err);
  } finally {
    process.exit();
  }
})();
