const mongoose = require('mongoose');

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
      'EMPLOYEE_CREATED',
      'EMPLOYEE_INVITED',
      'INVITE_ACCEPTED',
      'ADDRESS_SUBMITTED',
      'LOCATION_VERIFIED',
      'REVERIFICATION_REQUESTED',
      'VERIFICATION_REVIEWED',
      'SETTINGS_UPDATED',
      'LOGIN',
      'LOGOUT'
    ]
  },
  targetEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeProfile'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ actionType: 1 });
auditLogSchema.index({ targetEmployeeId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;