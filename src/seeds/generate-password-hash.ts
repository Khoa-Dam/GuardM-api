/**
 * Script to generate bcrypt password hash
 * Usage: npx ts-node src/seeds/generate-password-hash.ts <password>
 * Example: npx ts-node src/seeds/generate-password-hash.ts password123
 */

import * as bcrypt from 'bcrypt';

async function generateHash() {
    const password = process.argv[2] || 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('\n===========================================');
    console.log('Password Hash Generator');
    console.log('===========================================');
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('\nCopy the hash above and use it in SQL INSERT statements.\n');
    
    // Generate SQL INSERT statement
    console.log('\nExample SQL INSERT:');
    console.log('-------------------------------------------');
    console.log(`INSERT INTO users (id, name, email, password, role)`);
    console.log(`VALUES (`);
    console.log(`    gen_random_uuid(),`);
    console.log(`    'Admin User',`);
    console.log(`    'admin@crime-alert.com',`);
    console.log(`    '${hash}',`);
    console.log(`    'Admin'`);
    console.log(`);`);
    console.log('-------------------------------------------\n');
}

generateHash().catch(console.error);

