const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// AddressVerification Schema — Version 2.0
//
// UPGRADE NOTES:
//   • All original fields (street, city, state, zip, landmark, etc.) are kept
//     intact so existing records are NOT broken.
//   • New V2 fields are added in named sub-documents:
//       addressDetails, propertyDetails, occupancyDetails, images
//   • internalFlag is computed on the backend after GPS verification and is
//     NEVER exposed to the employee — admin eyes only.
//   • New AuditLog action types (IMAGE_UPLOADED, INSPECTION_SUBMITTED) are
//     handled in the AuditLog model.
// ─────────────────────────────────────────────────────────────────────────────

const addressVerificationSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile',
    required: true
  },

  // ── LEGACY FIELDS (V1) ────────────────────────────────────────────────────
  // Kept for backwards compatibility with records created before V2.
  // New submissions populate addressDetails instead, but reads should
  // fall back to these if addressDetails is empty.
  addressText: { type: String },
  street:      { type: String },
  city:        { type: String },
  state:       { type: String },
  zip:         { type: String },
  landmark:    { type: String },

  // ── V2: SECTION A — ADDRESS DETAILS ───────────────────────────────────────
  // Structured address fields replacing the flat V1 layout.
  addressDetails: {
    fullAddress: {
      type: String,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    lga: {
      // Local Government Area — Nigerian address standard
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },

  // ── V2: SECTION B — PROPERTY DETAILS ──────────────────────────────────────
  // Physical characteristics of the building at the declared address.
  propertyDetails: {
    buildingType: {
      type: String,
      enum: ['Duplex', 'Bungalow', 'Apartment', 'Detached House', 'Semi-Detached', 'Other'],
      trim: true
    },
    buildingPurpose: {
      type: String,
      enum: ['Residential', 'Commercial', 'Mixed Use'],
      trim: true
    },
    buildingStatus: {
      type: String,
      enum: ['Completed', 'Completed and Painted', 'Under Construction', 'Renovated'],
      trim: true
    },
    buildingColour: {
      type: String,
      trim: true
    },
    hasFence: {
      type: Boolean,
      default: null   // null = not yet answered; avoids false negatives
    },
    hasGate: {
      type: Boolean,
      default: null
    }
  },

  // ── V2: SECTION C — OCCUPANCY CONFIRMATION ────────────────────────────────
  // Who actually resides at the submitted address.
  occupancyDetails: {
    occupants: {
      // Free-text: "John Doe and family" / "Self alone"
      type: String,
      trim: true
    },
    relationship: {
      // Relationship of filer to the primary occupant (optional)
      type: String,
      trim: true
    },
    notes: {
      // Any additional context the employee wants to provide
      type: String,
      trim: true
    }
  },

  // ── V2: SECTION D — IMAGES ────────────────────────────────────────────────
  // Cloudinary secure URLs stored after upload.
  // frontView and streetView are required for a complete inspection.
  // gateView is conditionally required when hasFence or hasGate is true.
  images: {
    frontView: {
      type: String,   // Cloudinary secure_url
      default: null
    },
    gateView: {
      type: String,
      default: null
    },
    streetView: {
      type: String,
      default: null
    },
    additionalImages: {
      type: [String], // Array of Cloudinary secure_urls
      default: []
    }
  },

  // ── VERIFICATION WINDOW ───────────────────────────────────────────────────
  // Existing logic — unchanged.
  verificationWindowStart: {
    type: String  // Format: "HH:MM"
  },
  verificationWindowEnd: {
    type: String  // Format: "HH:MM"
  },

  // ── GEOCODING — EXPECTED COORDINATES ─────────────────────────────────────
  // Derived from the submitted address via Nominatim on the backend.
  expectedLatitude:  { type: Number },
  expectedLongitude: { type: Number },

  // ── GPS — ACTUAL VERIFIED COORDINATES ────────────────────────────────────
  // Captured from the employee's browser during the verification window.
  locationCoordinates: {
    latitude:  { type: Number },
    longitude: { type: Number }
  },

  // ── DISTANCE VALIDATION ───────────────────────────────────────────────────
  distanceFromDeclaredAddress: {
    type: Number  // Kilometres, rounded to 2 decimal places
  },
  distanceFlagged: {
    type: Boolean,
    default: false
  },

  // ── V2: INTERNAL FLAG ─────────────────────────────────────────────────────
  // Computed after GPS capture. Admin-only — NEVER sent to the employee.
  //
  // Classification rules (distance in metres):
  //   ≤  100m  →  VERIFIED
  //   100–500m →  REVIEW
  //   > 500m   →  FLAGGED
  //
  // A null value means GPS has not been captured yet.
  internalFlag: {
    status: {
      type: String,
      enum: ['VERIFIED', 'REVIEW', 'FLAGGED'],
      default: null
    },
    reason: {
      // Human-readable explanation stored for audit trail
      type: String,
      default: null
    }
  },

  // ── VERIFICATION STATUS ───────────────────────────────────────────────────
  // What the employee sees. VERIFIED is shown regardless of internalFlag.
  verificationStatus: {
    type: String,
    enum: [
      'PENDING_ADDRESS',
      'PENDING_VERIFICATION',
      'VERIFIED',
      'FAILED',
      'REVERIFICATION_REQUIRED'
    ],
    default: 'PENDING_ADDRESS'
  },

  verifiedAt: { type: Date },

  // ── ADMIN REVIEW ──────────────────────────────────────────────────────────
  // Manual override by admin after inspecting the record.
  reviewStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  reviewNotes:  { type: String },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   { type: Date }

}, {
  timestamps: true  // Adds createdAt + updatedAt automatically
});

// ── INDEXES ──────────────────────────────────────────────────────────────────
addressVerificationSchema.index({ employeeId: 1 });
addressVerificationSchema.index({ verificationStatus: 1 });
addressVerificationSchema.index({ verifiedAt: 1 });
addressVerificationSchema.index({ distanceFlagged: 1 });
addressVerificationSchema.index({ 'internalFlag.status': 1 }); // V2: admin filter queries

// ── INSTANCE METHOD: computeInternalFlag ─────────────────────────────────────
// Call this after distanceFromDeclaredAddress is set to auto-populate
// internalFlag. Keeps classification logic in one place.
//
// Usage (in employee.controller.js after GPS capture):
//   verification.distanceFromDeclaredAddress = distance;
//   verification.computeInternalFlag();
//   await verification.save();
//
addressVerificationSchema.methods.computeInternalFlag = function () {
  const distanceM = this.distanceFromDeclaredAddress * 1000; // km → metres

  if (distanceM === null || distanceM === undefined) {
    this.internalFlag = { status: null, reason: null };
    return;
  }

  if (distanceM <= 100) {
    this.internalFlag = {
      status: 'VERIFIED',
      reason: `GPS within ${distanceM.toFixed(0)}m of declared address`
    };
  } else if (distanceM <= 500) {
    this.internalFlag = {
      status: 'REVIEW',
      reason: `GPS is ${distanceM.toFixed(0)}m from declared address — within review range`
    };
  } else {
    this.internalFlag = {
      status: 'FLAGGED',
      reason: `GPS is ${distanceM.toFixed(0)}m from declared address — exceeds 500m threshold`
    };
  }
};

// ── INSTANCE METHOD: getAddressForDisplay ────────────────────────────────────
// Returns the best available address string regardless of V1/V2 data shape.
// Allows admin views to render cleanly for both old and new records.
//
addressVerificationSchema.methods.getAddressForDisplay = function () {
  // Prefer V2 structured data
  if (this.addressDetails && this.addressDetails.fullAddress) {
    const { fullAddress, city, lga, state } = this.addressDetails;
    return [fullAddress, city, lga, state].filter(Boolean).join(', ');
  }

  // Fall back to V1 flat fields
  if (this.street) {
    return [this.street, this.city, this.state, this.zip].filter(Boolean).join(', ');
  }

  return null;
};

const AddressVerification = mongoose.model('AddressVerification', addressVerificationSchema);

module.exports = AddressVerification;