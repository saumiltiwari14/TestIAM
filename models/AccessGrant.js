const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['grant', 'revoke'], required: true },
    accessType: { type: String, enum: ['admin', 'member'], required: true },
    performedBy: { type: String, required: true, trim: true },
    performedAt: { type: Date, default: Date.now },
    jiraTicketLink: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const accessGrantSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    accessType: { type: String, enum: ['admin', 'member'], required: true },
    isActive: { type: Boolean, default: true },
    history: [auditEntrySchema],
  },
  { timestamps: true }
);

accessGrantSchema.index({ employee: 1, application: 1 });

module.exports = mongoose.model('AccessGrant', accessGrantSchema);
