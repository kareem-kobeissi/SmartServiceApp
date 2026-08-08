const mongoose = require('mongoose');

const {
  ALLOWED_SERVICE_TYPES,
} = require('../constants/providerOptions');

const REQUEST_STATUSES = [
  'pending',
  'offered',
  'accepted',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
];

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

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedProviders: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    lastRejectedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    serviceType: {
      type: String,
      enum: ALLOWED_SERVICE_TYPES,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    priorityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      default: 'medium',
    },
    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 35,
    },
    priorityReason: {
      type: String,
      trim: true,
      default: 'Not analyzed yet.',
    },
    analyzedAt: {
      type: Date,
      default: null,
    },
    estimatedMinPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    estimatedMaxPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    estimatedDurationMinutes: {
      type: Number,
      min: 1,
      default: null,
    },
    estimationReason: {
      type: String,
      trim: true,
      default: null,
    },
    estimationCurrency: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    estimatedAt: {
      type: Date,
      default: null,
    },
    customerLocation: {
      type: pointSchema,
      default: null,
    },
    lastProviderLocation: {
      type: pointSchema,
      default: null,
    },
    lastProviderLocationUpdatedAt: {
      type: Date,
      default: null,
    },
    locationSharingActive: {
      type: Boolean,
      default: false,
    },
    locationSharingStartedAt: {
      type: Date,
      default: null,
    },
    locationSharingStoppedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'pending',
    },
    rating: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rating',
      default: null,
    },
    isRated: {
      type: Boolean,
      default: false,
    },
    hiddenForCustomer: {
      type: Boolean,
      default: false,
    },
    hiddenForProvider: {
      type: Boolean,
      default: false,
    },
    offeredAt: {
      type: Date,
      default: null,
    },
    providerRespondedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    onTheWayAt: {
      type: Date,
      default: null,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastRejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

function clearLiveLocationForTerminalStatus() {
  const update = this.getUpdate() || {};
  const status = update.$set?.status || update.status;
  if (!['completed', 'rejected', 'cancelled'].includes(status)) return;

  const stoppedAt =
    update.$set?.completedAt || update.$set?.lastRejectedAt || new Date();
  update.$set = {
    ...(update.$set || {}),
    locationSharingActive: false,
    locationSharingStoppedAt: stoppedAt,
    lastProviderLocation: null,
    lastProviderLocationUpdatedAt: null,
  };
  this.setUpdate(update);
}

serviceRequestSchema.pre('findOneAndUpdate', clearLiveLocationForTerminalStatus);
serviceRequestSchema.pre('updateOne', clearLiveLocationForTerminalStatus);
serviceRequestSchema.index({ customerLocation: '2dsphere' });
serviceRequestSchema.index({ lastProviderLocation: '2dsphere' });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
