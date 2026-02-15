#!/usr/bin/env node

/**
 * Standalone script to seed admin user
 * Usage: npm run seed-admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');

const seedAdmin = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Database connected');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('✗ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
      process.exit(1);
    }

    // Check if admin exists
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (admin) {
      console.log('✓ Admin user already exists');
      console.log('🔄 Updating password...');
      
      admin.passwordHash = adminPassword;
      await admin.save();
      
      console.log('✓ Admin password updated successfully');
    } else {
      console.log('🔄 Creating admin user...');
      
      admin = await User.create({
        email: adminEmail.toLowerCase(),
        passwordHash: adminPassword,
        role: 'ADMIN'
      });
      
      console.log('✓ Admin user created successfully');
    }

    console.log('\n✓ Admin Details:');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  ID: ${admin._id}`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();