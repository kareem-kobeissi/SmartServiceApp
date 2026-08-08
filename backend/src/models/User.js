const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const {
  ALLOWED_AVAILABILITY_STATUSES,
  ALLOWED_SERVICE_TYPES,
} = require('../constants/providerOptions');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(coordinates) {
          return (
            coordinates.length === 2 &&
            Number.isFinite(coordinates[0]) &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            Number.isFinite(coordinates[1]) &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90
          );
        },
        message: 'Coordinates must contain valid longitude and latitude values.',
      },
    },
  },
  {
    _id: false,
  },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['customer', 'provider'],
    },
    expoPushTokens: {
      type: [String],
      default: [],
      select: false,
    },
    serviceTypes: {
      type: [String],
      enum: ALLOWED_SERVICE_TYPES,
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ALLOWED_AVAILABILITY_STATUSES,
      default: 'offline',
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    providerLocation: {
      type: pointSchema,
      default: null,
    },
    locationUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ providerLocation: '2dsphere' });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('User', userSchema);
