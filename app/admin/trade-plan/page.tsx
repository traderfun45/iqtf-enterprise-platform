'use client'

import { FormEvent, useEffect, useState } from 'react'
import { API } from '@/lib/api'

type Direction = 'LONG' | 'SHORT'

type TradePlan = {
  id?: number
  symbol: string
  direction: Direction
  entryPrice: number
  stopLoss: number
  tp1: number
  tp2: number
  tp3: number
  status?: string
  note?: string
  createdAt?: string
}

const emptyForm = {
  symbol: 'GC',
  direction: 'LONG' as Direction,
  entryPrice: '',
  stopLoss: '',
  tp1: '',
  tp2: '',
  tp3: '',
  status: 'ACTIVE',
  note: '',
}

export default function TradePlanAdminPage() {
  const [form, setForm] = useState(emptyForm)
  const [latest, setLatest] = useState<TradePlan | null>(null)
  const [history, setHistory] = useState<TradePlan[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadData() {
    try {
      const [latestResponse, historyResponse] = await Promise.all([
        fetch(
          `${API}/api/trade-plan/latest?symbol=${form.symbol}`,
          { cache: 'no-store' },
        ),
        fetch(
          `${API}/api/trade-plan/history?symbol=${form.symbol}`,
          { cache: 'no-store' },
        ),
      ])

      if (latestResponse.ok) {
        const latestResult = await latestResponse.json()
        setLatest(latestResult.data ?? null)
      } else {
        setLatest(null)
      }

      if (historyResponse.ok) {
        const historyResult = await historyResponse.json()
        setHistory(historyResult.data ?? [])
      }
    } catch {
      setMessage('Unable to load Trade Plan data')
    }
  }

  useEffect(() => {
    loadData()
  }, [form.symbol])

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function validateClientSide() {
    const entry = Number(form.entryPrice)
    const sl = Number(form.stopLoss)
    const tp1 = Number(form.tp1)
    const tp2 = Number(form.tp2)
    const tp3 = Number(form.tp3)

    if (![entry, sl, tp1, tp2, tp3].every(Number.isFinite)) {
      return 'Please enter all prices'
    }

    if (form.direction === 'LONG') {
      if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
        return 'LONG: SL < Entry < TP1 < TP2 < TP3'
      }
    }

    if (form.direction === 'SHORT') {
      if (!(tp3 < tp2 && tp2 < tp1 && tp1 < entry && entry < sl)) {
        return 'SHORT: TP3 < TP2 < TP1 < Entry < SL'
      }
    }

    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const validationError = validateClientSide()

    if (validationError) {
      setMessage(validationError)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API}/api/trade-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: form.symbol,
          direction: form.direction,
          entryPrice: Number(form.entryPrice),
          stopLoss: Number(form.stopLoss),
          tp1: Number(form.tp1),
          tp2: Number(form.tp2),
          tp3: Number(form.tp3),
          status: form.status,
          note: form.note,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to save Trade Plan')
      }

      setMessage('Trade Plan saved successfully')

      setForm({
        ...emptyForm,
        symbol: form.symbol,
        direction: form.direction,
      })

      await loadData()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save Trade Plan',
      )
    } finally {
      setLoading(false)
    }
  }

  async function deletePlan(id: number) {
    if (!window.confirm('Delete this Trade Plan?')) return

    try {
      const response = await fetch(
        `${API}/api/trade-plan/${id}`,
        { method: 'DELETE' },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to delete')
      }

      setMessage('Trade Plan deleted')
      await loadData()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to delete Trade Plan',
      )
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <header>
          <h1 className="text-3xl font-bold">
            Admin Trade Plan
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Entry / Stop Loss / TP1 / TP2 / TP3
          </p>
        </header>

        <section className="rounded-xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Create Trade Plan
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="space-y-1">
              <span className="text-sm">Symbol</span>
              <select
                value={form.symbol}
                onChange={(event) =>
                  updateField('symbol', event.target.value)
                }
                className="w-full rounded-md border bg-transparent p-2"
              >
                <option value="GC">GC</option>
                <option value="XAUUSD">XAUUSD</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm">Direction</span>
              <select
                value={form.direction}
                onChange={(event) =>
                  updateField(
                    'direction',
                    event.target.value as Direction,
                  )
                }
                className="w-full rounded-md border bg-transparent p-2"
              >
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </label>

            {[
              ['entryPrice', 'Entry'],
              ['stopLoss', 'Stop Loss'],
              ['tp1', 'TP1'],
              ['tp2', 'TP2'],
              ['tp3', 'TP3'],
            ].map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-sm">{label}</span>
                <input
                  type="number"
                  step="0.01"
                  value={form[field as keyof typeof form]}
                  onChange={(event) =>
                    updateField(
                      field as keyof typeof emptyForm,
                      event.target.value,
                    )
                  }
                  className="w-full rounded-md border bg-transparent p-2"
                  required
                />
              </label>
            ))}

            <label className="space-y-1">
              <span className="text-sm">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField('status', event.target.value)
                }
                className="w-full rounded-md border bg-transparent p-2"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="CLOSED">CLOSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm">Note</span>
              <textarea
                value={form.note}
                onChange={(event) =>
                  updateField('note', event.target.value)
                }
                className="min-h-24 w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <div className="rounded-lg border p-4 md:col-span-2">
              <div className="text-sm font-semibold">
                Validation
              </div>

              <div className="mt-1 text-sm opacity-70">
                {form.direction === 'LONG'
                  ? 'LONG: SL < Entry < TP1 < TP2 < TP3'
                  : 'SHORT: TP3 < TP2 < TP1 < Entry < SL'}
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md border px-5 py-2 font-medium"
              >
                {loading ? 'Saving...' : 'Save Trade Plan'}
              </button>
            </div>
          </form>

          {message && (
            <p className="mt-4 text-sm">
              {message}
            </p>
          )}
        </section>

        {latest && (
          <section className="rounded-xl border p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Latest Trade Plan
            </h2>

            <div className="grid gap-3 md:grid-cols-6">
              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60">Direction</div>
                <div className="text-lg font-bold">
                  {latest.direction}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60">Entry</div>
                <div className="text-lg font-bold">
                  {latest.entryPrice}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60">SL</div>
                <div className="text-lg font-bold">
                  {latest.stopLoss}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60">TP1</div>
                <div className="text-lg font-bold">
                  {latest.tp1}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60">TP2</div>
                <div className="text-lg font-bold">
                  {latest.tp2}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs opacity-60">TP3</div>
                <div className="text-lg font-bold">
                  {latest.tp3}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Trade Plan History
            </h2>

            <button
              type="button"
              onClick={loadData}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Direction</th>
                  <th className="p-2">Entry</th>
                  <th className="p-2">SL</th>
                  <th className="p-2">TP1</th>
                  <th className="p-2">TP2</th>
                  <th className="p-2">TP3</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.direction}</td>
                    <td className="p-2">{item.entryPrice}</td>
                    <td className="p-2">{item.stopLoss}</td>
                    <td className="p-2">{item.tp1}</td>
                    <td className="p-2">{item.tp2}</td>
                    <td className="p-2">{item.tp3}</td>
                    <td className="p-2">{item.status}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() =>
                          item.id && deletePlan(item.id)
                        }
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center opacity-60"
                    >
                      No Trade Plan
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
