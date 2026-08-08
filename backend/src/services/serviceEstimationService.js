const ESTIMATION_CONFIG = {
  currency: 'USD',
  limits: {
    minPrice: 10,
    maxPrice: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 240,
  },
  tiers: {
    simple: {
      minPrice: 10,
      maxPrice: 25,
      durationMinutes: 45,
      reason: 'A simple installation or routine-maintenance task was detected.',
    },
    medium: {
      minPrice: 20,
      maxPrice: 50,
      durationMinutes: 90,
      reason: 'A standard repair problem was detected.',
    },
    complex: {
      minPrice: 40,
      maxPrice: 100,
      durationMinutes: 165,
      reason: 'A complex fault or major repair indicator was detected.',
    },
    emergency: {
      minPrice: 50,
      maxPrice: 150,
      durationMinutes: 150,
      reason: 'A recognized safety hazard or uncontrolled-damage indicator was detected.',
    },
  },
  serviceAdjustments: {
    electrician: { minPrice: 0, maxPrice: 0, durationMinutes: 0 },
    plumber: { minPrice: 0, maxPrice: 5, durationMinutes: 0 },
    air_conditioning: { minPrice: 5, maxPrice: 10, durationMinutes: 15 },
  },
  indicators: [
    {
      tier: 'emergency',
      serviceTypes: ['electrician'],
      keywords: [
        'sparks', 'electrical sparks', 'smoke', 'fire', 'electric shock',
        'short circuit', 'exposed wire',
        '\u0634\u0631\u0631', '\u0634\u0631\u0631 \u0643\u0647\u0631\u0628\u0627\u0626\u064a', '\u062f\u062e\u0627\u0646', '\u062d\u0631\u064a\u0642',
        '\u0635\u0639\u0642\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064a\u0629', '\u0645\u0627\u0633 \u0643\u0647\u0631\u0628\u0627\u0626\u064a', '\u0627\u0633\u0644\u0627\u0643 \u0645\u0643\u0634\u0648\u0641\u0629',
      ],
    },
    {
      tier: 'emergency',
      serviceTypes: ['plumber'],
      keywords: [
        'house full of water', 'home flooded', 'house flooded', 'severe flooding',
        'major water leak', 'burst pipe', 'water cannot be stopped',
        '\u0627\u0644\u0628\u064a\u062a \u0645\u0645\u062a\u0644\u0626 \u0628\u0627\u0644\u0645\u064a\u0627\u0647',
        '\u0627\u0644\u0628\u064a\u062a \u063a\u0627\u0631\u0642 \u0628\u0627\u0644\u0645\u064a', '\u0641\u064a\u0636\u0627\u0646 \u062f\u0627\u062e\u0644 \u0627\u0644\u0628\u064a\u062a',
        '\u062a\u0633\u0631\u0628 \u0645\u064a\u0627\u0647 \u0643\u0628\u064a\u0631', '\u0627\u0646\u0641\u062c\u0627\u0631 \u0627\u0646\u0628\u0648\u0628',
        '\u0627\u0646\u0641\u062c\u0627\u0631 \u0645\u0627\u0633\u0648\u0631\u0629', '\u0627\u0644\u0645\u064a\u0627\u0647 \u0644\u0627 \u062a\u062a\u0648\u0642\u0641',
      ],
    },
    {
      tier: 'complex',
      serviceTypes: ['air_conditioning'],
      keywords: [
        'major ac failure', 'compressor failure', 'compressor broken',
        'refrigerant leak', 'ac completely stopped',
        '\u0639\u0637\u0644 \u0643\u0628\u064a\u0631 \u0641\u064a \u0627\u0644\u0645\u0643\u064a\u0641', '\u0639\u0637\u0644 \u0627\u0644\u0643\u0645\u0628\u0631\u0633\u0648\u0631',
        '\u062a\u0633\u0631\u0628 \u063a\u0627\u0632 \u0627\u0644\u062a\u0628\u0631\u064a\u062f', '\u0627\u0644\u0645\u0643\u064a\u0641 \u0645\u062a\u0648\u0642\u0641 \u062a\u0645\u0627\u0645\u0627',
      ],
    },
    {
      tier: 'complex',
      keywords: [
        'major damage', 'severely damaged', 'multiple faults', 'needs rewiring',
        '\u0636\u0631\u0631 \u0643\u0628\u064a\u0631', '\u0627\u0639\u0637\u0627\u0644 \u0645\u062a\u0639\u062f\u062f\u0629', '\u064a\u062d\u062a\u0627\u062c \u0627\u0639\u0627\u062f\u0629 \u062a\u0645\u062f\u064a\u062f',
      ],
    },
    {
      tier: 'medium',
      keywords: [
        'small water leak', 'small leak', 'leaking faucet', 'broken electrical outlet',
        'broken outlet', 'not working', 'clogged', 'weak cooling', 'no cooling',
        '\u062a\u0633\u0631\u064a\u0628 \u0645\u064a\u0627\u0647 \u0628\u0633\u064a\u0637', '\u062a\u0633\u0631\u064a\u0628 \u0628\u0633\u064a\u0637',
        '\u0645\u0642\u0628\u0633 \u0643\u0647\u0631\u0628\u0627\u0626\u064a \u0645\u0639\u0637\u0644', '\u0641\u064a\u0634 \u0643\u0647\u0631\u0628\u0627\u0621 \u0645\u0639\u0637\u0644',
        '\u0644\u0627 \u064a\u0639\u0645\u0644', '\u0645\u0633\u062f\u0648\u062f', '\u062a\u0628\u0631\u064a\u062f \u0636\u0639\u064a\u0641', '\u0644\u0627 \u064a\u0648\u062c\u062f \u062a\u0628\u0631\u064a\u062f',
      ],
    },
    {
      tier: 'simple',
      keywords: [
        'install a lamp', 'install lamp', 'replacing a normal faucet',
        'replace a normal faucet', 'basic ac maintenance', 'routine maintenance',
        '\u062a\u0631\u0643\u064a\u0628 \u0645\u0635\u0628\u0627\u062d', '\u062a\u0631\u0643\u064a\u0628 \u0644\u0645\u0628\u0629',
        '\u062a\u063a\u064a\u064a\u0631 \u062d\u0646\u0641\u064a\u0629 \u0639\u0627\u062f\u064a\u0629', '\u0627\u0633\u062a\u0628\u062f\u0627\u0644 \u0635\u0646\u0628\u0648\u0631 \u0639\u0627\u062f\u064a',
        '\u0635\u064a\u0627\u0646\u0629 \u0627\u0633\u0627\u0633\u064a\u0629 \u0644\u0644\u0645\u0643\u064a\u0641', '\u0635\u064a\u0627\u0646\u0629 \u062f\u0648\u0631\u064a\u0629',
      ],
    },
  ],
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function findTier(serviceType, normalizedDescription) {
  for (const indicator of ESTIMATION_CONFIG.indicators) {
    if (indicator.serviceTypes && !indicator.serviceTypes.includes(serviceType)) {
      continue;
    }

    if (indicator.keywords.some((keyword) =>
      normalizedDescription.includes(normalizeText(keyword)))) {
      return indicator.tier;
    }
  }

  return 'medium';
}

function estimateServiceRequest({ serviceType, description, priorityLevel }) {
  const normalizedDescription = normalizeText(description);
  let tierName = findTier(serviceType, normalizedDescription);

  // Priority can confirm severity, but urgent/emergency wording alone never raises cost.
  if (priorityLevel === 'emergency' && tierName === 'complex') {
    tierName = 'emergency';
  }

  const tier = ESTIMATION_CONFIG.tiers[tierName];
  const adjustment = ESTIMATION_CONFIG.serviceAdjustments[serviceType] || {
    minPrice: 0,
    maxPrice: 0,
    durationMinutes: 0,
  };
  const { limits } = ESTIMATION_CONFIG;

  return {
    estimatedMinPrice: clamp(
      tier.minPrice + adjustment.minPrice,
      limits.minPrice,
      limits.maxPrice,
    ),
    estimatedMaxPrice: clamp(
      tier.maxPrice + adjustment.maxPrice,
      limits.minPrice,
      limits.maxPrice,
    ),
    estimatedDurationMinutes: clamp(
      tier.durationMinutes + adjustment.durationMinutes,
      limits.minDurationMinutes,
      limits.maxDurationMinutes,
    ),
    estimationReason: tier.reason,
    estimationCurrency: ESTIMATION_CONFIG.currency,
  };
}

module.exports = {
  ESTIMATION_CONFIG,
  estimateServiceRequest,
};
