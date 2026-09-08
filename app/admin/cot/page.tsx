'use client'

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react'
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

type CotOcrRecord = {
  report_date: string | null
  total_oi: number | null
  producer_long: number | null
  producer_short: number | null
  swap_dealer_long: number | null
  swap_dealer_short: number | null
  managed_money_long: number | null
  managed_money_short: number | null
  other_reportables_long: number | null
  other_reportables_short: number | null
}

type CotValidationConflict = {
  field: string
  ocrValue: number | null
  databaseValue: number | null
}

type CotValidationResult = {
  reportDate: string | null
  status: 'MATCH' | 'CONFLICT' | 'NEW' | 'INVALID'
  conflicts: CotValidationConflict[]
}

type CotOcrReview = {
  record: CotOcrRecord
  validation: CotValidationResult
}

const emptyForm: CotData = {
  symbol: 'GC',
  reportDate: new Date().toISOString().slice(0, 10),
  source: 'CFTC',
  note: '',
}

const fields: Array<{
  key: keyof CotOcrRecord
  label: string
}> = [
  { key: 'total_oi', label: 'Open Interest' },
  { key: 'producer_long', label: 'Producer Long' },
  { key: 'producer_short', label: 'Producer Short' },
  { key: 'swap_dealer_long', label: 'Swap Dealer Long' },
  { key: 'swap_dealer_short', label: 'Swap Dealer Short' },
  { key: 'managed_money_long', label: 'Managed Money Long' },
  { key: 'managed_money_short', label: 'Managed Money Short' },
  {
    key: 'other_reportables_long',
    label: 'Other Reportables Long',
  },
  {
    key: 'other_reportables_short',
    label: 'Other Reportables Short',
  },
]

export default function CotAdminPage() {
  const [form, setForm] = useState<CotData>(emptyForm)
  const [history, setHistory] = useState<CotData[]>([])
  const [analysis, setAnalysis] =
    useState<CotAnalysis | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrReviews, setOcrReviews] =
    useState<CotOcrReview[]>([])
  const [applying, setApplying] = useState<number | null>(null)

  async function loadHistory() {
    try {
      const response = await fetch(
        `${API}/api/cot/history?symbol=${form.symbol}`,
        { cache: 'no-store' },
      )

      const result = (await response.json()) as {
        data?: CotData[]
      }

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

      const result = (await response.json()) as CotAnalysis
      setAnalysis(result)
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

      const result = (await response.json()) as {
        error?: string
      }

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

  async function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const result = String(reader.result)

        const comma = result.indexOf(',')

        resolve(
          comma >= 0
            ? result.slice(comma + 1)
            : result,
        )
      }

      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleOcr() {
    if (!ocrFile) {
      setMessage('Please select a COT screenshot first')
      return
    }

    setOcrLoading(true)
    setMessage('')
    setOcrReviews([])

    try {
      const image = await fileToBase64(ocrFile)

      const ocrResponse = await fetch(
        `${API}/api/cot/ocr`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image }),
        },
      )

      const ocrResult = (await ocrResponse.json()) as {
        success?: boolean
        error?: string
        data?: {
          records?: CotOcrRecord[]
        }
      }

      if (!ocrResponse.ok || !ocrResult.success) {
        throw new Error(
          ocrResult.error ??
            'COT OCR failed',
        )
      }

      const records = ocrResult.data?.records ?? []

      if (records.length === 0) {
        setMessage(
          'OCR completed but no COT records were found',
        )
        return
      }

      const validateResponse = await fetch(
        `${API}/api/cot/ocr/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: form.symbol,
            records,
          }),
        },
      )

      const validateResult =
        (await validateResponse.json()) as {
          success?: boolean
          error?: string
          results?: CotValidationResult[]
        }

      if (
        !validateResponse.ok ||
        !validateResult.success
      ) {
        throw new Error(
          validateResult.error ??
            'COT validation failed',
        )
      }

      setOcrReviews(
        records.map((record, index) => ({
          record,
          validation:
            validateResult.results?.[index] ?? {
              reportDate: null,
              status: 'INVALID',
              conflicts: [],
            },
        })),
      )

      setMessage(
        `OCR completed: ${records.length} record(s) found`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'COT OCR failed',
      )
    } finally {
      setOcrLoading(false)
    }
  }

  async function applyOcr(
    reviewIndex: number,
    decision?: 'KEEP_DATABASE' | 'USE_OCR',
  ) {
    const review = ocrReviews[reviewIndex]

    if (!review) return

    setApplying(reviewIndex)
    setMessage('')

    try {
      const response = await fetch(
        `${API}/api/cot/ocr/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: form.symbol,
            record: review.record,
            decision,
            source:
              decision === 'USE_OCR'
                ? 'CFTC-OCR'
                : 'CFTC',
            note:
              decision === 'USE_OCR'
                ? 'Applied from COT OCR review'
                : 'COT OCR review',
          }),
        },
      )

      const result = (await response.json()) as {
        success?: boolean
        error?: string
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            'Failed to apply COT OCR',
        )
      }

      setOcrReviews((current) =>
        current.filter(
          (_, index) => index !== reviewIndex,
        ),
      )

      setMessage('COT OCR change applied')

      await loadHistory()
      await loadAnalysis()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to apply COT OCR',
      )
    } finally {
      setApplying(null)
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setOcrFile(event.target.files?.[0] ?? null)
    setOcrReviews([])
    setMessage('')
  }

  function formatNumber(
    value: number | null,
  ) {
    if (value === null || value === undefined) {
      return '—'
    }

    return value.toLocaleString()
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

        {/* ================================================= */}
        {/* COT OCR REVIEW */}
        {/* ================================================= */}

        <section className="rounded-xl border p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold">
              COT OCR Review
            </h2>

            <p className="mt-1 text-sm opacity-70">
              Upload a COT screenshot, run OCR, then
              review the values before writing to the database.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex-1 space-y-1">
              <span className="text-sm">
                COT Screenshot
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-md border p-2 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={handleOcr}
              disabled={!ocrFile || ocrLoading}
              className="rounded-md border px-5 py-2 font-medium disabled:opacity-50"
            >
              {ocrLoading
                ? 'Running OCR...'
                : 'Run COT OCR'}
            </button>
          </div>

          {ocrFile && (
            <p className="text-sm opacity-70">
              Selected: {ocrFile.name}
            </p>
          )}

          {ocrReviews.length > 0 && (
            <div className="space-y-4">
              {ocrReviews.map((review, reviewIndex) => {
                const status =
                  review.validation.status

                return (
                  <div
                    key={`${review.validation.reportDate}-${reviewIndex}`}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-semibold">
                          {review.validation.reportDate ??
                            review.record.report_date ??
                            'Invalid date'}
                        </div>

                        <div className="mt-1 text-sm opacity-70">
                          COT OCR Record
                        </div>
                      </div>

                      <div className="font-semibold">
                        {status}
                      </div>
                    </div>

                    {status === 'MATCH' && (
                      <p className="mt-3 text-sm opacity-70">
                        OCR matches the existing database
                        record. No database change required.
                      </p>
                    )}

                    {status === 'NEW' && (
                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={
                            applying === reviewIndex
                          }
                          onClick={() =>
                            applyOcr(reviewIndex)
                          }
                          className="rounded-md border px-4 py-2 font-medium disabled:opacity-50"
                        >
                          {applying === reviewIndex
                            ? 'Applying...'
                            : 'Add New Record'}
                        </button>
                      </div>
                    )}

                    {status === 'CONFLICT' && (
                      <div className="mt-4 space-y-4">

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="p-2">
                                  Field
                                </th>
                                <th className="p-2">
                                  OCR
                                </th>
                                <th className="p-2">
                                  Database
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {review.validation.conflicts.map(
                                (conflict) => (
                                  <tr
                                    key={conflict.field}
                                    className="border-b"
                                  >
                                    <td className="p-2">
                                      {conflict.field}
                                    </td>

                                    <td className="p-2 font-semibold">
                                      {formatNumber(
                                        conflict.ocrValue,
                                      )}
                                    </td>

                                    <td className="p-2 font-semibold">
                                      {formatNumber(
                                        conflict.databaseValue,
                                      )}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={
                              applying === reviewIndex
                            }
                            onClick={() =>
                              applyOcr(
                                reviewIndex,
                                'KEEP_DATABASE',
                              )
                            }
                            className="rounded-md border px-4 py-2 font-medium disabled:opacity-50"
                          >
                            Keep Database
                          </button>

                          <button
                            type="button"
                            disabled={
                              applying === reviewIndex
                            }
                            onClick={() =>
                              applyOcr(
                                reviewIndex,
                                'USE_OCR',
                              )
                            }
                            className="rounded-md border px-4 py-2 font-medium disabled:opacity-50"
                          >
                            Use OCR
                          </button>
                        </div>

                      </div>
                    )}

                    {status === 'INVALID' && (
                      <p className="mt-3 text-sm">
                        Invalid or unreadable COT record.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* MANUAL COT FORM */}
        {/* ================================================= */}

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
              [
                'otherReportablesLong',
                'Other Reportables Long',
              ],
              [
                'otherReportablesShort',
                'Other Reportables Short',
              ],
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
                    form[
                      field as keyof CotData
                    ] ?? ''
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

        {/* ================================================= */}
        {/* COT INTELLIGENCE */}
        {/* ================================================= */}

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
              <div className="mb-2 text-sm opacity-60">
                Reasons
              </div>

              <ul className="list-disc space-y-1 pl-5">
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

        {/* ================================================= */}
        {/* HISTORY */}
        {/* ================================================= */}

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
                  <th className="p-2">
                    Date
                  </th>
                  <th className="p-2">
                    MM Net
                  </th>
                  <th className="p-2">
                    Producer
                  </th>
                  <th className="p-2">
                    Swap Dealer
                  </th>
                  <th className="p-2">
                    Other
                  </th>
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
