
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

type IqtfAnalysis = {
  iqtfDecision: {
    decision: 'LONG' | 'LONG_WATCH' | 'NO_TRADE' | 'SHORT_WATCH' | 'SHORT'
    confidence: number
    riskState: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH'
    signalConflict: boolean
    tradePermission: 'ALLOWED' | 'BLOCKED'
    tradePermissionReason: string
  }
  tradeSetup: {
    available: boolean
    decision: 'LONG' | 'LONG_WATCH' | 'NO_TRADE' | 'SHORT_WATCH' | 'SHORT'
    entry: number | null
    stopLoss: number | null
    takeProfit1: number | null
    takeProfit2: number | null
    takeProfit3: number | null
    riskAmount: number | null
    riskRewardTp1: number | null
    riskRewardTp2: number | null
    riskRewardTp3: number | null
    reason?: string
  }
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
  const [editingId, setEditingId] = useState<number | null>(null)
const [iqtfAnalysis, setIqtfAnalysis] =
  useState<IqtfAnalysis | null>(null)

const [iqtfLoading, setIqtfLoading] =
  useState(false)

async function loadIqtfAnalysis() {
  setIqtfLoading(true)

  try {
    const response = await fetch(
      `${API}/api/institutional/analysis?symbol=${form.symbol}`,
      { cache: 'no-store' },
    )

    if (!response.ok) {
      throw new Error('Failed to load IQTF analysis')
    }

    const result = (await response.json()) as IqtfAnalysis
    setIqtfAnalysis(result)
  } catch {
    setIqtfAnalysis(null)
  } finally {
    setIqtfLoading(false)
  }
}

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
        const latestResult = (await latestResponse.json()) as {
          data?: TradePlan
        }
        setLatest(latestResult.data ?? null)
      } else {
        setLatest(null)
      }

      if (historyResponse.ok) {
        const historyResult = (await historyResponse.json()) as {
          data?: TradePlan[]
        }
        setHistory(historyResult.data ?? [])
      }
    } catch {
      setMessage('Unable to load Trade Plan data')
    }
  }

useEffect(() => {
  loadData()
  loadIqtfAnalysis()
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

  function startEdit(item: TradePlan) {
    setEditingId(item.id ?? null)
    setForm({
      symbol: item.symbol,
      direction: item.direction,
      entryPrice: String(item.entryPrice),
      stopLoss: String(item.stopLoss),
      tp1: String(item.tp1),
      tp2: String(item.tp2),
      tp3: String(item.tp3),
      status: item.status ?? 'ACTIVE',
      note: item.note ?? '',
    })
    setMessage(`Editing Trade Plan #${item.id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      symbol: form.symbol,
    })
    setMessage('Edit cancelled')
  }

  async function updateStatus(
    id: number,
    status: 'CLOSED' | 'CANCELLED',
  ) {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API}/api/trade-plan/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      const result = (await response.json()) as {
          error?: string
        }

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to update status')
      }

      setMessage(`Trade Plan #${id} marked ${status}`)
      await loadData()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update status',
      )
    } finally {
      setLoading(false)
    }
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
      const payload = {
        symbol: form.symbol,
        direction: form.direction,
        entryPrice: Number(form.entryPrice),
        stopLoss: Number(form.stopLoss),
        tp1: Number(form.tp1),
        tp2: Number(form.tp2),
        tp3: Number(form.tp3),
        status: form.status,
        note: form.note,
      }

      const response = await fetch(
        editingId
          ? `${API}/api/trade-plan/${editingId}`
          : `${API}/api/trade-plan`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      const result = (await response.json()) as {
          error?: string
        }

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to save Trade Plan')
      }

      setMessage(
        editingId
          ? 'Trade Plan updated successfully'
          : 'Trade Plan saved successfully',
      )

      setEditingId(null)

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

      const result = (await response.json()) as {
          error?: string
        }

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
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        IQTF SIGNAL
      </h2>
      <p className="text-sm opacity-70">
        Institutional + Market Decision Engine
      </p>
    </div>

    {iqtfLoading && (
      <span className="text-sm opacity-60">
        Loading...
      </span>
    )}
  </div>

  {iqtfAnalysis && (
    <div className="mt-5 space-y-4">

      <div className="grid gap-3 md:grid-cols-4">

        <div className="rounded-lg border p-4">
          <div className="text-xs opacity-60">
            Decision
          </div>
          <div className="mt-1 text-2xl font-bold">
            {iqtfAnalysis.iqtfDecision.decision}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-xs opacity-60">
            Confidence
          </div>
          <div className="mt-1 text-2xl font-bold">
            {iqtfAnalysis.iqtfDecision.confidence}%
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-xs opacity-60">
            Risk State
          </div>
          <div className="mt-1 text-2xl font-bold">
            {iqtfAnalysis.iqtfDecision.riskState}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-xs opacity-60">
            Permission
          </div>
          <div className="mt-1 text-2xl font-bold">
            {iqtfAnalysis.iqtfDecision.tradePermission}
          </div>
        </div>

      </div>

      <div className="rounded-lg border p-4">
        <div className="text-sm font-semibold">
          Permission Reason
        </div>

        <div className="mt-1 text-sm opacity-70">
          {iqtfAnalysis.iqtfDecision.tradePermissionReason}
        </div>
      </div>

      {iqtfAnalysis.tradeSetup.available && (
        <div className="rounded-lg border p-4">
          <div className="mb-3 text-sm font-semibold">
            Trade Setup
          </div>

          <div className="grid gap-3 md:grid-cols-5">

            <div>
              <div className="text-xs opacity-60">
                Entry
              </div>
              <div className="font-bold">
                {iqtfAnalysis.tradeSetup.entry}
              </div>
            </div>

            <div>
              <div className="text-xs opacity-60">
                Stop Loss
              </div>
              <div className="font-bold">
                {iqtfAnalysis.tradeSetup.stopLoss}
              </div>
            </div>

            <div>
              <div className="text-xs opacity-60">
                TP1
              </div>
              <div className="font-bold">
                {iqtfAnalysis.tradeSetup.takeProfit1}
              </div>
            </div>

            <div>
              <div className="text-xs opacity-60">
                TP2
              </div>
              <div className="font-bold">
                {iqtfAnalysis.tradeSetup.takeProfit2}
              </div>
            </div>

            <div>
              <div className="text-xs opacity-60">
                TP3
              </div>
              <div className="font-bold">
                {iqtfAnalysis.tradeSetup.takeProfit3}
              </div>
            </div>

          </div>
        </div>
      )}

      {!iqtfAnalysis.tradeSetup.available && (
        <div className="rounded-lg border p-4 text-sm">
          {iqtfAnalysis.tradeSetup.reason ??
            'Trade setup is not available'}
        </div>
      )}

    </div>
  )}
</section>

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
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md border px-5 py-2 font-medium"
                >
                  {loading
                    ? editingId
                      ? 'Updating...'
                      : 'Saving...'
                    : editingId
                      ? 'Update Trade Plan'
                      : 'Save Trade Plan'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={loading}
                    className="rounded-md border px-5 py-2 font-medium"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
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
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          disabled={loading}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          Edit
                        </button>

                        {item.status === 'ACTIVE' && item.id && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(item.id!, 'CLOSED')
                              }
                              disabled={loading}
                              className="rounded-md border px-2 py-1 text-xs"
                            >
                              Close
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(item.id!, 'CANCELLED')
                              }
                              disabled={loading}
                              className="rounded-md border px-2 py-1 text-xs"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            item.id && deletePlan(item.id)
                          }
                          disabled={loading}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          Delete
                        </button>
                      </div>
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
