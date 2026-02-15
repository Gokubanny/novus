const User = require('../models/User.model');
const CompanySettings = require('../models/CompanySettings.model');

/**
 * Seed admin user on server startup
 * Only creates if admin doesn't exist
 */
const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn('⚠ Admin credentials not set in environment variables');
      console.warn('⚠ Please set ADMIN_EMAIL and ADMIN_PASSWORD');
      return;
    }

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (admin) {
      console.log('✓ Admin user already exists');
      
      // Update password if it changed (useful for resetting)
      admin.passwordHash = adminPassword;
      await admin.save();
      console.log('✓ Admin password updated');
    } else {
      // Create new admin
      admin = await User.create({
        email: adminEmail.toLowerCase(),
        passwordHash: adminPassword,
        role: 'ADMIN'
      });
      console.log('✓ Admin user created successfully');
    }

    // Ensure company settings exist
    await CompanySettings.getSettings();
    console.log('✓ Company settings initialized');

  } catch (error) {
    console.error('✗ Error seeding admin user:', error.message);
    throw error;
  }
};

module.exports = {
  seedAdminUser
};