import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./demoApi', () => ({ IS_DEMO_MODE: true }))

import './registerExpandedSpecialties'
import PortalWorkspace from './PortalWorkspace'

const tracks = [
  { id: 'track-general', kind: 'GENERAL', title: 'General plan' },
  { id: 'track-care', kind: 'CARE', title: 'Care plan' },
  { id: 'track-laser', kind: 'LASER_HAIR_REMOVAL', title: 'Treatment plan' },
  { id: 'track-fitness', kind: 'FITNESS', title: 'Training plan' },
]

function renderWorkspace(overrides = {}) {
  return render(
    <PortalWorkspace
      isProvider
      people={[]}
      tracks={tracks}
      selectedTrack={tracks[0]}
      entries={[]}
      onSelectTrack={vi.fn()}
      onCreateTrack={vi.fn()}
      onCreateEntry={vi.fn()}
      {...overrides}
    />,
  )
}

describe('PortalWorkspace specialty selector', () => {
  it('shows matching providers immediately and prioritizes names that start with the typed text', () => {
    renderWorkspace()

    const search = screen.getByLabelText('Search specialties')
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'a' } })

    const listbox = screen.getByRole('listbox')
    const options = within(listbox).getAllByRole('option')
    const labels = options.map((option) => option.querySelector('strong')?.textContent || '')

    expect(screen.getByText('Acne Specialist')).toBeInTheDocument()
    expect(screen.getByText('Academic Coach')).toBeInTheDocument()
    expect(labels[0].startsWith('A')).toBe(true)
  })

  it('offers a General – Provider fallback that switches to the neutral client-plan template', () => {
    renderWorkspace()

    fireEvent.click(screen.getByRole('button', { name: 'General – Provider' }))

    expect(screen.getByRole('heading', { name: 'Client plans' })).toBeInTheDocument()
    expect(screen.getByText('Client progress plan')).toBeInTheDocument()
  })

  it('links to the complete GitHub provider directory', () => {
    renderWorkspace()

    expect(screen.getByRole('link', { name: 'Browse all provider types' })).toHaveAttribute(
      'href',
      'https://github.com/mergemaven11/clinly-backbone/blob/main/docs/SPECIALTY_PROVIDERS.md',
    )
  })
})