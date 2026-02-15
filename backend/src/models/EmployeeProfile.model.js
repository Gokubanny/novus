const mongoose = require('mongoose');
const crypto = require('crypto');

const employeeProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['INVITED', 'ACTIVE', 'VERIFIED', 'REVERIFICATION_REQUIRED'],
    default: 'INVITED'
  },
  inviteToken: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  inviteExpiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  inviteAcceptedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
employeeProfileSchema.index({ userId: 1 });
// employeeProfileSchema.index({ email: 1 });
employeeProfileSchema.index({ status: 1 });

// Virtual for getting verification records
employeeProfileSchema.virtual('verifications', {
  ref: 'AddressVerification',
  localField: '_id',
  foreignField: 'employeeId'
});

// Ensure virtuals are included when converting to JSON
employeeProfileSchema.set('toJSON', { virtuals: true });
employeeProfileSchema.set('toObject', { virtuals: true });

const EmployeeProfile = mongoose.model('EmployeeProfile', employeeProfileSchema);

module.exports = EmployeeProfile;