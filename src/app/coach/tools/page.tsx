export const dynamic = 'force-dynamic'

type Tool = {
  id: string
  title: string
  subtitle: string
  description: string
  emoji: string
  color: string
  badgeColor: string
  href: string
  titleColor?: string
  descColor?: string
  linkColor?: string
}

const tools: Tool[] = [
  {
    id: 'money-diagnostic',
    title: 'Money Diagnostic',
    subtitle: 'What Are My Money Problems Stemming From?',
    description: 'A three-pillar diagnostic — People, Process, Perspective — that identifies the root causes of your client\'s financial challenges. Takes 5–8 minutes and produces a personalised breakdown.',
    emoji: '💰',
    color: 'from-yellow-900 to-yellow-950 border-yellow-600',
    badgeColor: 'bg-yellow-800 text-yellow-100',
    href: '/tools/money-diagnostic.html',
  },
  {
    id: 'press-pause-number',
    title: 'Press Pause Number',
    subtitle: 'My Personal Press Pause Number',
    description: 'A guided 5-step discovery tool that helps clients calculate the dollar threshold at which they should pause, breathe, and wait 24 hrs before any purchase — blending gut instinct with real financial data.',
    emoji: '⏸️',
    color: 'from-red-800 to-red-950 border-red-600',
    badgeColor: 'bg-red-900 text-red-100',
    href: '/tools/press-pause-number.html',
  },
  {
    id: 'mvp-alignment',
    title: 'MVP Alignment',
    subtitle: 'Money · Values · Purpose',
    description: 'A full coaching framework that maps a client\'s financial snapshot, core values, and life goals into a personalised MVP Blueprint — complete with an editable action plan and downloadable summary.',
    emoji: '🚀',
    color: 'from-blue-900 to-blue-950 border-blue-600',
    badgeColor: 'bg-blue-800 text-blue-100',
    href: '/tools/mvp-alignment.html',
  },
  {
    id: 'emotional-money-map',
    title: 'Emotional Money Map',
    subtitle: 'Understand the emotions driving financial decisions',
    description: 'A bilingual (EN/ES) coaching experience where clients identify 3 emotions holding their finances back and 3 they want to cultivate — then receive personalised micro-habits and a printable commitment card.',
    emoji: '🗺️',
    color: 'from-emerald-900 to-emerald-950 border-emerald-600',
    badgeColor: 'bg-emerald-800 text-emerald-100',
    href: '/tools/emotional-money-map.html',
  },
  {
    id: 'spending-audit',
    title: '3 Bucket Spending Audit',
    subtitle: '30-Day Spending Audit Tool',
    description: 'A bilingual (EN/ES) drag-and-drop audit tool where clients categorise 30 days of transactions into Spend Fixed, Spend Freely, and Unexpected buckets — with a subscription tracker, donut & bar charts, and a printable summary.',
    emoji: '🪣',
    color: 'from-blue-900 to-blue-950 border-blue-600',
    badgeColor: 'bg-blue-800 text-blue-100',
    href: '/tools/spending-audit.html',
  },
  {
    id: 'hop-goal-setting',
    title: 'HOP Goal Setting Sheet',
    subtitle: 'Habits · Outcomes · Performance',
    description: 'An interactive goal-setting sheet where clients build goals in three layers — the Habits they control, the Outcomes those habits produce, and the Performance measures that keep them honest. Includes worked examples, a commitment statement, progress tracking and a print-ready layout.',
    emoji: '🎯',
    color: 'from-amber-900 to-amber-950 border-amber-600',
    badgeColor: 'bg-amber-800 text-amber-100',
    href: '/tools/hop-goal-setting.html',
  },
  {
    id: 'financial-snapshot',
    title: 'Tenant Financial Snapshot & Budget',
    subtitle: 'Financial Snapshot & Monthly Budget',
    description: 'A fillable worksheet covering client information, monthly income, expenses, debt, savings & cash, retirement, insurance, financial goals and the monthly snapshot. Type straight into it on screen — income, expense and debt totals add themselves — then print or save a copy.',
    emoji: '📋',
    color: 'from-slate-800 to-slate-950 border-slate-500',
    badgeColor: 'bg-slate-700 text-slate-100',
    href: '/tools/financial-snapshot.html',
  },
  {
    id: 'money-affirmations',
    title: 'Money Affirmations',
    subtitle: 'My Personal Lines in the Sand',
    description: 'A bilingual (EN/ES) tool where clients choose 3–5 things they refuse to be with money and 3–5 affirmations of who they are becoming — or write their own — then generate a personal affirmation sheet to print or save.',
    emoji: '✨',
    color: 'from-pink-100 to-purple-200 border-pink-300',
    badgeColor: 'bg-pink-200 text-pink-900',
    titleColor: 'text-purple-950',
    descColor: 'text-purple-950/80',
    linkColor: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-950',
    href: '/tools/money-affirmations.html',
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
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`bg-gradient-to-br ${tool.color} border-2 rounded-2xl p-6 flex flex-col gap-4 shadow-md`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl leading-none">{tool.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${tool.badgeColor}`}>
                  {tool.subtitle}
                </span>
                <h2 className={`${tool.titleColor ?? 'text-white'} font-bold text-lg leading-tight`}>{tool.title}</h2>
              </div>
            </div>

            <p className={`${tool.descColor ?? 'text-white/80'} text-sm leading-relaxed flex-1`}>
              {tool.description}
            </p>

            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl ${tool.linkColor ?? 'bg-white/10 hover:bg-white/20 text-white'} text-sm font-semibold transition-colors`}
            >
              Open Tool
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
