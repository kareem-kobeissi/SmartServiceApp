const test = require('node:test');
const assert = require('node:assert/strict');

const {
  estimateServiceRequest,
} = require('../src/services/serviceEstimationService');

const cases = [
  ['installing a lamp', 'electrician', 'Install a lamp in the bedroom', 'low', 10, 25],
  ['normal faucet', 'plumber', 'Replace a normal faucet in the kitchen', 'low', 10, 30],
  ['small water leak', 'plumber', 'There is a small water leak under the sink', 'medium', 20, 55],
  ['house flooding', 'plumber', 'House flooded because of a burst pipe', 'emergency', 50, 150],
  ['broken outlet', 'electrician', 'A broken electrical outlet does not work', 'medium', 20, 50],
  ['sparks and smoke', 'electrician', 'Electrical sparks and smoke from the panel', 'emergency', 50, 150],
  ['basic AC maintenance', 'air_conditioning', 'Basic AC maintenance and cleaning', 'low', 15, 35],
  ['major AC failure', 'air_conditioning', 'Major AC failure and compressor broken', 'high', 45, 110],
  ['Arabic lamp installation', 'electrician', '\u0627\u0631\u064a\u062f \u062a\u0631\u0643\u064a\u0628 \u0645\u0635\u0628\u0627\u062d \u0641\u064a \u0627\u0644\u063a\u0631\u0641\u0629', 'low', 10, 25],
  ['Arabic faucet replacement', 'plumber', '\u0627\u0631\u064a\u062f \u062a\u063a\u064a\u064a\u0631 \u062d\u0646\u0641\u064a\u0629 \u0639\u0627\u062f\u064a\u0629', 'low', 10, 30],
  ['Arabic small leak', 'plumber', '\u064a\u0648\u062c\u062f \u062a\u0633\u0631\u064a\u0628 \u0645\u064a\u0627\u0647 \u0628\u0633\u064a\u0637 \u062a\u062d\u062a \u0627\u0644\u0645\u063a\u0633\u0644\u0629', 'medium', 20, 55],
  ['Arabic flooding', 'plumber', '\u0627\u0644\u0628\u064a\u062a \u063a\u0627\u0631\u0642 \u0628\u0627\u0644\u0645\u064a \u0628\u0633\u0628\u0628 \u0627\u0646\u0641\u062c\u0627\u0631 \u0645\u0627\u0633\u0648\u0631\u0629', 'emergency', 50, 150],
  ['Arabic outlet', 'electrician', '\u064a\u0648\u062c\u062f \u0645\u0642\u0628\u0633 \u0643\u0647\u0631\u0628\u0627\u0626\u064a \u0645\u0639\u0637\u0644 \u0641\u064a \u0627\u0644\u063a\u0631\u0641\u0629', 'medium', 20, 50],
  ['Arabic sparks', 'electrician', '\u064a\u0648\u062c\u062f \u0634\u0631\u0631 \u0643\u0647\u0631\u0628\u0627\u0626\u064a \u0648\u062f\u062e\u0627\u0646', 'emergency', 50, 150],
  ['Arabic AC maintenance', 'air_conditioning', '\u0627\u0631\u064a\u062f \u0635\u064a\u0627\u0646\u0629 \u0627\u0633\u0627\u0633\u064a\u0629 \u0644\u0644\u0645\u0643\u064a\u0641', 'low', 15, 35],
  ['Arabic major AC failure', 'air_conditioning', '\u064a\u0648\u062c\u062f \u0639\u0637\u0644 \u0643\u0628\u064a\u0631 \u0641\u064a \u0627\u0644\u0645\u0643\u064a\u0641 \u0648\u0639\u0637\u0644 \u0627\u0644\u0643\u0645\u0628\u0631\u0633\u0648\u0631', 'high', 45, 110],
];

for (const [name, serviceType, description, priorityLevel, min, max] of cases) {
  test(name, () => {
    const result = estimateServiceRequest({ serviceType, description, priorityLevel });
    assert.equal(result.estimatedMinPrice, min);
    assert.equal(result.estimatedMaxPrice, max);
    assert.ok(result.estimatedDurationMinutes >= 30);
    assert.ok(result.estimatedDurationMinutes <= 240);
    assert.equal(result.estimationCurrency, 'USD');
    assert.ok(result.estimationReason.length > 0);
  });
}

test('unknown wording receives the safe medium default', () => {
  const result = estimateServiceRequest({
    serviceType: 'electrician',
    description: 'Please inspect this unusual issue at my apartment',
    priorityLevel: 'medium',
  });

  assert.deepEqual(
    {
      min: result.estimatedMinPrice,
      max: result.estimatedMaxPrice,
      duration: result.estimatedDurationMinutes,
    },
    { min: 20, max: 50, duration: 90 },
  );
});

test('urgent wording alone does not increase the estimate', () => {
  const normal = estimateServiceRequest({
    serviceType: 'electrician',
    description: 'Please inspect this unusual issue at my apartment',
    priorityLevel: 'medium',
  });
  const urgent = estimateServiceRequest({
    serviceType: 'electrician',
    description: 'Urgent emergency please inspect this unusual issue',
    priorityLevel: 'emergency',
  });

  assert.equal(urgent.estimatedMinPrice, normal.estimatedMinPrice);
  assert.equal(urgent.estimatedMaxPrice, normal.estimatedMaxPrice);
});
