export const WORKFLOW_FAMILIES = {
  AESTHETICS: { label: 'Aesthetics & treatments', workspace: 'Treatment workspace', progress: 'Treatment progress', patient: 'My treatments' },
  REHAB: { label: 'Rehabilitation', workspace: 'Rehabilitation workspace', progress: 'Rehab progress', patient: 'My care plan' },
  FITNESS: { label: 'Fitness & performance', workspace: 'Training workspace', progress: 'Training progress', patient: 'My training plan' },
  WELLNESS: { label: 'Wellness', workspace: 'Wellness workspace', progress: 'Wellness progress', patient: 'My wellness plan' },
  COACHING: { label: 'Coaching', workspace: 'Coaching workspace', progress: 'Goals & progress', patient: 'My goals & progress' },
  BODYWORK: { label: 'Bodywork & recovery', workspace: 'Recovery workspace', progress: 'Recovery progress', patient: 'My recovery plan' },
  CONSULTING: { label: 'Consulting & advisory', workspace: 'Client workspace', progress: 'Engagement progress', patient: 'My engagement' },
  CARE: { label: 'Service care', workspace: 'Care workspace', progress: 'Care progress', patient: 'My care plan' },
}

function specialty(key, label, family, overrides = {}) {
  return { key, label, family, ...overrides }
}

export const SPECIALTIES = [
  specialty('LASER_HAIR_REMOVAL', 'Laser Hair Removal Specialist', 'AESTHETICS', { planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Lower leg treatment series' }),
  specialty('MEDICAL_AESTHETICS', 'Medical Aesthetics Provider', 'AESTHETICS', { planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Skin treatment series' }),
  specialty('ESTHETICIAN', 'Esthetician', 'AESTHETICS', { planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Acne treatment series' }),
  specialty('ELECTROLOGIST', 'Electrologist', 'AESTHETICS', { planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Facial electrolysis plan' }),
  specialty('TATTOO_REMOVAL', 'Tattoo Removal Specialist', 'AESTHETICS', { planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Forearm removal series' }),
  specialty('HAIR_RESTORATION', 'Hair Restoration Specialist', 'AESTHETICS', { planLabel: 'Treatment plan', planPlural: 'Treatment plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Scalp treatment plan' }),
  specialty('SKINCARE_SPECIALIST', 'Skincare Specialist', 'AESTHETICS', { planLabel: 'Skin plan', planPlural: 'Skin plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Hyperpigmentation plan' }),
  specialty('PERMANENT_MAKEUP', 'Permanent Makeup Artist', 'AESTHETICS', { planLabel: 'Service plan', planPlural: 'Service plans', allowedKinds: ['LASER_HAIR_REMOVAL'], placeholder: 'e.g. Brow service plan' }),

  specialty('PHYSICAL_THERAPIST', 'Physical Therapist', 'REHAB', { planLabel: 'Rehab plan', planPlural: 'Rehab plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Shoulder mobility plan' }),
  specialty('PHYSICAL_THERAPY_ASSISTANT', 'Physical Therapist Assistant', 'REHAB', { planLabel: 'Rehab plan', planPlural: 'Rehab plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Post-op mobility plan' }),
  specialty('OCCUPATIONAL_THERAPIST', 'Occupational Therapist', 'REHAB', { planLabel: 'Care plan', planPlural: 'Care plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Daily living skills plan' }),
  specialty('ATHLETIC_TRAINER', 'Athletic Trainer', 'REHAB', { planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Return-to-play plan' }),
  specialty('CHIROPRACTOR', 'Chiropractor', 'REHAB', { planLabel: 'Care plan', planPlural: 'Care plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Mobility care plan' }),
  specialty('PELVIC_FLOOR_SPECIALIST', 'Pelvic Floor Specialist', 'REHAB', { planLabel: 'Care plan', planPlural: 'Care plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Pelvic floor rehab plan' }),

  specialty('PERSONAL_TRAINER', 'Personal Trainer', 'FITNESS', { planLabel: 'Training plan', planPlural: 'Training plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Strength & mobility plan' }),
  specialty('STRENGTH_COACH', 'Strength & Conditioning Coach', 'FITNESS', { planLabel: 'Performance plan', planPlural: 'Performance plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Off-season strength block' }),
  specialty('RUNNING_COACH', 'Running Coach', 'FITNESS', { planLabel: 'Training plan', planPlural: 'Training plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Half-marathon build' }),
  specialty('MOBILITY_COACH', 'Mobility Coach', 'FITNESS', { planLabel: 'Mobility plan', planPlural: 'Mobility plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Hip mobility plan' }),
  specialty('PILATES_INSTRUCTOR', 'Pilates Instructor', 'FITNESS', { planLabel: 'Movement plan', planPlural: 'Movement plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Core stability plan' }),
  specialty('YOGA_INSTRUCTOR', 'Yoga Instructor', 'FITNESS', { planLabel: 'Practice plan', planPlural: 'Practice plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Mobility practice plan' }),
  specialty('SPORTS_COACH', 'Sports Performance Coach', 'FITNESS', { planLabel: 'Performance plan', planPlural: 'Performance plans', allowedKinds: ['FITNESS'], placeholder: 'e.g. Speed development plan' }),

  specialty('WELLNESS_COACH', 'Wellness Coach', 'WELLNESS', { planLabel: 'Wellness plan', planPlural: 'Wellness plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Energy & routine plan' }),
  specialty('HOLISTIC_PRACTITIONER', 'Holistic Wellness Practitioner', 'WELLNESS', { planLabel: 'Wellness plan', planPlural: 'Wellness plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Daily wellbeing plan' }),
  specialty('NUTRITION_COACH', 'Nutrition Coach', 'WELLNESS', { planLabel: 'Nutrition plan', planPlural: 'Nutrition plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Meal consistency plan' }),
  specialty('HEALTH_COACH', 'Health Coach', 'WELLNESS', { planLabel: 'Health plan', planPlural: 'Health plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Sustainable habits plan' }),
  specialty('SLEEP_COACH', 'Sleep Coach', 'WELLNESS', { planLabel: 'Sleep plan', planPlural: 'Sleep plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Sleep routine reset' }),
  specialty('MENOPAUSE_COACH', 'Menopause Coach', 'WELLNESS', { planLabel: 'Wellness plan', planPlural: 'Wellness plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Symptom support plan' }),

  specialty('LIFE_COACH', 'Life Coach', 'COACHING', { planLabel: 'Goal plan', planPlural: 'Goal plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Career transition goal' }),
  specialty('CAREER_COACH', 'Career Coach', 'COACHING', { planLabel: 'Career plan', planPlural: 'Career plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Job search strategy' }),
  specialty('EXECUTIVE_COACH', 'Executive Coach', 'COACHING', { planLabel: 'Leadership plan', planPlural: 'Leadership plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Leadership development plan' }),
  specialty('ACCOUNTABILITY_COACH', 'Accountability Coach', 'COACHING', { planLabel: 'Action plan', planPlural: 'Action plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Weekly execution plan' }),
  specialty('ADHD_COACH', 'ADHD Coach', 'COACHING', { planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Planning & focus system' }),
  specialty('RELATIONSHIP_COACH', 'Relationship Coach', 'COACHING', { planLabel: 'Goal plan', planPlural: 'Goal plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Communication goals' }),
  specialty('BUSINESS_COACH', 'Business Coach', 'COACHING', { planLabel: 'Business plan', planPlural: 'Business plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Client growth plan' }),

  specialty('MASSAGE_THERAPIST', 'Massage Therapist', 'BODYWORK', { planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Neck & shoulder recovery' }),
  specialty('SPORTS_MASSAGE', 'Sports Massage Therapist', 'BODYWORK', { planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Race recovery plan' }),
  specialty('STRETCH_THERAPIST', 'Stretch Therapist', 'BODYWORK', { planLabel: 'Mobility plan', planPlural: 'Mobility plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Hip mobility series' }),
  specialty('RECOVERY_SPECIALIST', 'Recovery Specialist', 'BODYWORK', { planLabel: 'Recovery plan', planPlural: 'Recovery plans', allowedKinds: ['CARE', 'FITNESS'], placeholder: 'e.g. Post-training recovery plan' }),

  specialty('BUSINESS_CONSULTANT', 'Business Consultant', 'CONSULTING', { planLabel: 'Engagement', planPlural: 'Engagements', allowedKinds: ['GENERAL'], placeholder: 'e.g. Operations improvement' }),
  specialty('MARKETING_CONSULTANT', 'Marketing Consultant', 'CONSULTING', { planLabel: 'Engagement', planPlural: 'Engagements', allowedKinds: ['GENERAL'], placeholder: 'e.g. Launch strategy' }),
  specialty('TECH_CONSULTANT', 'Technology Consultant', 'CONSULTING', { planLabel: 'Engagement', planPlural: 'Engagements', allowedKinds: ['GENERAL'], placeholder: 'e.g. Platform modernization' }),
  specialty('FINANCIAL_COACH', 'Financial Coach', 'CONSULTING', { planLabel: 'Financial plan', planPlural: 'Financial plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Debt payoff plan' }),
  specialty('ORGANIZER', 'Professional Organizer', 'CONSULTING', { planLabel: 'Project plan', planPlural: 'Project plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Home organization project' }),

  specialty('DOULA', 'Doula', 'CARE', { planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Birth support plan' }),
  specialty('LACTATION_CONSULTANT', 'Lactation Consultant', 'CARE', { planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Feeding support plan' }),
  specialty('BEHAVIOR_SUPPORT', 'Behavior Support Specialist', 'CARE', { planLabel: 'Support plan', planPlural: 'Support plans', allowedKinds: ['CARE', 'GENERAL'], placeholder: 'e.g. Routine support plan' }),
  specialty('GENERAL_SERVICE_PROVIDER', 'Other Service Professional', 'CARE', { planLabel: 'Client plan', planPlural: 'Client plans', allowedKinds: ['GENERAL'], placeholder: 'e.g. Client progress plan' }),
]

export const SPECIALTY_BY_KEY = Object.fromEntries(SPECIALTIES.map((item) => [item.key, item]))

export function specialtyForKey(key) {
  return SPECIALTY_BY_KEY[key] || SPECIALTY_BY_KEY.GENERAL_SERVICE_PROVIDER
}

export function familyForSpecialty(specialtyKey) {
  const item = specialtyForKey(specialtyKey)
  return WORKFLOW_FAMILIES[item.family] || WORKFLOW_FAMILIES.CARE
}

export function specialtyFromProviderType(providerType = '') {
  const normalized = providerType.trim().toLowerCase()
  if (!normalized) return SPECIALTY_BY_KEY.GENERAL_SERVICE_PROVIDER
  return SPECIALTIES.find((item) => item.label.toLowerCase() === normalized) ||
    SPECIALTIES.find((item) => normalized.includes(item.label.toLowerCase().replace(' specialist', '').replace(' provider', ''))) ||
    SPECIALTY_BY_KEY.GENERAL_SERVICE_PROVIDER
}
