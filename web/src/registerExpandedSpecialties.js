import { SPECIALTIES as CORE_SPECIALTIES, SPECIALTY_BY_KEY } from './specialtyCatalog'
import { SPECIALTIES as EXPANDED_CATALOG } from './specialtyCatalogExpanded'
import { applySpecialtyTemplate } from './specialtyTemplates'

const GENERAL_WORKSPACE_COPY = {
  AESTHETICS: {
    placeholder: 'e.g. Active treatment plan',
    samplePlans: ['Active treatment plan', 'Treatment response & follow-up'],
  },
  BEAUTY: {
    placeholder: 'e.g. Current service plan',
    samplePlans: ['Current service plan', 'Service history & maintenance'],
  },
  REHAB: {
    placeholder: 'e.g. Active care plan',
    samplePlans: ['Active care plan', 'Progress & outcomes'],
  },
  FITNESS: {
    placeholder: 'e.g. Current training plan',
    samplePlans: ['Current training plan', 'Performance & progress'],
  },
  WELLNESS: {
    placeholder: 'e.g. Current wellness plan',
    samplePlans: ['Current wellness plan', 'Goals & check-ins'],
  },
  COACHING: {
    placeholder: 'e.g. Current goals',
    samplePlans: ['Current goals & priorities', 'Progress & action items'],
  },
  BODYWORK: {
    placeholder: 'e.g. Current recovery plan',
    samplePlans: ['Current recovery plan', 'Response & follow-up'],
  },
  CONSULTING: {
    placeholder: 'e.g. Active engagement',
    samplePlans: ['Active engagement', 'Milestones & follow-up'],
  },
  CARE: {
    placeholder: 'e.g. Active client plan',
    samplePlans: ['Active client plan', 'Progress & follow-up'],
  },
}

function generalizeWorkspaceCopy(item) {
  const copy = GENERAL_WORKSPACE_COPY[item.family]
  if (!copy) return item

  return {
    ...item,
    placeholder: copy.placeholder,
    samplePlans: [...copy.samplePlans],
  }
}

const known = new Set(CORE_SPECIALTIES.map((item) => item.key))
for (const rawItem of EXPANDED_CATALOG) {
  const item = applySpecialtyTemplate(generalizeWorkspaceCopy(rawItem))
  if (!known.has(item.key)) {
    const generalIndex = CORE_SPECIALTIES.findIndex((entry) => entry.key === 'GENERAL_SERVICE_PROVIDER')
    if (generalIndex >= 0) CORE_SPECIALTIES.splice(generalIndex, 0, item)
    else CORE_SPECIALTIES.push(item)
    known.add(item.key)
  }
  SPECIALTY_BY_KEY[item.key] = item
}

for (let index = 0; index < CORE_SPECIALTIES.length; index += 1) {
  const templated = applySpecialtyTemplate(generalizeWorkspaceCopy(CORE_SPECIALTIES[index]))
  CORE_SPECIALTIES[index] = templated
  SPECIALTY_BY_KEY[templated.key] = templated
}
