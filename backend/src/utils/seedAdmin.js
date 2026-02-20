const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const CompanySettings = require('../models/CompanySettings.model');

/**
 * Seed admin user on server startup.
 *
 * FIX: The old version called admin.save() on every boot, which triggered
 * the pre('save') bcrypt hook and double-hashed the password each time.
 * Now we compare first — if the stored hash already matches the env var
 * password, we do nothing. Only when the password has actually changed do
 * we re-hash manually and use updateOne($set) to bypass the hook.
 */
const seedAdminUser = async () => {
  try {
    const adminEmail    = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn('⚠ Admin credentials not set in environment variables');
      console.warn('⚠ Please set ADMIN_EMAIL and ADMIN_PASSWORD');
      return;
    }

    // Always select passwordHash — it has select: false on the schema
    const admin = await User.findOne({ email: adminEmail.toLowerCase() }).select('+passwordHash');

    if (!admin) {
      // First boot — create admin. pre('save') hook will hash the plain text.
      await User.create({
        email:        adminEmail.toLowerCase(),
        passwordHash: adminPassword,
        role:         'ADMIN'
      });
      console.log('✓ Admin user created');
    } else {
      // Compare env var against the stored hash.
      // If it already matches, the password is correct — skip entirely.
      const alreadyCurrent = await bcrypt.compare(adminPassword, admin.passwordHash);

      if (alreadyCurrent) {
        console.log('✓ Admin user already exists');
      } else {
        // Password env var has changed — hash manually, then bypass
        // the pre('save') hook by using updateOne with $set directly.
        const salt    = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(adminPassword, salt);

        await User.updateOne(
          { _id: admin._id },
          { $set: { passwordHash: newHash } }
        );
        console.log('✓ Admin password updated');
      }
    }

    // Ensure company settings exist
    await CompanySettings.getSettings();
    console.log('✓ Company settings initialized');
    console.log('✓ Admin user seeded');

  } catch (error) {
    console.error('✗ Error seeding admin user:', error.message);
    throw error;
  }
};

module.exports = {
  seedAdminUser
};