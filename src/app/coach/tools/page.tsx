export const dynamic = 'force-dynamic'

const tools = [
  {
    id: 'press-pause-number',
    title: 'Press Pause Number',
    subtitle: 'My Personal Press Pause Number',
    description: 'A guided 5-step discovery tool that helps clients calculate the dollar threshold at which they should pause, breathe, and wait 24 hrs before any purchase — blending gut instinct with real financial data.',
    emoji: '⏸️',
    color: 'from-teal-900/40 to-teal-950/40 border-teal-700/30',
    badgeColor: 'bg-teal-900/50 text-teal-300',
    href: '/tools/press-pause-number.html',
  },
  {
    id: 'emotional-money-map',
    title: 'Emotional Money Map',
    subtitle: 'Understand the emotions driving financial decisions',
    description: 'A bilingual (EN/ES) coaching experience where clients identify 3 emotions holding their finances back and 3 they want to cultivate — then receive personalised micro-habits and a printable commitment card.',
    emoji: '🗺️',
    color: 'from-emerald-900/40 to-emerald-950/40 border-emerald-700/30',
    badgeColor: 'bg-emerald-900/50 text-emerald-300',
    href: '/tools/emotional-money-map.html',
  },
  {
    id: 'spending-audit',
    title: '3 Bucket Spending Audit',
    subtitle: '30-Day Spending Audit Tool',
    description: 'A bilingual (EN/ES) drag-and-drop audit tool where clients categorise 30 days of transactions into Spend Fixed, Spend Freely, and Unexpected buckets — with a subscription tracker, donut & bar charts, and a printable summary.',
    emoji: '🪣',
    color: 'from-blue-900/40 to-blue-950/40 border-blue-700/30',
    badgeColor: 'bg-blue-900/50 text-blue-300',
    href: '/tools/spending-audit.html',
  },
]

export default function CoachToolsPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Coaching Tools</h1>
        <p className="text-white/60 text-sm">
          Interactive tools to use with your clients during sessions. Each tool opens in a new tab so you can run it alongside your coaching call.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`bg-gradient-to-br ${tool.color} border rounded-2xl p-6 flex flex-col gap-4`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl leading-none">{tool.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2 ${tool.badgeColor}`}>
                  {tool.subtitle}
                </span>
                <h2 className="text-white font-bold text-lg leading-tight">{tool.title}</h2>
              </div>
            </div>

            <p className="text-white/60 text-sm leading-relaxed flex-1">
              {tool.description}
            </p>

            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
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
