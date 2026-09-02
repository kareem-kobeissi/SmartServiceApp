const assert = require('node:assert/strict');
const test = require('node:test');

const {
  compareAvailableProviders,
  isCustomerCancellationAllowed,
} = require('../src/controllers/requestController');

test('available providers are ordered by distance before rating', () => {
  const providers = [
    { fullName: 'Highly Rated Farther', distanceMeters: 2000, averageRating: 5 },
    { fullName: 'Lower Rated Nearer', distanceMeters: 1000, averageRating: 3 },
  ].sort(compareAvailableProviders);

  assert.equal(providers[0].fullName, 'Lower Rated Nearer');
});

test('higher rating wins when distances are equal', () => {
  const providers = [
    { fullName: 'Lower Rating', distanceMeters: 1000, averageRating: 3.5 },
    { fullName: 'Higher Rating', distanceMeters: 1000, averageRating: 4.9 },
  ].sort(compareAvailableProviders);

  assert.equal(providers[0].fullName, 'Higher Rating');
});

test('only non-terminal customer requests can be cancelled', () => {
  for (const status of [
    'pending',
    'offered',
    'accepted',
    'on_the_way',
    'arrived',
    'in_progress',
  ]) {
    assert.equal(isCustomerCancellationAllowed(status), true);
  }

  for (const status of ['cancelled', 'completed', 'rejected']) {
    assert.equal(isCustomerCancellationAllowed(status), false);
  }
});
