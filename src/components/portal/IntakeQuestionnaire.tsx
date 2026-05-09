'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type Lang = 'en' | 'es'

const T = {
  en: {
    title:    'Connection Session Questionnaire',
    subtitle: 'Please answer a few questions so your coach can prepare for your session.',
    langLabel:'Español',
    sections: ['About You', 'Financial Confidence', 'Challenges & Savings', 'Goals & Awareness'],
    selectOne:   'Select one',
    selectAll:   'Select all that apply',
    charCount:   (n: number, max: number) => `${n} / ${max} characters`,
    submit:  'Next: Pick a Time',
    saving:  'Saving…',
    errors: {
      required: 'Please answer all required questions before continuing.',
    },
    questions: [
      {
        id: 'q1',
        section: 0,
        type: 'radio' as const,
        text: 'How would you rate your current level of comfort managing your personal finances?',
        options: ['Very comfortable', 'Somewhat comfortable', 'Neutral', 'Somewhat uncomfortable', 'Very uncomfortable'],
      },
      {
        id: 'q2',
        section: 0,
        type: 'checkbox' as const,
        text: 'Which of the following best describes your current employment status?',
        options: ['Employed full time', 'Employed part time', 'Self-Employed', 'Unemployed', 'Retired', 'Student', 'Other'],
      },
      {
        id: 'q3',
        section: 1,
        type: 'radio' as const,
        text: 'How confident are you in your ability to pay rent on time each month?',
        options: ['Very confident', 'Somewhat confident', 'Neutral', 'Not very confident', 'Not confident at all'],
      },
      {
        id: 'q4',
        section: 1,
        type: 'radio' as const,
        text: 'Do you currently follow a monthly budget?',
        options: [
          'Yes, consistently',
          'Yes, but not consistently',
          'No, but I would like to start',
          'No, and I am not interested at this time',
        ],
      },
      {
        id: 'q5',
        section: 2,
        type: 'checkbox' as const,
        text: 'Which of the following financial challenges have you experienced in the last 12 months?',
        options: [
          'Difficulty paying rent on time',
          'Unexpected expenses (medical, car repair, etc.)',
          'High credit card or loan debt',
          'Insufficient savings or emergency fund',
          'Job loss or reduced income',
          'Difficulty affording basic necessities (food, utilities, transportation)',
          'None of the above',
        ],
      },
      {
        id: 'q6',
        section: 2,
        type: 'radio' as const,
        text: 'How would you describe your current savings situation?',
        options: [
          'I have 3 or more months of expenses saved',
          'I have 1–2 months of expenses saved',
          'I have some savings, but less than 1 month of expenses',
          'I have no savings at this time',
        ],
      },
      {
        id: 'q7',
        section: 3,
        type: 'text' as const,
        text: 'What is one thing that has motivated you to manage your personal finances differently?',
        maxLength: 100,
      },
      {
        id: 'q8',
        section: 3,
        type: 'radio' as const,
        text: 'What was it like for you growing up around money?',
        options: [
          'Parents never discussed anything financial with me',
          'I witnessed money fights often',
          'Single parent household — paycheck to paycheck',
          'I was taught financial stewardship',
        ],
      },
      {
        id: 'q9',
        section: 3,
        type: 'radio' as const,
        text: 'When making money decisions, what is your current process?',
        options: [
          'Fly by the seat of my pants',
          'Phone a friend',
          'Look at what the culture is doing with money',
          'Freeze until I think I know what I am doing',
          'Trust my gut of right and wrong',
        ],
      },
      {
        id: 'q10',
        section: 3,
        type: 'text' as const,
        text: 'What is your primary financial goal for the next 12 months?',
        maxLength: 200,
      },
    ],
  },
  es: {
    title:    'Cuestionario de Sesión de Conexión',
    subtitle: 'Por favor, responda algunas preguntas para que su coach pueda prepararse para su sesión.',
    langLabel:'English',
    sections: ['Sobre Usted', 'Confianza Financiera', 'Retos y Ahorros', 'Metas y Conciencia'],
    selectOne:   'Seleccione uno',
    selectAll:   'Seleccione todos los que apliquen',
    charCount:   (n: number, max: number) => `${n} / ${max} caracteres`,
    submit:  'Siguiente: Elegir Horario',
    saving:  'Guardando…',
    errors: {
      required: 'Por favor, responda todas las preguntas requeridas antes de continuar.',
    },
    questions: [
      {
        id: 'q1',
        section: 0,
        type: 'radio' as const,
        text: '¿Cómo calificaría su nivel actual de comodidad al gestionar sus finanzas personales?',
        options: ['Muy cómodo/a', 'Algo cómodo/a', 'Neutral', 'Algo incómodo/a', 'Muy incómodo/a'],
      },
      {
        id: 'q2',
        section: 0,
        type: 'checkbox' as const,
        text: '¿Cuál de las siguientes opciones describe mejor su situación laboral actual?',
        options: ['Empleado/a a tiempo completo', 'Empleado/a a tiempo parcial', 'Trabajador/a independiente', 'Desempleado/a', 'Jubilado/a', 'Estudiante', 'Otro'],
      },
      {
        id: 'q3',
        section: 1,
        type: 'radio' as const,
        text: '¿Qué tan seguro/a se siente de pagar la renta a tiempo cada mes?',
        options: ['Muy seguro/a', 'Algo seguro/a', 'Neutral', 'Poco seguro/a', 'Nada seguro/a'],
      },
      {
        id: 'q4',
        section: 1,
        type: 'radio' as const,
        text: '¿Actualmente sigue un presupuesto mensual?',
        options: [
          'Sí, de manera consistente',
          'Sí, pero no de manera consistente',
          'No, pero me gustaría empezar',
          'No, y no me interesa por ahora',
        ],
      },
      {
        id: 'q5',
        section: 2,
        type: 'checkbox' as const,
        text: '¿Cuáles de los siguientes retos financieros ha experimentado en los últimos 12 meses?',
        options: [
          'Dificultad para pagar la renta a tiempo',
          'Gastos inesperados (médicos, reparación de auto, etc.)',
          'Deudas elevadas de tarjeta de crédito o préstamos',
          'Ahorros insuficientes o fondo de emergencia',
          'Pérdida de empleo o reducción de ingresos',
          'Dificultad para cubrir necesidades básicas (comida, servicios, transporte)',
          'Ninguna de las anteriores',
        ],
      },
      {
        id: 'q6',
        section: 2,
        type: 'radio' as const,
        text: '¿Cómo describiría su situación de ahorros actual?',
        options: [
          'Tengo ahorros para 3 o más meses de gastos',
          'Tengo ahorros para 1–2 meses de gastos',
          'Tengo algunos ahorros, pero menos de 1 mes de gastos',
          'No tengo ahorros en este momento',
        ],
      },
      {
        id: 'q7',
        section: 3,
        type: 'text' as const,
        text: '¿Qué es lo que le ha motivado a gestionar sus finanzas personales de manera diferente?',
        maxLength: 100,
      },
      {
        id: 'q8',
        section: 3,
        type: 'radio' as const,
        text: '¿Cómo fue su experiencia creciendo alrededor del dinero?',
        options: [
          'Mis padres nunca hablaban de finanzas conmigo',
          'Con frecuencia presencié peleas por dinero',
          'Hogar monoparental — de cheque en cheque',
          'Me enseñaron la administración financiera',
        ],
      },
      {
        id: 'q9',
        section: 3,
        type: 'radio' as const,
        text: '¿Cuál es su proceso actual al tomar decisiones financieras?',
        options: [
          'Actúo sin pensar mucho',
          'Llamo a un amigo/a',
          'Observo lo que hace la cultura con el dinero',
          'Me paralizo hasta que creo saber qué hacer',
          'Confío en mi instinto de lo correcto e incorrecto',
        ],
      },
      {
        id: 'q10',
        section: 3,
        type: 'text' as const,
        text: '¿Cuál es su principal objetivo financiero para los próximos 12 meses?',
        maxLength: 200,
      },
    ],
  },
}

type Answers = Record<string, string | string[]>

export default function IntakeQuestionnaire() {
  const router  = useRouter()
  const [lang,    setLang]    = useState<Lang>('en')
  const [answers, setAnswers] = useState<Answers>({})
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const t = T[lang]

  function setRadio(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  function toggleCheckbox(id: string, value: string) {
    setAnswers(prev => {
      const current = (prev[id] as string[] | undefined) ?? []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [id]: next }
    })
  }

  function setText(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  async function handleSubmit() {
    // Validate all questions answered
    const missing = t.questions.some(q => {
      if (q.type === 'radio') return !answers[q.id]
      if (q.type === 'checkbox') return !((answers[q.id] as string[] | undefined)?.length)
      if (q.type === 'text') return !(answers[q.id] as string | undefined)?.trim()
      return false
    })
    if (missing) {
      setError(t.errors.required)
      return
    }
    setError('')
    setSaving(true)
    const res = await fetch('/api/portal/intake', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ responses: answers, language: lang }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to save. Please try again.')
      return
    }
    router.refresh()
  }

  // Group questions by section
  const sections = [0, 1, 2, 3]

  return (
    <div className="space-y-8">
      {/* Language toggle */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { setLang(l => l === 'en' ? 'es' : 'en'); setAnswers({}) }}
          className="text-sm text-tfs-teal hover:underline font-medium"
        >
          {t.langLabel}
        </button>
      </div>

      <div className="card">
        <p className="text-sm text-tfs-slate">{t.subtitle}</p>
      </div>

      {sections.map(sectionIdx => {
        const sectionQs = t.questions.filter(q => q.section === sectionIdx)
        return (
          <div key={sectionIdx} className="card space-y-6">
            <h2 className="font-serif font-bold text-tfs-navy text-xl border-b border-gray-100 pb-3">
              Section {String.fromCharCode(65 + sectionIdx)}. {t.sections[sectionIdx]}
            </h2>

            {sectionQs.map((q, qIdx) => {
              const globalIdx = t.questions.findIndex(gq => gq.id === q.id)
              return (
                <div key={q.id} className="space-y-3">
                  <p className="text-sm font-medium text-tfs-navy">
                    {globalIdx + 1}.{'  '}{q.text}
                  </p>
                  {q.type === 'radio' && q.options && (
                    <p className="text-xs text-tfs-slate">{t.selectOne}</p>
                  )}
                  {q.type === 'checkbox' && (
                    <p className="text-xs text-tfs-slate">{t.selectAll}</p>
                  )}

                  {q.type === 'radio' && q.options && (
                    <div className="space-y-2">
                      {q.options.map(opt => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="radio"
                            name={`${lang}-${q.id}`}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setRadio(q.id, opt)}
                            className="accent-tfs-teal w-4 h-4 shrink-0"
                          />
                          <span className="text-sm text-tfs-navy group-hover:text-tfs-teal transition-colors">
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'checkbox' && q.options && (
                    <div className="space-y-2">
                      {q.options.map(opt => {
                        const checked = ((answers[q.id] as string[] | undefined) ?? []).includes(opt)
                        return (
                          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCheckbox(q.id, opt)}
                              className="accent-tfs-teal w-4 h-4 shrink-0"
                            />
                            <span className="text-sm text-tfs-navy group-hover:text-tfs-teal transition-colors">
                              {opt}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {q.type === 'text' && (
                    <div>
                      <textarea
                        value={(answers[q.id] as string | undefined) ?? ''}
                        onChange={e => setText(q.id, e.target.value)}
                        maxLength={q.maxLength}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfs-teal resize-none"
                        placeholder="Your answer…"
                      />
                      <p className="text-xs text-tfs-slate mt-1 text-right">
                        {t.charCount(
                          ((answers[q.id] as string | undefined) ?? '').length,
                          q.maxLength ?? 50
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-8"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? t.saving : t.submit}
        </button>
      </div>
    </div>
  )
}
