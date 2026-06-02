const mongoose = require('mongoose');

const offboardingTaskSchema = new mongoose.Schema({
  grant: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessGrant', required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  applicationName: { type: String, required: true },
  accessType: { type: String, enum: ['admin', 'member'], required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  completedBy: { type: String, trim: true, default: '' },
  completedByEmail: { type: String, trim: true, default: '' },
  completedAt: { type: Date },
  jiraTicketLink: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
});

const offboardingSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    initiatedBy: { type: String, required: true },
    initiatedByEmail: { type: String, required: true },
    initiatedAt: { type: Date, default: Date.now },
    jiraTicketLink: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    completedAt: { type: Date },
    tasks: [offboardingTaskSchema],
  },
  { timestamps: true }
);

offboardingSchema.virtual('progress').get(function () {
  const total = this.tasks.length;
  const done = this.tasks.filter((t) => t.status === 'completed').length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
});

offboardingSchema.set('toJSON', { virtuals: true });
offboardingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Offboarding', offboardingSchema);
