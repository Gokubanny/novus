const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'NovusGuard'
  },
  defaultWindowStart: {
    type: String,
    default: '22:00'
  },
  defaultWindowEnd: {
    type: String,
    default: '04:00'
  },
  distanceThresholdKm: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 10
  },
  
  // Additional settings can be added here
  emailNotifications: {
    type: Boolean,
    default: false
  },
  requireAdminApproval: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
companySettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);

module.exports = CompanySettings;