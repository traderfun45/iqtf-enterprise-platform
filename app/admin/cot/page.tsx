'use client'

import { FormEvent, useEffect, useState } from 'react'
import { API } from '@/lib/api'

type CotData = {
  id?: number
  symbol: string
  reportDate: string
  openInterest?: number
  producerLong?: number
  producerShort?: number
  swapDealerLong?: number
  swapDealerShort?: number
  managedMoneyLong?: number
  managedMoneyShort?: number
  otherReportablesLong?: number
  otherReportablesShort?: number
  source?: string
  note?: string
}

type CotAnalysis = {
  managedMoneyNet: number
  producerNet: number
  swapDealerNet: number
  otherReportablesNet: number
  managedMoneyNetChange: number
  producerNetChange: number
  swapDealerNetChange: number
  otherReportablesNetChange: number
  positioning: string
  confidence: string
  score: number
  reasons: string[]
}

const emptyForm: CotData = {
  symbol: 'GC',
  reportDate: new Date().toISOString().slice(0, 10),
  source: 'CFTC',
  note: '',
}

export default function CotAdminPage() {
  const [form, setForm] = useState<CotData>(emptyForm)
  const [history, setHistory] = useState<CotData[]>([])
  const [analysis, setAnalysis] = useState<CotAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadHistory() {
    try {
      const response = await fetch(
        `${API}/api/cot/history?symbol=${form.symbol}`,
        { cache: 'no-store' },
      )

      const result = await response.json()
      setHistory(result.data ?? [])
    } catch {
      setMessage('Unable to load COT history')
    }
  }

  async function loadAnalysis() {
    try {
      const response = await fetch(
        `${API}/api/cot/analysis?symbol=${form.symbol}`,
        { cache: 'no-store' },
      )

      if (!response.ok) {
        setAnalysis(null)
        return
      }

      const result = await response.json()
      setAnalysis(result.intelligence ?? null)
    } catch {
      setAnalysis(null)
    }
  }

  useEffect(() => {
    loadHistory()
    loadAnalysis()
  }, [form.symbol])

  function updateNumber(
    field: keyof CotData,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]:
        value === ''
          ? undefined
          : Number(value),
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API}/api/cot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? 'Failed to save COT data',
        )
      }

      setMessage('COT data saved successfully')

      setForm({
        ...emptyForm,
        reportDate:
          new Date()
            .toISOString()
            .slice(0, 10),
      })

      await loadHistory()
      await loadAnalysis()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save COT data',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <header>
          <h1 className="text-3xl font-bold">
            COT Futures Data
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Commitment of Traders administrative data
          </p>
        </header>

        <section className="rounded-xl border p-6">
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2"
          >

            <label className="space-y-1">
              <span className="text-sm">
                Symbol
              </span>

              <select
                value={form.symbol}
                onChange={(event) =>
                  setForm({
                    ...form,
                    symbol: event.target.value,
                  })
                }
                className="w-full rounded-md border bg-transparent p-2"
              >
                <option value="GC">GC</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm">
                Report Date
              </span>

              <input
                type="date"
                value={form.reportDate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    reportDate: event.target.value,
                  })
                }
                className="w-full rounded-md border bg-transparent p-2"
                required
              />
            </label>

            {[
              ['openInterest', 'Open Interest'],
              ['producerLong', 'Producer Long'],
              ['producerShort', 'Producer Short'],
              ['swapDealerLong', 'Swap Dealer Long'],
              ['swapDealerShort', 'Swap Dealer Short'],
              ['managedMoneyLong', 'Managed Money Long'],
              ['managedMoneyShort', 'Managed Money Short'],
              ['otherReportablesLong', 'Other Reportables Long'],
              ['otherReportablesShort', 'Other Reportables Short'],
            ].map(([field, label]) => (
              <label
                key={field}
                className="space-y-1"
              >
                <span className="text-sm">
                  {label}
                </span>

                <input
                  type="number"
                  value={
                    form[field as keyof CotData] ??
                    ''
                  }
                  onChange={(event) =>
                    updateNumber(
                      field as keyof CotData,
                      event.target.value,
                    )
                  }
                  className="w-full rounded-md border bg-transparent p-2"
                />
              </label>
            ))}

            <label className="space-y-1">
              <span className="text-sm">
                Source
              </span>

              <input
                value={form.source ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    source: event.target.value,
                  })
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm">
                Note
              </span>

              <textarea
                value={form.note ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    note: event.target.value,
                  })
                }
                className="min-h-24 w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md border px-5 py-2 font-medium"
              >
                {loading
                  ? 'Saving...'
                  : 'Save COT Data'}
              </button>
            </div>

          </form>

          {message && (
            <p className="mt-4 text-sm">
              {message}
            </p>
          )}
        </section>

        {analysis && (
          <section className="rounded-xl border p-6 space-y-5">

            <div>
              <h2 className="text-xl font-semibold">
                COT Institutional Analysis
              </h2>

              <p className="mt-1 text-sm opacity-70">
                COT Intelligence
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">

              <div>
                <div className="text-sm opacity-60">
                  Managed Money Net
                </div>
                <div className="text-2xl font-bold">
                  {analysis.managedMoneyNet}
                </div>
              </div>

              <div>
                <div className="text-sm opacity-60">
                  Producer Net
                </div>
                <div className="text-2xl font-bold">
                  {analysis.producerNet}
                </div>
              </div>

              <div>
                <div className="text-sm opacity-60">
                  Swap Dealer Net
                </div>
                <div className="text-2xl font-bold">
                  {analysis.swapDealerNet}
                </div>
              </div>

              <div>
                <div className="text-sm opacity-60">
                  Other Reportables Net
                </div>
                <div className="text-2xl font-bold">
                  {analysis.otherReportablesNet}
                </div>
              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-4">

              <div>
                <div className="text-sm opacity-60">
                  Positioning
                </div>
                <div className="text-xl font-bold">
                  {analysis.positioning}
                </div>
              </div>

              <div>
                <div className="text-sm opacity-60">
                  Confidence
                </div>
                <div className="text-xl font-bold">
                  {analysis.confidence}
                </div>
              </div>

              <div>
                <div className="text-sm opacity-60">
                  Score
                </div>
                <div className="text-xl font-bold">
                  {analysis.score}
                </div>
              </div>

            </div>

            <div>
              <div className="text-sm opacity-60 mb-2">
                Reasons
              </div>

              <ul className="list-disc pl-5 space-y-1">
                {analysis.reasons.map(
                  (reason) => (
                    <li key={reason}>
                      {reason}
                    </li>
                  ),
                )}
              </ul>
            </div>

          </section>
        )}

        <section className="rounded-xl border p-6">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              COT Data History
            </h2>

            <button
              type="button"
              onClick={loadHistory}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Refresh
            </button>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead>
                <tr className="border-b">
                  <th className="p-2">Date</th>
                  <th className="p-2">MM Net</th>
                  <th className="p-2">Producer</th>
                  <th className="p-2">Swap Dealer</th>
                  <th className="p-2">Other</th>
                </tr>
              </thead>

              <tbody>

                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b"
                  >
                    <td className="p-2">
                      {item.reportDate}
                    </td>

                    <td className="p-2">
                      {(item.managedMoneyLong ?? 0) -
                        (item.managedMoneyShort ?? 0)}
                    </td>

                    <td className="p-2">
                      {(item.producerLong ?? 0) -
                        (item.producerShort ?? 0)}
                    </td>

                    <td className="p-2">
                      {(item.swapDealerLong ?? 0) -
                        (item.swapDealerShort ?? 0)}
                    </td>

                    <td className="p-2">
                      {(item.otherReportablesLong ?? 0) -
                        (item.otherReportablesShort ?? 0)}
                    </td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center opacity-60"
                    >
                      No COT data
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>
        </section>

      </div>
    </main>
  )
}
