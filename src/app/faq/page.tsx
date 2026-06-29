import type { Metadata } from 'next'
import Link from 'next/link'
import FaqAccordion from '@/components/public/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQ | Tenant Financial Solutions',
  description:
    'Common questions about TFS financial coaching — how it works, what to expect, and how it helps tenants build lasting financial stability.',
  openGraph: {
    title: 'FAQ | Tenant Financial Solutions',
    description:
      'Common questions about TFS financial coaching — how it works, what to expect, and how it helps tenants build lasting financial stability.',
    url: '/faq',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ | Tenant Financial Solutions',
    description:
      'Common questions about TFS financial coaching — how it works, what to expect, and how it helps tenants build lasting financial stability.',
  },
}

const FAQ_ITEMS = [
  {
    question: 'Is TFS Coaching Worth It for Renters?',
    answer: [
      'At TFS, we believe every resident deserves access to financial clarity and support.',
      'Your residents are managing real pressures, and TFS coaches help them understand their financial situation, identify gaps, and build practical plans that improve stability. We don\'t judge their starting point; we focus on clear steps forward.',
      'Our coaches provide structure, tools, and consistent guidance that often leads to better communication, fewer crises, and more predictable payment behavior. When residents feel supported, the entire community benefits.',
      'TFS is here to strengthen the resident and management relationship you have with them.',
    ],
  },
  {
    question: 'What Should I Expect in My First TFS Coaching Session?',
    answer: [
      'In your first financial coaching session, your coach isn\'t there to judge you or quiz you — they\'re there to meet you. TFS coaches start by listening closely to your challenges, your goals, and the story behind your money decisions. They ask thoughtful questions, not to put you on the spot, but to understand your world and what matters most to you.',
      'At TFS, we call this your Connection Session for a reason. It\'s not an interview. It\'s not a checklist. It\'s a real conversation between two people — one who\'s carrying a lot, and one who\'s trained to help you carry it differently.',
      'The environment is fluid, not sterile. You talk, you reflect, you laugh a little, you breathe a little. Trust begins to form. And from that trust, a plan starts to take shape — one that fits you, not a template.',
      'This is where the coaching relationship begins: person to person, story to story, step by step.',
    ],
  },
  {
    question: 'How Does TFS Coaching Reduce Financial Stress?',
    answer: [
      'Financial uncertainty is the chief cause of financial stress. TFS Financial Coaching reduces client stress by helping them build both financial competence and confidence.',
    ],
  },
  {
    question: 'Will a TFS Coach Help Me Build a Monthly Cash Flow Plan That Sticks?',
    answer: [
      'Yes — and at TFS, we approach budgeting differently than what you may have experienced before.',
      'If sticking to a monthly budget has felt impossible, TFS coaches help you see budgeting through a new lens. Instead of rigid rules or unrealistic expectations, we focus on practical tools and simple frameworks that fit your real life. You\'ll learn how to make decisions that align with your values, not just your bills.',
      'At TFS, the goal isn\'t just to create a budget — it\'s to help you build a healthier relationship with your money so your budget finally works for you, not against you.',
    ],
  },
  {
    question: 'What Questions Should I Ask a Financial Coach Before Committing?',
    answer: [
      'Here are four great questions to ask any financial coach before you commit:',
    ],
    bullets: [
      'What inspired you to become a financial coach?',
      'What is your coaching philosophy?',
      'What areas do you specialize in?',
      'What skills or areas are you currently working to improve?',
    ],
  },
  {
    question: 'Can a TFS Coach Really Help Me Stop Living Paycheck to Paycheck?',
    answer: [
      'A financial coach shouldn\'t just give you advice — they should give you options you can act on immediately. TFS coaches focus on practical, realistic steps that help you create more breathing room in your budget and finally get ahead instead of constantly catching up.',
      'Breaking the cycle isn\'t about perfection — it\'s about clarity. Coaches help you build a simple, realistic plan that fits your life, not someone else\'s.',
    ],
  },
  {
    question: 'Can TFS Coaching Help Me Understand My Lease Better?',
    answer: [
      'Yes. TFS coaches help you understand the key parts of your lease so you know what to expect, what you\'re responsible for, and how it affects your monthly budget. This clarity helps you plan ahead, avoid surprises, and make confident financial decisions as a renter.',
    ],
  },
  {
    question: 'How Can TFS Coaching Prevent Eviction Risk?',
    answer: [
      'TFS coaches help clients build healthier financial habits in how they earn, give, save, spend, and invest. As clients gain clarity, they\'re better able to prioritize what matters most, align their decisions with their goals, and stay focused on the steps that move them forward.',
      'When tenants are actively engaged in coaching, we consistently see stronger follow-through, better communication, and more stability around rent. While no program can eliminate every risk, committed participation in TFS coaching meaningfully reduces the likelihood of avoidable financial crises — including those that can lead to eviction.',
    ],
  },
  {
    question: 'How Long Does It Take to See Results from TFS Coaching?',
    answer: [
      'The more committed you are to the process, the faster you begin to see progress — not just in your money, but in your peace, your decisions, and your sense of control. TFS coaches walk with you step by step, helping you build a foundation strong enough to support the future you\'re working toward.',
      'Because your life has value. Your goals matter. And your growth is worth the time it takes.',
    ],
  },
  {
    question: 'What Happens After My TFS Coaching Ends?',
    answer: [
      'At TFS, our goal is that six months to a year of coaching creates a foundation strong enough to empower you for decades. But even when your formal coaching season ends, our relationship with you doesn\'t.',
      'TFS is built on lifelong connection. Former clients are always welcome to return — whether it\'s to restart coaching, get support during a life change, or simply reconnect with the coach who walked with them before. You can come back at any time, with your previous coach or a new one, and you will always be met with respect, dignity, and zero judgment.',
      'Financial growth isn\'t a straight line. Life shifts, seasons change, and sometimes you need support again. When that happens, TFS will be right here — steady, familiar, and ready to walk with you just as we did before.',
      'Because at TFS, you\'re not just a client for a moment. You\'re part of a relationship we\'re committed to for the long run.',
    ],
  },
]

export default function FaqPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-16 px-4 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #1A2B4A 60%, #0F1B30 100%)' }}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-tfs-gold mb-3">
            Got Questions?
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Everything you need to know about TFS financial coaching — how it works, what to expect,
            and how it can help you build lasting financial stability.
          </p>
        </div>
      </section>

      {/* ── FAQ ACCORDION ────────────────────────────────────── */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-3xl mx-auto">
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #1D9E75, #1A2B4A)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-serif font-bold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-white text-lg mb-8">
            Your first Connection Session is free — meet a coach and get your questions answered in person.
          </p>
          <Link href="/register?tier=free" className="btn-primary text-base px-8 py-4">
            Step into your free Connection Session
          </Link>
        </div>
      </section>
    </>
  )
}
