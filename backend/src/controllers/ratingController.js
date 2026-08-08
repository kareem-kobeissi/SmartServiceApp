const mongoose = require('mongoose');

const Rating = require('../models/Rating');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');

function formatRating(rating) {
  return {
    id: rating.id,
    score: rating.score,
    comment: rating.comment,
    createdAt: rating.createdAt,
  };
}

async function createRequestRating(request, response) {
  const { score, comment = '' } = request.body;
  const { requestId } = request.params;

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return response.status(400).json({
      success: false,
      message: 'Score must be an integer from 1 to 5.',
    });
  }

  if (typeof comment !== 'string' || comment.trim().length > 500) {
    return response.status(400).json({
      success: false,
      message: 'Comment must contain no more than 500 characters.',
    });
  }

  if (!mongoose.isValidObjectId(requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Completed service request not found.',
    });
  }

  const session = await mongoose.startSession();
  let createdRating;
  let providerAverageRating;
  let providerRatingCount;

  try {
    await session.withTransaction(async () => {
      const serviceRequest = await ServiceRequest.findOne({
        _id: requestId,
        customer: request.user.id,
      }).session(session);

      if (!serviceRequest) {
        const error = new Error('Completed service request not found.');
        error.status = 404;
        throw error;
      }

      if (serviceRequest.status !== 'completed') {
        const error = new Error('Only completed service requests can be rated.');
        error.status = 409;
        throw error;
      }

      if (!serviceRequest.provider) {
        const error = new Error('This request does not have an assigned provider.');
        error.status = 409;
        throw error;
      }

      if (serviceRequest.isRated || serviceRequest.rating) {
        const error = new Error('This service request has already been rated.');
        error.status = 409;
        throw error;
      }

      const ratingId = new mongoose.Types.ObjectId();
      const requestUpdate = await ServiceRequest.updateOne(
        {
          _id: serviceRequest._id,
          customer: request.user.id,
          provider: serviceRequest.provider,
          status: 'completed',
          isRated: { $ne: true },
          rating: null,
        },
        { $set: { isRated: true, rating: ratingId } },
        { session },
      );

      if (requestUpdate.matchedCount !== 1) {
        const error = new Error('This service request has already been rated.');
        error.status = 409;
        throw error;
      }

      [createdRating] = await Rating.create(
        [
          {
            _id: ratingId,
            request: serviceRequest._id,
            customer: request.user.id,
            provider: serviceRequest.provider,
            score,
            comment: comment.trim(),
          },
        ],
        { session },
      );

      const [summary] = await Rating.aggregate([
        { $match: { provider: serviceRequest.provider } },
        {
          $group: {
            _id: '$provider',
            averageRating: { $avg: '$score' },
            ratingCount: { $sum: 1 },
          },
        },
      ]).session(session);

      providerAverageRating = Math.round(summary.averageRating * 10) / 10;
      providerRatingCount = summary.ratingCount;

      await User.updateOne(
        { _id: serviceRequest.provider, role: 'provider' },
        {
          $set: {
            averageRating: providerAverageRating,
            ratingCount: providerRatingCount,
          },
        },
        { session },
      );
    });

    return response.status(201).json({
      success: true,
      message: 'Thank you for rating your provider.',
      rating: formatRating(createdRating),
      request: {
        id: requestId,
        isRated: true,
        rating: formatRating(createdRating),
      },
      provider: {
        averageRating: providerAverageRating,
        ratingCount: providerRatingCount,
      },
    });
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (error?.code === 11000) {
      return response.status(409).json({
        success: false,
        message: 'This service request has already been rated.',
      });
    }

    return response.status(500).json({
      success: false,
      message: 'Unable to save the rating. Please try again.',
    });
  } finally {
    await session.endSession();
  }
}

async function getMyProviderRatings(request, response) {
  try {
    const provider = await User.findOne({
      _id: request.user.id,
      role: 'provider',
    }).select('averageRating ratingCount');

    if (!provider) {
      return response.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    const ratings = await Rating.find({ provider: request.user.id })
      .populate('customer', 'fullName')
      .populate('request', 'serviceType')
      .sort({ createdAt: -1 });

    return response.status(200).json({
      success: true,
      averageRating: provider.averageRating,
      ratingCount: provider.ratingCount,
      ratings: ratings.map((rating) => ({
        id: rating.id,
        customerName: rating.customer?.fullName || 'Customer',
        score: rating.score,
        comment: rating.comment,
        serviceType: rating.request?.serviceType || null,
        createdAt: rating.createdAt,
      })),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to retrieve provider reviews.',
    });
  }
}

module.exports = { createRequestRating, getMyProviderRatings };
