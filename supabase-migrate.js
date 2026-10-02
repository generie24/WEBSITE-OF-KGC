require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createSupabaseStore } = require('./supabase-store');

async function main() {
  const store = createSupabaseStore();
  if (!store.enabled) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before migrating.');
  }

  const dataDir = path.join(__dirname, 'data');
  const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8')) || [];
  const bookings = JSON.parse(fs.readFileSync(path.join(dataDir, 'bookings.json'), 'utf8')) || [];

  for (const user of users) {
    await store.insertUser(user);
  }
  for (const booking of bookings) {
    await store.insertBooking(booking);
  }

  console.log(`Migrated ${users.length} users and ${bookings.length} bookings to Supabase.`);
}

main().catch((error) => {
  console.error('Supabase migration failed:', error.message);
  process.exitCode = 1;
});
