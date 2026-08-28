'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  calculateRentStabilityScore,
  type BucketKey,
  type ScoreBand,
} from '@/lib/budget/rentStabilityScore'

type Lang = 'en' | 'es'

export type BudgetRow = { id: string; bucket: BucketKey; label: string; amount: number }

type Props = {
  monthISO: string
  monthLabelEn: string
  monthLabelEs: string
  initialIncome: number
  initialRent: number
  initialRows: BudgetRow[]
}

const BUCKETS: BucketKey[] = ['fixed', 'freely', 'unexpected']

const T = {
  en: {
    langLabel: 'Español',
    incomeHeading: 'Your month',
    income: 'Monthly take-home income',
    rent: 'Monthly rent',
    bucketsHeading: 'Where your money goes',
    bucketsIntro:
      'Everything except rent goes into one of three buckets — the same three you use in the Spending Audit.',
    addLine: 'Add a line',
    linePlaceholder: 'What is it?',
    remove: 'Remove',
    scoreHeading: 'Rent Stability Score',
    ofIncome: 'of income',
    rentShare: 'Rent is',
    planned: 'Total planned',
    leftOver: 'Left over',
    overspent: 'Over budget by',
    breakdownHeading: 'How the score is made up',
    save: 'Save my budget',
    saving: 'Saving…',
    saved: 'Saved',
    saveError: 'Your budget could not be saved. Please try again.',
    prototype:
      'Prototype — in testing with your coach. Numbers you save here are stored to your account.',
    buckets: {
      fixed: { name: 'Spend Fixed', desc: 'Recurring & predictable' },
      freely: { name: 'Spend Freely', desc: 'Discretionary & lifestyle' },
      unexpected: { name: 'Unexpected', desc: 'Unplanned & set aside for surprises' },
    },
    bands: {
      stable: 'Stable',
      building: 'Building',
      at_risk: 'At Risk',
      critical: 'Needs Attention',
    },
    parts: {
      rentBurden: 'Rent burden',
      fixedLoad: 'Fixed obligations',
      margin: 'Monthly margin',
      cushion: 'Unexpected cushion',
    },
  },
  es: {
    langLabel: 'English',
    incomeHeading: 'Tu mes',
    income: 'Ingreso mensual neto',
    rent: 'Renta mensual',
    bucketsHeading: 'A dónde va tu dinero',
    bucketsIntro:
      'Todo excepto la renta va en una de tres categorías — las mismas tres de la Auditoría de Gastos.',
    addLine: 'Agregar una línea',
    linePlaceholder: '¿Qué es?',
    remove: 'Eliminar',
    scoreHeading: 'Puntaje de Estabilidad de Renta',
    ofIncome: 'del ingreso',
    rentShare: 'La renta es',
    planned: 'Total planificado',
    leftOver: 'Sobrante',
    overspent: 'Excedido por',
    breakdownHeading: 'Cómo se compone el puntaje',
    save: 'Guardar mi presupuesto',
    saving: 'Guardando…',
    saved: 'Guardado',
    saveError: 'No se pudo guardar tu presupuesto. Inténtalo de nuevo.',
    prototype:
      'Prototipo — en prueba con tu coach. Los números que guardes aquí se almacenan en tu cuenta.',
    buckets: {
      fixed: { name: 'Gasto Fijo', desc: 'Recurrente y predecible' },
      freely: { name: 'Gasto Libre', desc: 'Discrecional y estilo de vida' },
      unexpected: { name: 'Inesperado', desc: 'No planificado y reservado para sorpresas' },
    },
    bands: {
      stable: 'Estable',
      building: 'En Construcción',
      at_risk: 'En Riesgo',
      critical: 'Requiere Atención',
    },
    parts: {
      rentBurden: 'Carga de renta',
      fixedLoad: 'Obligaciones fijas',
      margin: 'Margen mensual',
      cushion: 'Reserva para imprevistos',
    },
  },
} as const

const BUCKET_STYLE: Record<BucketKey, { chip: string; bar: string; ring: string }> = {
  fixed: { chip: 'bg-blue-50 text-blue-800 border-blue-200', bar: 'bg-blue-500', ring: 'border-blue-200' },
  freely: { chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500', ring: 'border-emerald-200' },
  unexpected: { chip: 'bg-amber-50 text-amber-900 border-amber-200', bar: 'bg-amber-500', ring: 'border-amber-200' },
}

const BAND_STYLE: Record<ScoreBand, string> = {
  stable: 'text-emerald-700',
  building: 'text-tfs-teal',
  at_risk: 'text-amber-700',
  critical: 'text-red-700',
}

function money(n: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0)
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

let tempId = 0
function newRow(bucket: BucketKey): BudgetRow {
  tempId += 1
  return { id: `new-${tempId}`, bucket, label: '', amount: 0 }
}

export default function BudgetToolClient({
  monthISO,
  monthLabelEn,
  monthLabelEs,
  initialIncome,
  initialRent,
  initialRows,
}: Props) {
  const [lang, setLang] = useState<Lang>('en')
  const [income, setIncome] = useState<string>(initialIncome ? String(initialIncome) : '')
  const [rent, setRent] = useState<string>(initialRent ? String(initialRent) : '')
  const [rows, setRows] = useState<BudgetRow[]>(
    initialRows.length ? initialRows : BUCKETS.map((b) => newRow(b))
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const t = T[lang]
  const monthLabel = lang === 'es' ? monthLabelEs : monthLabelEn

  const totals = useMemo(() => {
    const acc: Record<BucketKey, number> = { fixed: 0, freely: 0, unexpected: 0 }
    for (const row of rows) acc[row.bucket] += Number(row.amount) || 0
    return acc
  }, [rows])

  const result = useMemo(
    () =>
      calculateRentStabilityScore({
        monthlyIncome: Number(income) || 0,
        rentAmount: Number(rent) || 0,
        totals,
      }),
    [income, rent, totals]
  )

  const incomeNum = Number(income) || 0

  function updateRow(id: string, patch: Partial<BudgetRow>) {
    setStatus('idle')
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setStatus('idle')
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function addRow(bucket: BucketKey) {
    setStatus('idle')
    setRows((prev) => [...prev, newRow(bucket)])
  }

  async function save() {
    setStatus('saving')
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) {
      setStatus('error')
      return
    }

    const { data: monthRow, error: monthError } = await supabase
      .from('budget_months')
      .upsert(
        {
          client_id: userId,
          month: monthISO,
          monthly_income: Number(income) || 0,
          rent_amount: Number(rent) || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,month' }
      )
      .select('id')
      .single()

    if (monthError || !monthRow) {
      setStatus('error')
      return
    }

    const { error: deleteError } = await supabase
      .from('budget_entries')
      .delete()
      .eq('budget_month_id', monthRow.id)

    if (deleteError) {
      setStatus('error')
      return
    }

    const keep = rows.filter((r) => r.label.trim() !== '' || (Number(r.amount) || 0) > 0)
    if (keep.length) {
      const { error: insertError } = await supabase.from('budget_entries').insert(
        keep.map((r, i) => ({
          budget_month_id: monthRow.id,
          client_id: userId,
          bucket: r.bucket,
          label: r.label.trim() || t.buckets[r.bucket].name,
          amount: Number(r.amount) || 0,
          sort_order: i,
        }))
      )
      if (insertError) {
        setStatus('error')
        return
      }
    }

    setStatus('saved')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-3xl font-serif font-bold text-tfs-navy">Tenant Money Compass</h1>
          <p className="text-tfs-slate text-sm mt-1">{monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          className="px-3 py-1.5 rounded-lg border border-tfs-navy/20 text-tfs-navy text-sm hover:bg-tfs-navy/5"
        >
          {t.langLabel}
        </button>
      </div>

      <p className="text-xs text-tfs-slate bg-tfs-teal-light border border-tfs-teal/20 rounded-lg px-3 py-2 mb-8">
        {t.prototype}
      </p>

      {/* Income + rent */}
      <section className="bg-white border border-tfs-navy/10 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-tfs-navy mb-4">{t.incomeHeading}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label={t.income} value={income} onChange={(v) => { setStatus('idle'); setIncome(v) }} />
          <MoneyField label={t.rent} value={rent} onChange={(v) => { setStatus('idle'); setRent(v) }} />
        </div>
      </section>

      {/* Buckets */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-tfs-navy">{t.bucketsHeading}</h2>
        <p className="text-sm text-tfs-slate mb-4">{t.bucketsIntro}</p>

        <div className="space-y-4">
          {BUCKETS.map((bucket) => {
            const bucketRows = rows.filter((r) => r.bucket === bucket)
            const share = incomeNum > 0 ? totals[bucket] / incomeNum : 0
            return (
              <div key={bucket} className={`bg-white border rounded-xl p-5 ${BUCKET_STYLE[bucket].ring}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className={`px-2.5 py-1 rounded-full border text-sm font-semibold ${BUCKET_STYLE[bucket].chip}`}>
                    {t.buckets[bucket].name}
                  </span>
                  <span className="text-sm font-semibold text-tfs-navy">
                    {money(totals[bucket], lang)}
                    {incomeNum > 0 && (
                      <span className="text-tfs-slate font-normal"> · {pct(share)} {t.ofIncome}</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-tfs-slate mb-4">{t.buckets[bucket].desc}</p>

                <div className="space-y-2">
                  {bucketRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.label}
                        placeholder={t.linePlaceholder}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-tfs-navy/15 text-sm text-tfs-navy placeholder:text-tfs-slate/60 focus:outline-none focus:ring-2 focus:ring-tfs-teal/40"
                      />
                      <div className="relative w-32 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tfs-slate text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={row.amount === 0 ? '' : row.amount}
                          onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-tfs-navy/15 text-sm text-tfs-navy text-right focus:outline-none focus:ring-2 focus:ring-tfs-teal/40"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        aria-label={t.remove}
                        className="p-2 text-tfs-slate hover:text-red-600 shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addRow(bucket)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-tfs-teal hover:text-tfs-teal-dark"
                >
                  <Plus size={15} /> {t.addLine}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Score */}
      <section className="bg-white border border-tfs-navy/10 rounded-xl p-5 mb-6">
        <h2 className="text-lg font-semibold text-tfs-navy mb-4">{t.scoreHeading}</h2>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-5">
          <div>
            <span className={`text-5xl font-bold ${BAND_STYLE[result.band]}`}>{result.score}</span>
            <span className="text-tfs-slate text-lg">/100</span>
            <p className={`text-sm font-semibold mt-1 ${BAND_STYLE[result.band]}`}>{t.bands[result.band]}</p>
          </div>
          <dl className="text-sm text-tfs-slate space-y-1">
            {result.rentToIncome !== null && (
              <div>
                {t.rentShare} <strong className="text-tfs-navy">{pct(result.rentToIncome)}</strong> {t.ofIncome}
              </div>
            )}
            <div>
              {t.planned}: <strong className="text-tfs-navy">{money(result.totalPlanned, lang)}</strong>
            </div>
            <div>
              {result.leftOver >= 0 ? t.leftOver : t.overspent}:{' '}
              <strong className={result.leftOver >= 0 ? 'text-tfs-navy' : 'text-red-700'}>
                {money(Math.abs(result.leftOver), lang)}
              </strong>
            </div>
          </dl>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-tfs-slate mb-2">
          {t.breakdownHeading}
        </p>
        <div className="space-y-2">
          {result.breakdown.map((part) => (
            <div key={part.key}>
              <div className="flex justify-between text-sm text-tfs-navy mb-0.5">
                <span>{t.parts[part.key]}</span>
                <span className="text-tfs-slate">
                  {part.earned} / {part.max}
                </span>
              </div>
              <div className="h-2 rounded-full bg-tfs-navy/10 overflow-hidden">
                <div
                  className="h-full bg-tfs-teal rounded-full"
                  style={{ width: `${part.max > 0 ? (part.earned / part.max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === 'saving'}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tfs-teal-button text-white text-sm font-semibold hover:bg-tfs-teal-dark disabled:opacity-60"
        >
          {status === 'saving' ? <Loader2 size={16} className="animate-spin" /> : null}
          {status === 'saving' ? t.saving : t.save}
        </button>
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Check size={16} /> {t.saved}
          </span>
        )}
        {status === 'error' && <span className="text-sm text-red-700">{t.saveError}</span>}
      </div>
    </div>
  )
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-tfs-navy mb-1">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tfs-slate text-sm">$</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-7 pr-3 py-2 rounded-lg border border-tfs-navy/15 text-tfs-navy focus:outline-none focus:ring-2 focus:ring-tfs-teal/40"
        />
      </div>
    </label>
  )
}
