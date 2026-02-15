const mongoose = require('mongoose');

const addressVerificationSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile',
    required: true
  },
  
  // Submitted address information
  addressText: {
    type: String
  },
  street: {
    type: String
  },
  city: {
    type: String
  },
  state: {
    type: String
  },
  zip: {
    type: String
  },
  landmark: {
    type: String
  },
  
  // Verification window
  verificationWindowStart: {
    type: String, // Format: "HH:MM"
  },
  verificationWindowEnd: {
    type: String, // Format: "HH:MM"
  },
  
  // Expected location (from geocoding the submitted address)
  expectedLatitude: {
    type: Number
  },
  expectedLongitude: {
    type: Number
  },
  
  // Actual verified location
  locationCoordinates: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  },
  
  // Distance validation
  distanceFromDeclaredAddress: {
    type: Number // in kilometers
  },
  distanceFlagged: {
    type: Boolean,
    default: false
  },
  
  // Verification status
  verificationStatus: {
    type: String,
    enum: ['PENDING_ADDRESS', 'PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'REVERIFICATION_REQUIRED'],
    default: 'PENDING_ADDRESS'
  },
  
  verifiedAt: {
    type: Date
  },
  
  // Admin review
  reviewStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  reviewNotes: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
  
}, {
  timestamps: true
});

// Indexes
addressVerificationSchema.index({ employeeId: 1 });
addressVerificationSchema.index({ verificationStatus: 1 });
addressVerificationSchema.index({ verifiedAt: 1 });
addressVerificationSchema.index({ distanceFlagged: 1 });

const AddressVerification = mongoose.model('AddressVerification', addressVerificationSchema);

module.exports = AddressVerification;