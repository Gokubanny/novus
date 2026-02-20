const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// AuditLog Schema — Version 2.0
//
// UPGRADE NOTES:
//   • All original action types are preserved exactly.
//   • Two new V2 action types added:
//       IMAGE_UPLOADED        — fired when Cloudinary upload completes
//       INSPECTION_SUBMITTED  — fired when full V2 inspection form is saved
//   • metadata field (Mixed type) absorbs any shape of context data,
//     so no migration of old records is required.
// ─────────────────────────────────────────────────────────────────────────────

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  actionType: {
    type: String,
    required: true,
    enum: [
      // ── V1 ACTIONS (unchanged) ─────────────────────────────────────────
      'EMPLOYEE_CREATED',
      'EMPLOYEE_INVITED',
      'INVITE_ACCEPTED',
      'ADDRESS_SUBMITTED',
      'LOCATION_VERIFIED',
      'REVERIFICATION_REQUESTED',
      'VERIFICATION_REVIEWED',
      'SETTINGS_UPDATED',
      'LOGIN',
      'LOGOUT',

      // ── V2 ACTIONS ────────────────────────────────────────────────────
      // Fired when employee uploads one or more images to Cloudinary.
      // metadata shape: { verificationId, imageTypes: ['frontView', ...], count: 3 }
      'IMAGE_UPLOADED',

      // Fired when the full V2 structured inspection form is submitted.
      // Replaces ADDRESS_SUBMITTED for new records; old action kept for legacy.
      // metadata shape: { verificationId, address, hasImages: true/false }
      'INSPECTION_SUBMITTED'
    ]
  },

  // The employee whose record was affected (optional for system-level actions)
  targetEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile'
  },

  // Flexible bag of contextual data — shape varies by actionType (see above)
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }

}, {
  timestamps: true  // createdAt used as the event timestamp
});

// ── INDEXES ──────────────────────────────────────────────────────────────────
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ actionType: 1 });
auditLogSchema.index({ targetEmployeeId: 1 });
auditLogSchema.index({ createdAt: -1 });  // Most recent first for admin log views

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;