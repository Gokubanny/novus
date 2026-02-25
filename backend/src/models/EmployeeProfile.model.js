const mongoose = require('mongoose');
const crypto = require('crypto');

// Generates a 9-character URL-safe alphanumeric token (A-Z a-z 0-9 - _).
// base64url gives 64 possible chars per position → 64^9 ≈ 68 trillion combos,
// more than enough uniqueness while keeping the invite link short.
const generateInviteToken = () =>
  crypto.randomBytes(9).toString('base64url').slice(0, 9);

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
    default: generateInviteToken
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
employeeProfileSchema.index({ status: 1 });

// Virtual for getting verification records
employeeProfileSchema.virtual('verifications', {
  ref: 'AddressVerification',
  localField: '_id',
  foreignField: 'employeeId'
});

employeeProfileSchema.set('toJSON', { virtuals: true });
employeeProfileSchema.set('toObject', { virtuals: true });

const EmployeeProfile = mongoose.model('EmployeeProfile', employeeProfileSchema);

module.exports = EmployeeProfile;