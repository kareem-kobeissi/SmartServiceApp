const PRIORITY_RULES = [
  {
    level: 'emergency',
    baseScore: 100,
    maximumScore: 100,
    serviceTypes: ['plumber'],
    keywords: [
      'house full of water',
      'home full of water',
      'home flooded',
      'house flooded',
      'severe flooding',
      'major water leak',
      'burst pipe',
      'water cannot be stopped',
      'water will not stop',
      'البيت ممتلئ بالمياه',
      'المنزل ممتلئ بالمياه',
      'البيت غارق بالمياه',
      'المنزل غارق بالمياه',
      'البيت غارق بالمي',
      'المنزل غارق بالمي',
      'فيضان داخل البيت',
      'فيضان داخل المنزل',
      'المياه تغمر المنزل',
      'المياه تغمر البيت',
      'تسرب مياه كبير',
      'انفجار أنبوب',
      'انفجار انبوب',
      'انفجر أنبوب',
      'انفجر انبوب',
      'انفجار ماسورة',
      'انفجرت ماسورة',
      'لا يمكن إيقاف المياه',
      'لا يمكن ايقاف المياه',
      'المياه لا تتوقف',
      'المي لا تتوقف',
    ],
    reason:
      'Severe indoor flooding, a burst pipe, or uncontrolled water was detected and requires immediate attention.',
  },
  {
    level: 'emergency',
    baseScore: 100,
    maximumScore: 100,
    keywords: [
      'electrical sparks',
      'sparks',
      'fire',
      'smoke',
      'exposed wire',
      'electric shock',
      'short circuit',
      'gas leak',
      'major water leak',
      'burst pipe',
      'شرر كهربائي',
      'شرر',
      'حريق',
      'دخان',
      'اسلاك مكشوفة',
      'صعقة كهربائية',
      'ماس كهربائي',
      'تسرب غاز',
      'تسرب مياه كبير',
      'انفجار انبوب',
      'ماسورة انفجرت',
    ],
    reason: 'Emergency wording indicates an immediate safety or major leak risk.',
  },
  {
    level: 'high',
    baseScore: 75,
    maximumScore: 89,
    keywords: [
      'burning smell',
      'flooding',
      'water pouring',
      'breaker keeps tripping',
      'complete power outage',
      'overheating',
      'رائحة احتراق',
      'فيضان',
      'المياه تغمر',
      'مياه تتدفق',
      'القاطع يفصل باستمرار',
      'انقطاع كهرباء كامل',
      'حرارة مرتفعة',
    ],
    reason: 'The description indicates a serious problem that should be handled soon.',
  },
  {
    level: 'medium',
    baseScore: 45,
    maximumScore: 59,
    keywords: [
      'not working',
      'broken',
      'clogged',
      'blocked drain',
      'dripping',
      'leaking faucet',
      'small leak',
      'weak cooling',
      'no cooling',
      'لا يعمل',
      'عطل',
      'معطل',
      'مسدود',
      'تنقيط',
      'تسريب صنبور',
      'تسريب بسيط',
      'تبريد ضعيف',
      'لا يوجد تبريد',
    ],
    reason: 'The description indicates a normal repair that needs timely attention.',
  },
  {
    level: 'low',
    baseScore: 15,
    maximumScore: 29,
    keywords: [
      'install a lamp',
      'install lamp',
      'replace a normal faucet',
      'replacing a normal faucet',
      'routine maintenance',
      'regular maintenance',
      'تركيب مصباح',
      'تركيب لمبة',
      'استبدال صنبور عادي',
      'تغيير حنفية عادية',
      'تغيير الحنفية',
      'تغيير حنفية',
      'صيانة دورية',
      'صيانة عادية',
    ],
    reason: 'The description indicates planned installation or routine maintenance.',
  },
];

const serviceLabels = {
  electrician: 'electrical',
  plumber: 'plumbing',
  air_conditioning: 'air-conditioning',
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyzeRequestPriority(serviceType, description) {
  const normalizedDescription = normalizeText(description);

  for (const rule of PRIORITY_RULES) {
    if (rule.serviceTypes && !rule.serviceTypes.includes(serviceType)) {
      continue;
    }

    const matches = rule.keywords.filter((keyword) =>
      normalizedDescription.includes(normalizeText(keyword)),
    );

    if (matches.length > 0) {
      const priorityScore = Math.min(
        rule.maximumScore,
        rule.baseScore + Math.max(0, matches.length - 1) * 5,
      );
      const serviceLabel = serviceLabels[serviceType] || 'service';

      return {
        priorityLevel: rule.level,
        priorityScore,
        priorityReason: `${rule.reason} Classified as a ${serviceLabel} request.`,
      };
    }
  }

  return {
    priorityLevel: 'medium',
    priorityScore: 35,
    priorityReason:
      'No emergency or routine-maintenance keywords were found, so this request has normal priority.',
  };
}

module.exports = { analyzeRequestPriority };
