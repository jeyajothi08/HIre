import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';

/**
 * CLI script to safely provision or promote an initial Administrator account.
 * Reads credentials from environment variables or command-line flags.
 * NEVER commits hardcoded credentials or passwords to version control.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@hirehub.dev ADMIN_PASSWORD=StrongAdminPassword123! ADMIN_NAME="HireHub Administrator" npm run seed:admin
 *   OR:
 *   npm run seed:admin -- --email=admin@hirehub.dev --password=StrongAdminPassword123! --name="HireHub Administrator"
 */
async function seedAdmin() {
  // Parse command-line args if provided
  const args = process.argv.slice(2).reduce((acc, arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value) acc[key.toLowerCase()] = value;
    }
    return acc;
  }, {});

  const email = (args.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = args.password || process.env.ADMIN_PASSWORD;
  const name = (args.name || process.env.ADMIN_NAME || 'HireHub Administrator').trim();

  if (!email || !password) {
    console.error('❌ Error: Both ADMIN_EMAIL and ADMIN_PASSWORD are required to provision an admin.');
    console.log('\nUsage Examples:');
    console.log('  ADMIN_EMAIL=admin@domain.com ADMIN_PASSWORD=SecretPassword! npm run seed:admin');
    console.log('  npm run seed:admin -- --email=admin@domain.com --password=SecretPassword!');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 6 characters long.');
    process.exit(1);
  }

  try {
    await connectDB();

    let user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      if (name) user.name = name;
      user.password = password; // pre-save hook will hash it
      await user.save();
      console.log(`\n🎉 Success! Existing user "${email}" promoted to Administrator.`);
    } else {
      user = await User.create({
        name,
        email,
        password,
        role: 'admin',
      });
      console.log(`\n🎉 Success! New Administrator created for "${email}".`);
    }

    console.log('Account Details:');
    console.log(`  ID:    ${user._id}`);
    console.log(`  Name:  ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role:  ${user.role}`);
    console.log('\nYou can now log in with these credentials via the HireHub Sign In modal.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Admin provisioning failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedAdmin();
