const FAMILY_TEMPLATES = {
  AESTHETICS: {
    intakeFields: ['Treatment area', 'Skin type / sensitivity', 'Contraindications', 'Prior treatment history', 'Client goal'],
    progressFields: ['Session date', 'Treatment area', 'Response', 'Aftercare', 'Next recommended session'],
    services: ['Consultation', 'Treatment session', 'Follow-up'],
    followUpCadence: '2–6 weeks',
    overviewCards: ['Treatment series', 'Response & aftercare', 'Client preferences', 'Follow-up due'],
    clientLabel: 'Client',
  },
  BEAUTY: {
    intakeFields: ['Service goal', 'Style / look preference', 'Products used', 'Sensitivities / allergies', 'Maintenance preference'],
    progressFields: ['Service date', 'Service performed', 'Products / formula', 'Outcome', 'Recommended return'],
    services: ['Consultation', 'Primary service', 'Maintenance / touch-up'],
    followUpCadence: '2–8 weeks',
    overviewCards: ['Service history', 'Maintenance plan', 'Client preferences', 'Rebooking due'],
    clientLabel: 'Client',
  },
  REHAB: {
    intakeFields: ['Primary concern', 'Functional limitation', 'Baseline measure', 'Activity goal', 'Relevant history'],
    progressFields: ['Session date', 'Functional measure', 'Symptoms / response', 'Intervention', 'Home program / next step'],
    services: ['Evaluation', 'Treatment session', 'Progress reassessment'],
    followUpCadence: '1–2 weeks',
    overviewCards: ['Care plan', 'Outcomes & measures', 'Home program', 'Milestones'],
    clientLabel: 'Patient',
  },
  FITNESS: {
    intakeFields: ['Primary goal', 'Training history', 'Current activity', 'Limitations / considerations', 'Baseline performance'],
    progressFields: ['Check-in date', 'Program focus', 'Performance metric', 'Readiness / recovery', 'Next training goal'],
    services: ['Assessment', 'Training session', 'Program review'],
    followUpCadence: 'Weekly',
    overviewCards: ['Active program', 'Measurements', 'Check-ins', 'Performance milestones'],
    clientLabel: 'Client',
  },
  WELLNESS: {
    intakeFields: ['Primary wellbeing goal', 'Current routine', 'Barriers', 'Preferred support style', 'Baseline wellbeing'],
    progressFields: ['Check-in date', 'Focus area', 'Habit / routine', 'Self-rating', 'Next action'],
    services: ['Discovery session', 'Coaching session', 'Progress review'],
    followUpCadence: '1–2 weeks',
    overviewCards: ['Wellness plan', 'Habits & routines', 'Check-ins', 'Progress trends'],
    clientLabel: 'Client',
  },
  COACHING: {
    intakeFields: ['Primary goal', 'Desired outcome', 'Current challenge', 'Success measure', 'Support preference'],
    progressFields: ['Session date', 'Focus', 'Decision / insight', 'Commitment', 'Next action'],
    services: ['Discovery session', 'Coaching session', 'Goal review'],
    followUpCadence: 'Weekly or biweekly',
    overviewCards: ['Client goals', 'Actions & accountability', 'Milestones', 'Reflections'],
    clientLabel: 'Client',
  },
  BODYWORK: {
    intakeFields: ['Primary concern', 'Body area', 'Pressure / modality preference', 'Relevant history', 'Session goal'],
    progressFields: ['Session date', 'Focus area', 'Technique / modality', 'Response', 'Recommended follow-up'],
    services: ['Initial session', 'Bodywork session', 'Recovery follow-up'],
    followUpCadence: '1–4 weeks',
    overviewCards: ['Recovery plan', 'Session history', 'Client response', 'Next session'],
    clientLabel: 'Client',
  },
  CONSULTING: {
    intakeFields: ['Primary objective', 'Current state', 'Constraints', 'Success metric', 'Decision makers'],
    progressFields: ['Date', 'Workstream', 'Deliverable / decision', 'Status', 'Next action / owner'],
    services: ['Discovery', 'Working session', 'Review / delivery'],
    followUpCadence: 'Weekly or milestone-based',
    overviewCards: ['Engagement', 'Deliverables & decisions', 'Next actions', 'Milestones'],
    clientLabel: 'Client',
  },
  CARE: {
    intakeFields: ['Primary need', 'Current situation', 'Goals', 'Preferences', 'Relevant context'],
    progressFields: ['Check-in date', 'Focus', 'Observation / update', 'Support provided', 'Next step'],
    services: ['Intake', 'Support session', 'Follow-up'],
    followUpCadence: 'As needed',
    overviewCards: ['Client plan', 'Check-ins', 'Resources & notes', 'Follow-up'],
    clientLabel: 'Client',
  },
}

const SPECIALTY_OVERRIDES = {
  NAIL_TECHNICIAN: { intakeFields: ['Preferred shape', 'Preferred length', 'Polish / color preferences', 'Nail concerns', 'Product sensitivities'], progressFields: ['Service date', 'Service type', 'Shape / length', 'Color / product', 'Nail condition', 'Recommended rebooking'], services: ['Manicure', 'Pedicure', 'Gel / enhancement maintenance'], followUpCadence: '2–4 weeks', overviewCards: ['Service history', 'Nail health', 'Rebooking & retention', 'Client preferences'] },
  HAIR_STYLIST: { intakeFields: ['Hair texture', 'Current color / formula', 'Style goal', 'Chemical history', 'Product sensitivities'], progressFields: ['Service date', 'Cut / style', 'Color formula', 'Treatment used', 'Outcome', 'Recommended return'], overviewCards: ['Service history', 'Formula history', 'Maintenance plan', 'Rebooking due'] },
  LASER_HAIR_REMOVAL: { intakeFields: ['Treatment area', 'Skin type', 'Hair characteristics', 'Prior hair-removal methods', 'Contraindications'], progressFields: ['Session date', 'Treatment area', 'Settings / protocol', 'Skin response', 'Hair reduction progress', 'Next session'], overviewCards: ['Treatment series', 'Session response', 'Progress photos / notes', 'Next session due'] },
  PHYSICAL_THERAPIST: { intakeFields: ['Primary complaint', 'Pain / symptom rating', 'Functional limitation', 'Baseline outcome measure', 'Patient goal'], progressFields: ['Visit date', 'Outcome measure', 'ROM / strength / function', 'Interventions', 'Home exercise plan', 'Next milestone'], overviewCards: ['Plan of care', 'Outcomes & measurements', 'Home program adherence', 'Functional milestones'] },
  OCCUPATIONAL_THERAPIST: { intakeFields: ['Occupational goal', 'ADL / IADL challenge', 'Environment / context', 'Baseline function', 'Patient priority'], progressFields: ['Visit date', 'Functional task', 'Assistance level', 'Intervention', 'Home strategy', 'Next goal'], overviewCards: ['Care plans', 'Daily living goals', 'Functional progress', 'Home strategies'] },
  PERSONAL_TRAINER: { intakeFields: ['Training goal', 'Training history', 'Available equipment', 'Movement limitations', 'Baseline measures'], progressFields: ['Check-in date', 'Program block', 'Key lifts / metrics', 'Recovery', 'Adherence', 'Next target'], overviewCards: ['Active programs', 'Measurements', 'Check-ins', 'Performance milestones'] },
  DOG_TRAINER: { intakeFields: ['Dog name / age', 'Breed / mix', 'Behavior concern', 'Training history', 'Household context'], progressFields: ['Session date', 'Target behavior', 'Exercise / cue', 'Response', 'Owner practice', 'Next milestone'], services: ['Behavior assessment', 'Training session', 'Owner coaching follow-up'], followUpCadence: 'Weekly', overviewCards: ['Training plan', 'Behavior goals', 'Owner practice', 'Milestones'] },
  WEDDING_PLANNER: { intakeFields: ['Event date', 'Guest count', 'Budget range', 'Venue status', 'Top priorities'], progressFields: ['Date', 'Planning area', 'Vendor / decision', 'Status', 'Owner', 'Deadline'], services: ['Planning consultation', 'Planning package', 'Event coordination'], followUpCadence: 'Milestone-based', overviewCards: ['Wedding plan', 'Vendors & decisions', 'Budget / deadlines', 'Planning milestones'] },
  AI_CONSULTANT: { intakeFields: ['Business objective', 'Current workflow', 'Data / system constraints', 'Risk requirements', 'Success metric'], progressFields: ['Date', 'Use case / workstream', 'Experiment / deliverable', 'Result', 'Decision', 'Next action'], services: ['AI discovery', 'Pilot design', 'Implementation review'], followUpCadence: 'Weekly or milestone-based', overviewCards: ['AI roadmap', 'Pilots & experiments', 'Risks & decisions', 'Delivery milestones'] },
}

function humanize(label = '') {
  return label.replace(/\b(Provider|Specialist|Consultant|Coach|Therapist|Instructor|Artist|Practitioner)\b/g, '').replace(/\s+/g, ' ').trim()
}

export function buildSpecialtyTemplate(item) {
  const family = FAMILY_TEMPLATES[item.family] || FAMILY_TEMPLATES.CARE
  const override = SPECIALTY_OVERRIDES[item.key] || {}
  const subject = humanize(item.label) || item.label
  return {
    ...family,
    ...override,
    templateKey: item.key,
    templateName: `${item.label} workspace`,
    intakeTitle: `${subject} intake`,
    progressTitle: `${subject} progress`,
    suggestedPlans: item.samplePlans || [],
    patientLabel: item.family === 'REHAB' ? 'My care & progress' : `My ${String(item.planPlural || 'plans').toLowerCase()}`,
  }
}

export function applySpecialtyTemplate(item) {
  const template = buildSpecialtyTemplate(item)
  return {
    ...item,
    workspaceTemplate: template,
    intakeFields: item.intakeFields || template.intakeFields,
    progressFields: item.progressFields || template.progressFields,
    suggestedServices: item.suggestedServices || template.services,
    followUpCadence: item.followUpCadence || template.followUpCadence,
    overviewCards: item.overviewCards || template.overviewCards,
    patientLabel: item.patientLabel || template.patientLabel,
  }
}
