export const dynamic = 'force-dynamic'

type Tool = {
  id: string
  title: string
  subtitle: string
  description: string
  emoji: string
  /** Card colour, as a hex value */
  color: string
  href: string
}

/** Darken a hex colour by `amount` (0–1) and return an rgb() string. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * (1 - amount))
  const g = Math.round(((n >> 8) & 255) * (1 - amount))
  const b = Math.round((n & 255) * (1 - amount))
  return `rgb(${r}, ${g}, ${b})`
}

/** True when the colour is light enough that dark text reads better than white. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const luminance =
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  return luminance > 0.25
}

const tools: Tool[] = [
  {
    id: 'money-diagnostic',
    title: 'Money Diagnostic',
    subtitle: 'What Are My Money Problems Stemming From?',
    description: 'A three-pillar diagnostic — People, Process, Perspective — that identifies the root causes of your client\'s financial challenges. Takes 5–8 minutes and produces a personalised breakdown.',
    emoji: '💰',
    color: '#1F2A44',
    href: '/tools/money-diagnostic.html',
  },
  {
    id: 'press-pause-number',
    title: 'Press Pause Number',
    subtitle: 'My Personal Press Pause Number',
    description: 'A guided 5-step discovery tool that helps clients calculate the dollar threshold at which they should pause, breathe, and wait 24 hrs before any purchase — blending gut instinct with real financial data.',
    emoji: '⏸️',
    color: '#4FB3B3',
    href: '/tools/press-pause-number.html',
  },
  {
    id: 'mvp-alignment',
    title: 'MVP Alignment',
    subtitle: 'Money · Values · Purpose',
    description: 'A full coaching framework that maps a client\'s financial snapshot, core values, and life goals into a personalised MVP Blueprint — complete with an editable action plan and downloadable summary.',
    emoji: '🚀',
    color: '#C9A44A',
    href: '/tools/mvp-alignment.html',
  },
  {
    id: 'emotional-money-map',
    title: 'Emotional Money Map',
    subtitle: 'Understand the emotions driving financial decisions',
    description: 'A bilingual (EN/ES) coaching experience where clients identify 3 emotions holding their finances back and 3 they want to cultivate — then receive personalised micro-habits and a printable commitment card.',
    emoji: '🗺️',
    color: '#E97A6D',
    href: '/tools/emotional-money-map.html',
  },
  {
    id: 'spending-audit',
    title: '3 Bucket Spending Audit',
    subtitle: '30-Day Spending Audit Tool',
    description: 'A bilingual (EN/ES) drag-and-drop audit tool where clients categorise 30 days of transactions into Spend Fixed, Spend Freely, and Unexpected buckets — with a subscription tracker, donut & bar charts, and a printable summary.',
    emoji: '🪣',
    color: '#6CB7E6',
    href: '/tools/spending-audit.html',
  },
  {
    id: 'hop-goal-setting',
    title: 'HOP Goal Setting Sheet',
    subtitle: 'Habits · Outcomes · Performance',
    description: 'An interactive goal-setting sheet where clients build goals in three layers — the Habits they control, the Outcomes those habits produce, and the Performance measures that keep them honest. Includes worked examples, a commitment statement, progress tracking and a print-ready layout.',
    emoji: '🎯',
    color: '#4CAF50',
    href: '/tools/hop-goal-setting.html',
  },
  {
    id: 'financial-snapshot',
    title: 'Tenant Financial Snapshot & Budget',
    subtitle: 'Financial Snapshot & Monthly Budget',
    description: 'A fillable worksheet covering client information, monthly income, expenses, debt, savings & cash, retirement, insurance, financial goals and the monthly snapshot. Type straight into it on screen — income, expense and debt totals add themselves — then print or save a copy.',
    emoji: '📋',
    color: '#708090',
    href: '/tools/financial-snapshot.html',
  },
  {
    id: 'money-affirmations',
    title: 'Money Affirmations',
    subtitle: 'My Personal Lines in the Sand',
    description: 'A bilingual (EN/ES) tool where clients choose 3–5 things they refuse to be with money and 3–5 affirmations of who they are becoming — or write their own — then generate a personal affirmation sheet to print or save.',
    emoji: '✨',
    color: '#A88CE4',
    href: '/tools/money-affirmations.html',
  },
  {
    id: 'tfs-carfit',
    title: 'TFS CarFit',
    subtitle: 'Car Buying Blueprint · Budget · Time Frame · Commitment',
    description: 'A four-step car buying tool: rate needs and wants for the vehicle blueprint, compare three candidate vehicles against the 20% net-worth and 10% cash-flow guardrails with Consumer Reports grades, apply the 50% repair rule and build a sinking-fund savings plan, then capture the client\'s signed commitment.',
    emoji: '🚗',
    color: '#3F6E8C',
    href: '/tools/tfs-carfit.html',
  },
]

export default function CoachToolsPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-tfs-navy mb-2">Coaching Tools</h1>
        <p className="text-tfs-navy text-sm">
          Interactive tools to use with your clients during sessions. Each tool opens in a new tab so you can run it alongside your coaching call.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tools.map((tool) => {
          const light = isLight(tool.color)
          const ink = light ? '#15213B' : '#ffffff'
          return (
          <div
            key={tool.id}
            className="border-2 rounded-2xl p-6 flex flex-col gap-4 shadow-md"
            style={{
              backgroundImage: `linear-gradient(to bottom right, ${tool.color}, ${shade(tool.color, 0.1)})`,
              borderColor: shade(tool.color, 0.38),
            }}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl leading-none">{tool.emoji}</span>
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2"
                  style={{
                    backgroundColor: light ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.22)',
                    color: ink,
                  }}
                >
                  {tool.subtitle}
                </span>
                <h2 className="font-bold text-lg leading-tight" style={{ color: ink }}>{tool.title}</h2>
              </div>
            </div>

            <p className="text-sm leading-relaxed flex-1" style={{ color: ink, opacity: 0.88 }}>
              {tool.description}
            </p>

            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors hover:brightness-110"
              style={{
                backgroundColor: light ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.2)',
                color: ink,
              }}
            >
              Open Tool
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
          )
        })}
      </div>
    </div>
  )
}
