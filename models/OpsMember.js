const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const opsMemberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

opsMemberSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

opsMemberSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

opsMemberSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 10);
};

opsMemberSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('OpsMember', opsMemberSchema);
