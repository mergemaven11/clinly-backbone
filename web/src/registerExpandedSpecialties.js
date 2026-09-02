import { SPECIALTIES as CORE_SPECIALTIES, SPECIALTY_BY_KEY } from './specialtyCatalog'
import { SPECIALTIES as EXPANDED_CATALOG } from './specialtyCatalogExpanded'

const known = new Set(CORE_SPECIALTIES.map((item) => item.key))
for (const item of EXPANDED_CATALOG) {
  if (!known.has(item.key)) {
    const generalIndex = CORE_SPECIALTIES.findIndex((entry) => entry.key === 'GENERAL_SERVICE_PROVIDER')
    if (generalIndex >= 0) CORE_SPECIALTIES.splice(generalIndex, 0, item)
    else CORE_SPECIALTIES.push(item)
    known.add(item.key)
  }
  SPECIALTY_BY_KEY[item.key] = item
}
