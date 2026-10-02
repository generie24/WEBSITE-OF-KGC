require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const projectUrl = String(process.env.SUPABASE_URL || '').trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function loadLegacyClientAccounts() {
  const accountsByEmail = new Map();
  const files = [
    path.join(__dirname, 'data', 'users.json'),
    path.join(__dirname, 'users.json')
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const accounts = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(accounts)) {
      throw new Error(`${path.basename(file)} must contain a JSON array.`);
    }
    for (const account of accounts) {
      if (String(account.role || 'client').trim().toLowerCase() !== 'client') continue;
      const email = String(account.email || '').trim().toLowerCase();
      if (email) accountsByEmail.set(email, account);
    }
  }

  if (!accountsByEmail.has('client@kgc.ph')) {
    accountsByEmail.set('client@kgc.ph', {
      email: 'client@kgc.ph',
      password: 'password',
      name: 'Client User',
      role: 'client'
    });
  }

  return Array.from(accountsByEmail.values());
}

async function listAuthUsers(client) {
  const users = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
}

async function main() {
  if (!projectUrl || !serviceRoleKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
  }

  const client = createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const legacyAccounts = loadLegacyClientAccounts();
  const existingUsers = await listAuthUsers(client);
  const existingEmails = new Set(existingUsers.map((user) => String(user.email || '').toLowerCase()));
  let imported = 0;
  let skipped = 0;

  for (const account of legacyAccounts) {
    const email = String(account.email || '').trim().toLowerCase();
    const password = String(account.password || '');
    if (!email || !password) {
      throw new Error('A legacy client record is missing its email or password; no account was imported for that record.');
    }
    if (existingEmails.has(email)) {
      skipped += 1;
      continue;
    }

    const { error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: String(account.name || account.fullName || 'Client'),
        company: String(account.company || ''),
        phone: String(account.phone || ''),
        role: 'client'
      }
    });
    if (error) {
      throw new Error(`Unable to import a client account (${error.message}). Correct the account data and rerun the migration.`);
    }
    existingEmails.add(email);
    imported += 1;
  }

  console.log(`Client Auth migration complete. Imported: ${imported}; already present: ${skipped}.`);
}

main().catch((error) => {
  console.error('Client Auth migration failed:', error.message);
  process.exitCode = 1;
});
