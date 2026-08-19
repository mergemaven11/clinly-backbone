export const TRACK_META = {
  CARE: {
    label: 'Wellbeing',
    eyebrow: 'Wellbeing & support',
    description: 'Shared check-ins, reflections, and progress for ongoing support relationships.',
  },
  FITNESS: {
    label: 'Fitness',
    eyebrow: 'Fitness & performance',
    description: 'Track goals, measurements, progress, training notes, and personal reflections.',
  },
  LASER_HAIR_REMOVAL: {
    label: 'Aesthetics',
    eyebrow: 'Sessions & observations',
    description: 'Track service sessions and descriptive progress observations over time.',
  },
  GENERAL: {
    label: 'General',
    eyebrow: 'Flexible relationship',
    description: 'A flexible shared space for goals, check-ins, notes, and progress.',
  },
}

export function isProviderRole(role) {
  return role === 'PROVIDER' || role === 'THERAPIST'
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function humanizeKey(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
