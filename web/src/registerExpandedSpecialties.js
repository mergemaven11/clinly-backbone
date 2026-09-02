import { SPECIALTIES as CORE_SPECIALTIES, SPECIALTY_BY_KEY } from './specialtyCatalog'
import { SPECIALTIES as EXPANDED_CATALOG } from './specialtyCatalogExpanded'
import { applySpecialtyTemplate } from './specialtyTemplates'

const known = new Set(CORE_SPECIALTIES.map((item) => item.key))
for (const rawItem of EXPANDED_CATALOG) {
  const item = applySpecialtyTemplate(rawItem)
  if (!known.has(item.key)) {
    const generalIndex = CORE_SPECIALTIES.findIndex((entry) => entry.key === 'GENERAL_SERVICE_PROVIDER')
    if (generalIndex >= 0) CORE_SPECIALTIES.splice(generalIndex, 0, item)
    else CORE_SPECIALTIES.push(item)
    known.add(item.key)
  }
  SPECIALTY_BY_KEY[item.key] = item
}

for (let index = 0; index < CORE_SPECIALTIES.length; index += 1) {
  const templated = applySpecialtyTemplate(CORE_SPECIALTIES[index])
  CORE_SPECIALTIES[index] = templated
  SPECIALTY_BY_KEY[templated.key] = templated
}
