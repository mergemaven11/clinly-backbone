import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEMO_PASSWORD,
  DEMO_PATIENT_EMAIL,
  DEMO_PATIENT_TOKEN,
  DEMO_PROVIDER_EMAIL,
  DEMO_PROVIDER_TOKEN,
  demoApiRequest,
  resetDemoState,
} from './demoApi'

beforeEach(() => resetDemoState())

describe('Clinly demo API', () => {
  it('accepts only the published demo credentials', async () => {
    const login = await demoApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: DEMO_PROVIDER_EMAIL, password: DEMO_PASSWORD }),
    })

    expect(login.access_token).toBe(DEMO_PROVIDER_TOKEN)
    await expect(demoApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: DEMO_PROVIDER_EMAIL, password: 'wrong-password' }),
    })).rejects.toMatchObject({ status: 401 })
  })

  it('serves a complete seeded provider workspace', async () => {
    const options = { token: DEMO_PROVIDER_TOKEN }
    const [user, people, tracks, conversations] = await Promise.all([
      demoApiRequest('/account/me', options),
      demoApiRequest('/participants', options),
      demoApiRequest('/portal/tracks/me', options),
      demoApiRequest('/conversations/me', options),
    ])

    expect(user.role).toBe('PROVIDER')
    expect(people).toHaveLength(3)
    expect(tracks).toHaveLength(4)
    expect(conversations).toHaveLength(3)
  })

  it('keeps demo mutations inside the browser-side sandbox', async () => {
    const options = { token: DEMO_PROVIDER_TOKEN }
    const created = await demoApiRequest('/portal/tracks', {
      ...options,
      method: 'POST',
      body: JSON.stringify({ client_id: 'demo-person-1', kind: 'GENERAL', title: 'Recruiter walkthrough' }),
    })
    const tracks = await demoApiRequest('/portal/tracks/me', options)

    expect(created.title).toBe('Recruiter walkthrough')
    expect(tracks[0].id).toBe(created.id)

    resetDemoState()
    expect(await demoApiRequest('/portal/tracks/me', options)).toHaveLength(4)
  })

  it('limits the patient demo to that patient\'s tracks and conversation', async () => {
    const login = await demoApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: DEMO_PATIENT_EMAIL, password: DEMO_PASSWORD }),
    })
    const options = { token: login.access_token }
    const [user, tracks, conversations] = await Promise.all([
      demoApiRequest('/account/me', options),
      demoApiRequest('/portal/tracks/me', options),
      demoApiRequest('/conversations/me', options),
    ])

    expect(login.access_token).toBe(DEMO_PATIENT_TOKEN)
    expect(user.role).toBe('PARTICIPANT')
    expect(tracks).toHaveLength(2)
    expect(conversations).toHaveLength(1)
  })
})
