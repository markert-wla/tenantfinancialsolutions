export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

// Labeled variants for TFS Community Connect session scheduling
// (group_sessions.session_timezone stores the IANA id).
export const SESSION_TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern Time (ET)',  short: 'ET'  },
  { value: 'America/Chicago',     label: 'Central Time (CT)',  short: 'CT'  },
  { value: 'America/Denver',      label: 'Mountain Time (MT)', short: 'MT'  },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)',  short: 'PT'  },
  { value: 'America/Phoenix',     label: 'Arizona Time (MST)', short: 'MST' },
  { value: 'America/Anchorage',   label: 'Alaska Time (AKT)',  short: 'AKT' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HT)',   short: 'HT'  },
]

export function tzShort(value: string | null | undefined): string {
  if (!value) return ''
  return SESSION_TIMEZONES.find(t => t.value === value)?.short ?? value
}
