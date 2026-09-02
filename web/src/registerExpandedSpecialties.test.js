import { describe, expect, it } from 'vitest'

import './registerExpandedSpecialties'
import { SPECIALTY_BY_KEY } from './specialtyCatalog'

const GENERAL_TITLES = {
  AESTHETICS: ['Active treatment plan', 'Treatment response & follow-up'],
  BEAUTY: ['Current service plan', 'Service history & maintenance'],
  REHAB: ['Active care plan', 'Progress & outcomes'],
  FITNESS: ['Current training plan', 'Performance & progress'],
  WELLNESS: ['Current wellness plan', 'Goals & check-ins'],
  COACHING: ['Current goals & priorities', 'Progress & action items'],
  BODYWORK: ['Current recovery plan', 'Response & follow-up'],
  CONSULTING: ['Active engagement', 'Milestones & follow-up'],
  CARE: ['Active client plan', 'Progress & follow-up'],
}

describe('specialty workspace titles', () => {
  it('uses broad reusable titles for specific aesthetics specialties', () => {
    expect(SPECIALTY_BY_KEY.LASER_HAIR_REMOVAL.samplePlans).toEqual(GENERAL_TITLES.AESTHETICS)
    expect(SPECIALTY_BY_KEY.TATTOO_REMOVAL.samplePlans).toEqual(GENERAL_TITLES.AESTHETICS)
    expect(SPECIALTY_BY_KEY.SKINCARE_SPECIALIST.samplePlans).toEqual(GENERAL_TITLES.AESTHETICS)
  })

  it('keeps broad titles across workflow families', () => {
    for (const specialty of Object.values(SPECIALTY_BY_KEY)) {
      const expected = GENERAL_TITLES[specialty.family]
      if (expected) expect(specialty.samplePlans).toEqual(expected)
    }
  })
})
