import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PeopleWorkspace from './PeopleWorkspace'

const people = [
  { id: 'person-1', email: 'amara@example.com' },
  { id: 'person-2', email: 'theodore@example.com' },
]

function renderWorkspace(overrides = {}) {
  return render(
    <PeopleWorkspace
      people={people}
      tracks={[]}
      conversations={[]}
      onCreatePerson={vi.fn()}
      onMessage={vi.fn()}
      {...overrides}
    />,
  )
}

describe('PeopleWorkspace', () => {
  it('filters people by email without sending data to the API', () => {
    renderWorkspace()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search people' }), {
      target: { value: 'amara' },
    })

    expect(screen.getByText('amara@example.com')).toBeInTheDocument()
    expect(screen.queryByText('theodore@example.com')).not.toBeInTheDocument()
  })

  it('opens the create portal form on demand', () => {
    renderWorkspace()

    expect(screen.queryByRole('heading', { name: 'Create a connected portal' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Add person' }))

    expect(screen.getByRole('heading', { name: 'Create a connected portal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Temporary password')).toHaveAttribute('minLength', '8')
  })

  it('shows a useful empty state when a search has no matches', () => {
    renderWorkspace()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search people' }), {
      target: { value: 'missing' },
    })

    expect(screen.getByText('No matches')).toBeInTheDocument()
  })
})
