const test = require('node:test');
const assert = require('node:assert/strict');

const {
  analyzeRequestPriority,
} = require('../src/services/priorityAnalysisService');

const cases = [
  ['English low', 'electrician', 'Please install a lamp in the bedroom.', 'low'],
  ['Arabic low', 'plumber', 'احتاج صيانة دورية وتركيب حنفية عادية', 'low'],
  ['English medium', 'plumber', 'The bathroom drain is clogged and needs repair.', 'medium'],
  ['Arabic medium', 'air_conditioning', 'المكيف لا يعمل والتبريد ضعيف', 'medium'],
  ['English high', 'electrician', 'There is a burning smell and the breaker keeps tripping.', 'high'],
  ['Arabic high', 'plumber', 'يوجد فيضان والمياه تغمر ارضية المبنى', 'high'],
  ['English emergency', 'electrician', 'Electrical sparks and smoke are coming from exposed wires.', 'emergency'],
  ['Arabic emergency', 'plumber', 'يوجد تسرب غاز وحريق قرب المطبخ', 'emergency'],
];

for (const [name, serviceType, description, expectedLevel] of cases) {
  test(name, () => {
    const result = analyzeRequestPriority(serviceType, description);
    assert.equal(result.priorityLevel, expectedLevel);
    assert.ok(result.priorityScore >= 0 && result.priorityScore <= 100);
    assert.ok(result.priorityReason.length > 0);
  });
}

const plumbingCases = [
  ['البيت ممتلئ بالمياه', 'emergency'],
  ['البيت غارق بالمي', 'emergency'],
  ['انفجرت ماسورة والمياه لا تتوقف', 'emergency'],
];

for (const [description, expectedLevel] of plumbingCases) {
  test(`Arabic plumbing emergency: ${description}`, () => {
    const result = analyzeRequestPriority('plumber', description);
    assert.equal(result.priorityLevel, expectedLevel);
    assert.ok(result.priorityScore >= 90);
    assert.match(result.priorityReason, /flooding|burst pipe|uncontrolled water/i);
  });
}

test('small Arabic faucet leak is not an emergency', () => {
  const result = analyzeRequestPriority(
    'plumber',
    'يوجد تسريب بسيط من الحنفية',
  );
  assert.ok(['low', 'medium'].includes(result.priorityLevel));
  assert.ok(result.priorityScore < 90);
});

test('Arabic faucet replacement is low priority', () => {
  const result = analyzeRequestPriority('plumber', 'أريد تغيير الحنفية');
  assert.equal(result.priorityLevel, 'low');
});

test('punctuation, extra spaces, and Arabic letter variants still match', () => {
  const result = analyzeRequestPriority(
    'plumber',
    'فيضان،   داخل   البيت! ولا يمكن إيقاف المياه.',
  );
  assert.equal(result.priorityLevel, 'emergency');
  assert.ok(result.priorityScore >= 90);
});

test('English severe flooding is an emergency', () => {
  const result = analyzeRequestPriority(
    'plumber',
    'The house flooded and the water cannot be stopped.',
  );
  assert.equal(result.priorityLevel, 'emergency');
  assert.ok(result.priorityScore >= 90);
});

test('unknown descriptions receive explainable normal priority', () => {
  assert.deepEqual(
    analyzeRequestPriority('plumber', 'Please inspect this issue when possible.'),
    {
      priorityLevel: 'medium',
      priorityScore: 35,
      priorityReason:
        'No emergency or routine-maintenance keywords were found, so this request has normal priority.',
    },
  );
});
