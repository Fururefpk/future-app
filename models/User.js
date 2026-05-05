const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^(\+233|0)\d{9}$/, 'Please provide a valid Ghana phone number']
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },
  
  // Role
  role: {
    type: String,
    enum: ['tenant', 'landlord', 'admin'],
    default: 'tenant'
  },
  
  // Biometric Data
  biometric: {
    faceEnrolled: {
      type: Boolean,
      default: false
    },
    faceData: [{
      timestamp: Date,
      descriptor: [Number], // 128-dimensional face descriptor from face-api.js
      quality: Number // 0-100 quality score
    }],
    ghanaCardVerified: {
      type: Boolean,
      default: false
    },
    ghanaCardNumber: {
      type: String,
      match: [/^GHA-[0-9]{9}-[0-9]$/, 'Invalid Ghana Card format'],
      sparse: true
    },
    ghanaCardName: String,
    biometricVerifiedAt: Date
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  lastLoginIP: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional Info
  profileImage: String,
  bio: String,
  preferences: {
    notifications: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false },
    twoFactorAuth: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 15 minutes
  const maxAttempts = 5;
  const lockTime = 15 * 60 * 1000; // 15 minutes
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.loginAttempts;
  return user;
};

// Index for email uniqueness
userSchema.index({ email: 1 });
userSchema.index({ 'biometric.ghanaCardNumber': 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
