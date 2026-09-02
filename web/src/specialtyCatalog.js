export const WORKFLOW_FAMILIES = {
  AESTHETICS: { label: 'Aesthetics & treatments', workspace: 'Treatment workspace', progress: 'Treatment progress', patient: 'My treatments' },
  BEAUTY: { label: 'Beauty & personal care', workspace: 'Service workspace', progress: 'Service history', patient: 'My services' },
  REHAB: { label: 'Rehabilitation', workspace: 'Rehabilitation workspace', progress: 'Rehab progress', patient: 'My care plan' },
  FITNESS: { label: 'Fitness & performance', workspace: 'Training workspace', progress: 'Training progress', patient: 'My training plan' },
  WELLNESS: { label: 'Wellness', workspace: 'Wellness workspace', progress: 'Wellness progress', patient: 'My wellness plan' },
  COACHING: { label: 'Coaching', workspace: 'Coaching workspace', progress: 'Goals & progress', patient: 'My goals & progress' },
  BODYWORK: { label: 'Bodywork & recovery', workspace: 'Recovery workspace', progress: 'Recovery progress', patient: 'My recovery plan' },
  CONSULTING: { label: 'Consulting & advisory', workspace: 'Client workspace', progress: 'Engagement progress', patient: 'My engagement' },
  CARE: { label: 'Service care', workspace: 'Care workspace', progress: 'Care progress', patient: 'My care plan' },
}

function specialty(key, label, family, overrides = {}) {
  return { key, label, family, aliases: [], ...overrides }
}

export const SPECIALTIES = [
  specialty('LASER_HAIR_REMOVAL', 'Laser Hair Removal Specialist', 'AESTHETICS', { aliases: ['laser tech', 'laser technician', 'laser hair removal'], planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Lower leg treatment series', samplePlans: ['Underarm treatment series', 'Lower-leg treatment progress'] }),
  specialty('MEDICAL_AESTHETICS', 'Medical Aesthetics Provider', 'AESTHETICS', { aliases: ['med spa', 'medical aesthetics'], planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Skin treatment series', samplePlans: ['Skin treatment series', 'Post-treatment follow-up'] }),
  specialty('ESTHETICIAN', 'Esthetician', 'AESTHETICS', { aliases: ['esthetician', 'aesthetician'], planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Acne treatment series', samplePlans: ['Acne treatment series', 'Skin maintenance plan'] }),
  specialty('ELECTROLOGIST', 'Electrologist', 'AESTHETICS', { aliases: ['electrolysis', 'electrolysis specialist'], planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Facial electrolysis plan', samplePlans: ['Facial electrolysis series', 'Treatment response history'] }),
  specialty('TATTOO_REMOVAL', 'Tattoo Removal Specialist', 'AESTHETICS', { aliases: ['tattoo removal', 'tattoo removal tech'], planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Forearm removal series', samplePlans: ['Forearm removal series', 'Skin response follow-up'] }),
  specialty('HAIR_RESTORATION', 'Hair Restoration Specialist', 'AESTHETICS', { aliases: ['hair restoration', 'scalp treatment'], planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Scalp treatment plan', samplePlans: ['Scalp treatment series', 'Growth progress review'] }),
  specialty('SKINCARE_SPECIALIST', 'Skincare Specialist', 'AESTHETICS', { aliases: ['skin specialist', 'skincare'], planLabel: 'Skin plan', planPlural: 'Skin plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Hyperpigmentation plan', samplePlans: ['Hyperpigmentation plan', 'Skin response history'] }),
  specialty('PERMANENT_MAKEUP', 'Permanent Makeup Artist', 'AESTHETICS', { aliases: ['pmu', 'permanent makeup'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Brow service plan', samplePlans: ['Brow service plan', 'Touch-up follow-up'] }),

  specialty('NAIL_TECHNICIAN', 'Nail Technician', 'BEAUTY', { aliases: ['nail tech', 'nail artist', 'manicurist', 'pedicurist'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Gel manicure maintenance', samplePlans: ['Gel manicure maintenance', 'Nail health & service history'], focusLabel: 'Service / focus', focusPlaceholder: 'Gel manicure, nail repair, pedicure…', ratingLabel: 'Service outcome 1–5' }),
  specialty('HAIR_STYLIST', 'Hair Stylist', 'BEAUTY', { aliases: ['hairstylist', 'hairdresser', 'cosmetologist'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Color maintenance plan', samplePlans: ['Color maintenance plan', 'Hair service history'], focusLabel: 'Service / focus', focusPlaceholder: 'Color, cut, treatment…', ratingLabel: 'Service outcome 1–5' }),
  specialty('BARBER', 'Barber', 'BEAUTY', { aliases: ['barbering'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Grooming maintenance', samplePlans: ['Grooming maintenance', 'Cut & beard service history'], focusLabel: 'Service / focus', focusPlaceholder: 'Cut, beard, grooming…', ratingLabel: 'Service outcome 1–5' }),
  specialty('BRAIDER_LOCTICIAN', 'Braider / Loctician', 'BEAUTY', { aliases: ['braider', 'loctician', 'loc stylist'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Loc maintenance plan', samplePlans: ['Loc maintenance plan', 'Protective style history'], focusLabel: 'Service / focus', focusPlaceholder: 'Retwist, braids, maintenance…', ratingLabel: 'Service outcome 1–5' }),
  specialty('MAKEUP_ARTIST', 'Makeup Artist', 'BEAUTY', { aliases: ['mua', 'makeup'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Bridal makeup plan', samplePlans: ['Bridal makeup plan', 'Client look history'], focusLabel: 'Look / service', focusPlaceholder: 'Bridal, event, consultation…', ratingLabel: 'Service outcome 1–5' }),
  specialty('LASH_TECHNICIAN', 'Lash Technician', 'BEAUTY', { aliases: ['lash tech', 'lash artist', 'eyelash technician'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Lash fill schedule', samplePlans: ['Lash fill schedule', 'Retention & service history'], focusLabel: 'Service / focus', focusPlaceholder: 'Full set, fill, removal…', ratingLabel: 'Service outcome 1–5' }),
  specialty('BROW_ARTIST', 'Brow Artist', 'BEAUTY', { aliases: ['brow tech', 'brow specialist'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Brow maintenance plan', samplePlans: ['Brow maintenance plan', 'Shape & tint history'], focusLabel: 'Service / focus', focusPlaceholder: 'Shape, tint, lamination…', ratingLabel: 'Service outcome 1–5' }),
  specialty('WAXING_SPECIALIST', 'Waxing Specialist', 'BEAUTY', { aliases: ['waxer', 'wax tech', 'waxing'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Wax maintenance schedule', samplePlans: ['Wax maintenance schedule', 'Service & skin response history'], focusLabel: 'Service / area', focusPlaceholder: 'Brows, legs, bikini…', ratingLabel: 'Service outcome 1–5' }),
  specialty('SPRAY_TAN_ARTIST', 'Spray Tan Artist', 'BEAUTY', { aliases: ['spray tan', 'tan artist'], planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Event tan plan', samplePlans: ['Event tan plan', 'Color & service history'], focusLabel: 'Service / focus', focusPlaceholder: 'Event tan, maintenance…', ratingLabel: 'Service outcome 1–5' }),

  specialty('PHYSICAL_THERAPIST', 'Physical Therapist', 'REHAB', { aliases: ['physical therapy', 'pt'], planLabel: 'Rehab plan', planPlural: 'Rehab plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Shoulder mobility plan', samplePlans: ['Shoulder mobility rehab', 'Home exercise progress'] }),
  specialty('PHYSICAL_THERAPY_ASSISTANT', 'Physical Therapist Assistant', 'REHAB', { aliases: ['pta', 'physical therapy assistant'], planLabel: 'Rehab plan', planPlural: 'Rehab plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Post-op mobility plan', samplePlans: ['Post-op mobility plan', 'Home exercise progress'] }),
  specialty('OCCUPATIONAL_THERAPIST', 'Occupational Therapist', 'REHAB', { aliases: ['occupational therapy', 'ot'], planLabel: 'Care plan', planPlural: 'Care plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Daily living skills plan', samplePlans: ['Daily living skills plan', 'Functional progress'] }),
  specialty('ATHLETIC_TRAINER', 'Athletic Trainer', 'REHAB', { aliases: ['sports athletic trainer'], planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Return-to-play plan', samplePlans: ['Return-to-play plan', 'Recovery milestones'] }),
  specialty('CHIROPRACTOR', 'Chiropractor', 'REHAB', { aliases: ['chiropractic'], planLabel: 'Care plan', planPlural: 'Care plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Mobility care plan', samplePlans: ['Mobility care plan', 'Function progress'] }),
  specialty('PELVIC_FLOOR_SPECIALIST', 'Pelvic Floor Specialist', 'REHAB', { aliases: ['pelvic floor therapy'], planLabel: 'Care plan', planPlural: 'Care plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Pelvic floor rehab plan', samplePlans: ['Pelvic floor rehab plan', 'Function progress'] }),
  specialty('SPEECH_LANGUAGE_PATHOLOGIST', 'Speech-Language Pathologist', 'REHAB', { aliases: ['speech therapist', 'slp'], planLabel: 'Therapy plan', planPlural: 'Therapy plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Communication goals', samplePlans: ['Communication goals', 'Home practice progress'] }),

  specialty('PERSONAL_TRAINER', 'Personal Trainer', 'FITNESS', { aliases: ['trainer', 'fitness trainer'], planLabel: 'Training plan', planPlural: 'Training plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Strength & mobility plan', samplePlans: ['Strength & mobility program', 'Weekly performance goals'] }),
  specialty('STRENGTH_COACH', 'Strength & Conditioning Coach', 'FITNESS', { aliases: ['strength coach', 's&c coach'], planLabel: 'Performance plan', planPlural: 'Performance plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Off-season strength block', samplePlans: ['Off-season strength block', 'Performance testing'] }),
  specialty('RUNNING_COACH', 'Running Coach', 'FITNESS', { aliases: ['run coach'], planLabel: 'Training plan', planPlural: 'Training plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Half-marathon build', samplePlans: ['Half-marathon build', 'Weekly mileage goals'] }),
  specialty('MOBILITY_COACH', 'Mobility Coach', 'FITNESS', { aliases: ['movement coach'], planLabel: 'Mobility plan', planPlural: 'Mobility plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Hip mobility plan', samplePlans: ['Hip mobility plan', 'Movement progress'] }),
  specialty('PILATES_INSTRUCTOR', 'Pilates Instructor', 'FITNESS', { aliases: ['pilates teacher'], planLabel: 'Movement plan', planPlural: 'Movement plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Core stability plan', samplePlans: ['Core stability plan', 'Movement progression'] }),
  specialty('YOGA_INSTRUCTOR', 'Yoga Instructor', 'FITNESS', { aliases: ['yoga teacher'], planLabel: 'Practice plan', planPlural: 'Practice plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Mobility practice plan', samplePlans: ['Mobility practice plan', 'Practice progression'] }),
  specialty('SPORTS_COACH', 'Sports Performance Coach', 'FITNESS', { aliases: ['sports coach', 'performance coach'], planLabel: 'Performance plan', planPlural: 'Performance plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Speed development plan', samplePlans: ['Speed development plan', 'Performance milestones'] }),

  specialty('WELLNESS_COACH', 'Wellness Coach', 'WELLNESS', { aliases: ['wellness'], planLabel: 'Wellness plan', planPlural: 'Wellness plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Energy & routine plan', samplePlans: ['Energy & routine plan', 'Wellbeing check-ins'] }),
  specialty('HOLISTIC_PRACTITIONER', 'Holistic Wellness Practitioner', 'WELLNESS', { aliases: ['holistic practitioner'], planLabel: 'Wellness plan', planPlural: 'Wellness plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Daily wellbeing plan', samplePlans: ['Daily wellbeing plan', 'Lifestyle progress'] }),
  specialty('NUTRITION_COACH', 'Nutrition Coach', 'WELLNESS', { aliases: ['nutritionist', 'nutrition coaching'], planLabel: 'Nutrition plan', planPlural: 'Nutrition plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Meal consistency plan', samplePlans: ['Meal consistency plan', 'Nutrition habits'] }),
  specialty('HEALTH_COACH', 'Health Coach', 'WELLNESS', { aliases: ['health coaching'], planLabel: 'Health plan', planPlural: 'Health plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Sustainable habits plan', samplePlans: ['Sustainable habits plan', 'Health check-ins'] }),
  specialty('SLEEP_COACH', 'Sleep Coach', 'WELLNESS', { aliases: ['sleep coaching'], planLabel: 'Sleep plan', planPlural: 'Sleep plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Sleep routine reset', samplePlans: ['Sleep routine reset', 'Sleep consistency'] }),
  specialty('MENOPAUSE_COACH', 'Menopause Coach', 'WELLNESS', { aliases: ['menopause wellness'], planLabel: 'Wellness plan', planPlural: 'Wellness plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Symptom support plan', samplePlans: ['Symptom support plan', 'Wellness check-ins'] }),

  specialty('LIFE_COACH', 'Life Coach', 'COACHING', { aliases: ['personal coach'], planLabel: 'Goal plan', planPlural: 'Goal plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Career transition goal', samplePlans: ['Career transition goal', 'Weekly action plan'] }),
  specialty('CAREER_COACH', 'Career Coach', 'COACHING', { aliases: ['job coach'], planLabel: 'Career plan', planPlural: 'Career plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Job search strategy', samplePlans: ['Job search strategy', 'Interview & application goals'] }),
  specialty('EXECUTIVE_COACH', 'Executive Coach', 'COACHING', { aliases: ['leadership coach'], planLabel: 'Leadership plan', planPlural: 'Leadership plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Leadership development plan', samplePlans: ['Leadership development', 'Executive priorities'] }),
  specialty('ACCOUNTABILITY_COACH', 'Accountability Coach', 'COACHING', { aliases: ['accountability'], planLabel: 'Action plan', planPlural: 'Action plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Weekly execution plan', samplePlans: ['Weekly execution plan', 'Accountability milestones'] }),
  specialty('ADHD_COACH', 'ADHD Coach', 'COACHING', { aliases: ['adhd coaching'], planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Planning & focus system', samplePlans: ['Planning & focus system', 'Routine progress'] }),
  specialty('RELATIONSHIP_COACH', 'Relationship Coach', 'COACHING', { aliases: ['relationship coaching'], planLabel: 'Goal plan', planPlural: 'Goal plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Communication goals', samplePlans: ['Communication goals', 'Relationship check-ins'] }),
  specialty('BUSINESS_COACH', 'Business Coach', 'COACHING', { aliases: ['entrepreneur coach'], planLabel: 'Business plan', planPlural: 'Business plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Client growth plan', samplePlans: ['Client growth plan', 'Weekly business priorities'] }),

  specialty('MASSAGE_THERAPIST', 'Massage Therapist', 'BODYWORK', { aliases: ['massage'], planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Neck & shoulder recovery', samplePlans: ['Neck & shoulder recovery', 'Bodywork session history'] }),
  specialty('SPORTS_MASSAGE', 'Sports Massage Therapist', 'BODYWORK', { aliases: ['sports massage'], planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Race recovery plan', samplePlans: ['Race recovery plan', 'Training recovery history'] }),
  specialty('STRETCH_THERAPIST', 'Stretch Therapist', 'BODYWORK', { aliases: ['stretch practitioner'], planLabel: 'Mobility plan', planPlural: 'Mobility plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Hip mobility series', samplePlans: ['Hip mobility series', 'Range-of-motion progress'] }),
  specialty('RECOVERY_SPECIALIST', 'Recovery Specialist', 'BODYWORK', { aliases: ['recovery coach'], planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Post-training recovery plan', samplePlans: ['Post-training recovery', 'Recovery milestones'] }),

  specialty('BUSINESS_CONSULTANT', 'Business Consultant', 'CONSULTING', { aliases: ['business consulting'], planLabel: 'Engagement', planPlural: 'Engagements', allowedKinds: ['GENERAL'], placeholder: 'e.g. Operations improvement', samplePlans: ['Operations improvement', 'Engagement milestones'] }),
  specialty('MARKETING_CONSULTANT', 'Marketing Consultant', 'CONSULTING', { aliases: ['marketing consulting'], planLabel: 'Engagement', planPlural: 'Engagements', allowedKinds: ['GENERAL'], placeholder: 'e.g. Launch strategy', samplePlans: ['Launch strategy', 'Campaign milestones'] }),
  specialty('TECH_CONSULTANT', 'Technology Consultant', 'CONSULTING', { aliases: ['tech consultant', 'it consultant'], planLabel: 'Engagement', planPlural: 'Engagements', allowedKinds: ['GENERAL'], placeholder: 'e.g. Platform modernization', samplePlans: ['Platform modernization', 'Delivery milestones'] }),
  specialty('FINANCIAL_COACH', 'Financial Coach', 'CONSULTING', { aliases: ['money coach', 'budget coach'], planLabel: 'Financial plan', planPlural: 'Financial plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Debt payoff plan', samplePlans: ['Debt payoff plan', 'Monthly money goals'] }),
  specialty('ORGANIZER', 'Professional Organizer', 'CONSULTING', { aliases: ['home organizer', 'organizer'], planLabel: 'Project plan', planPlural: 'Project plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Home organization project', samplePlans: ['Home organization project', 'Room-by-room milestones'] }),

  specialty('DOULA', 'Doula', 'CARE', { aliases: ['birth doula', 'postpartum doula'], planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Birth support plan', samplePlans: ['Birth support plan', 'Postpartum check-ins'] }),
  specialty('LACTATION_CONSULTANT', 'Lactation Consultant', 'CARE', { aliases: ['ibclc', 'lactation'], planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Feeding support plan', samplePlans: ['Feeding support plan', 'Follow-up progress'] }),
  specialty('BEHAVIOR_SUPPORT', 'Behavior Support Specialist', 'CARE', { aliases: ['behavior specialist'], planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Routine support plan', samplePlans: ['Routine support plan', 'Behavior progress'] }),
  specialty('GENERAL_SERVICE_PROVIDER', 'Other Service Professional', 'CARE', { aliases: ['other', 'service provider'], planLabel: 'Client plan', planPlural: 'Client plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Client progress plan', samplePlans: ['Client progress plan', 'Service milestones'] }),
]

export const SPECIALTY_BY_KEY = Object.fromEntries(SPECIALTIES.map((item) => [item.key, item]))

export function specialtyForKey(key) {
  return SPECIALTY_BY_KEY[key] || SPECIALTY_BY_KEY.GENERAL_SERVICE_PROVIDER
}

export function familyForSpecialty(specialtyKey) {
  const item = specialtyForKey(specialtyKey)
  return WORKFLOW_FAMILIES[item.family] || WORKFLOW_FAMILIES.CARE
}

export function matchesSpecialty(item, query = '') {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return item.label.toLowerCase().startsWith(normalized)
}

export function templatePlansForSpecialty(specialtyKey) {
  const item = specialtyForKey(specialtyKey)
  if (item.samplePlans?.length) return item.samplePlans
  const family = familyForSpecialty(specialtyKey)
  return [`${item.planLabel || family.workspace} 1`, `${family.progress} follow-up`]
}

export function specialtyFromProviderType(providerType = '') {
  const normalized = providerType.trim().toLowerCase()
  if (!normalized) return SPECIALTY_BY_KEY.GENERAL_SERVICE_PROVIDER
  return SPECIALTIES.find((item) => [item.label, ...(item.aliases || [])].some((value) => value.toLowerCase() === normalized)) ||
    SPECIALTIES.find((item) => [item.label, ...(item.aliases || [])].some((value) => normalized.includes(value.toLowerCase().replace(' specialist', '').replace(' provider', '')))) ||
    SPECIALTY_BY_KEY.GENERAL_SERVICE_PROVIDER
}