'use client'

import { FormEvent, useEffect, useState } from 'react'
import { API } from '@/lib/api'

type CmeData = {
  id?: number
  symbol: string
  dataDate: string
  dataTime?: string
  settlementPrice?: number
  volume?: number
  volumeZscore?: number
  openInterest?: number
  oiChange?: number
  oiZscore?: number
  source?: string
  note?: string
inputMethod?: 'MANUAL' | 'OCR' | 'CME_API'
  imageReference?: string
}

type CmeOcrResult = {
  screenshotType?: string
  underlyingFutures?: Array<{
    symbol?: string
    settlement?: number
    price?: number
  }>
  volatilitySettlement?: number
  callVolume?: number
  putVolume?: number
  expectedRange?: {
    minus3?: number
    minus2?: number
    minus1?: number
    atm?: number
    plus1?: number
    plus2?: number
    plus3?: number
  }
  optionRows?: unknown[]
  notableConcentrations?: unknown[]
}

type CmeAnalysis = {
  symbol: string
  intelligence?: {
    priceChange?: number
    volumeChange?: number
    openInterestChange?: number
    positioning?: string
    volumeConfirmation?: string
    oiConfirmation?: string
    confirmationScore?: number
  }
  vol2vol?: {
    signal?: string
    confidence?: string
    score?: number
    positioning?: string
    reasons?: string[]
  }
  previousState?: string
  vol2volState?: {
    state?: string
    action?: string
  }
  savedState?: {
    updatedAt?: string
  }
}

const emptyForm: CmeData = {
  symbol: 'GC',
  dataDate: new Date().toISOString().slice(0, 10),
  dataTime: '',
  settlementPrice: undefined,
  volume: undefined,
  volumeZscore: undefined,
  openInterest: undefined,
  oiChange: undefined,
  oiZscore: undefined,
  source: 'CME',
  note: '',
}

export default function CmeAdminPage() {
  const [form, setForm] = useState<CmeData>(emptyForm)
  const [history, setHistory] = useState<CmeData[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [analysis, setAnalysis] = useState<CmeAnalysis | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<CmeOcrResult | null>(null)

  function handleImageSelect(file: File | null) {
  if (!file) return

  if (!file.type.startsWith('image/')) {
    setMessage('Please select an image file')
    return
  }

  setSelectedImage(file)

  const previewUrl = URL.createObjectURL(file)
  setImagePreview(previewUrl)

  setForm((current) => ({
    ...current,
    inputMethod: 'OCR',
    imageReference: file.name,
  }))

  setMessage(`Image selected: ${file.name}`)
}

 function preprocessCmeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Failed to read CME image'))
    }

    reader.onload = () => {
      const img = new Image()

      img.onerror = () => {
        reject(new Error('Failed to decode CME image'))
      }

      img.onload = () => {
        const scale = 0.5

        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)

        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas is not supported'))
          return
        }

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height,
        )

        const dataUrl = canvas.toDataURL(
          'image/jpeg',
          0.65,
        )

        resolve(dataUrl)
      }

      img.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })
}

async function handleScanImage() {
  if (!selectedImage) {
    setMessage('Please select a CME screenshot first')
    return
  }

  setLoading(true)
  setMessage('Scanning CME screenshot...')

  try {
    const dataUrl = await preprocessCmeImage(selectedImage)
    const base64 = dataUrl.split(',')[1]

    const response = await fetch(`${API}/api/cme/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
      }),
    })

    const result = (await response.json()) as {
      success?: boolean
      error?: string
      data?: CmeOcrResult
    }

    if (!response.ok) {
      throw new Error(result.error ?? 'OCR failed')
    }

    const data: CmeOcrResult = result.data ?? {}
    setOcrResult(data)

    const gcSettlement =
      data.underlyingFutures?.find(
        (item) => item.symbol === 'GC',
      )?.settlement

    setForm((current) => ({
      ...current,

      settlementPrice:
        gcSettlement ??
        current.settlementPrice,

      volume:
        current.volume,

      openInterest:
        current.openInterest,

      oiChange:
        current.oiChange,

      oiZscore:
        current.oiZscore,

      inputMethod: 'OCR',
      imageReference: selectedImage.name,

      note:
        current.note,
    }))

    setMessage('CME screenshot scanned successfully')
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : 'OCR processing failed',
    )
  } finally {
    setLoading(false)
  }
}

 async function loadAnalysis() {

    try {
      const response = await fetch(
        `${API}/api/cme/analysis?symbol=${form.symbol}`,
        { cache: 'no-store' },
      )

      const result = (await response.json()) as CmeAnalysis

      if (!response.ok) {
        setAnalysis(null)
        return
      }

      setAnalysis(result)
    } catch {
      setAnalysis(null)
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch(
        `${API}/api/cme/history?symbol=${form.symbol}`,
        { cache: 'no-store' },
      )

      const result = (await response.json()) as {
        data?: CmeData[]
      }
      setHistory(result.data ?? [])
    } catch {
      setMessage('Unable to load CME history')
    }
  }

  useEffect(() => {
    loadHistory()
    loadAnalysis()
  }, [form.symbol])

  function updateNumber(
    field: keyof CmeData,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value === '' ? undefined : Number(value),
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API}/api/cme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const result = (await response.json()) as {
        success?: boolean
        error?: string
      }

      if (!response.ok) {
        throw new Error(
          result.error ?? 'Failed to save CME data',
        )
      }

      setMessage('CME data saved successfully')
      setForm({
        ...emptyForm,
        dataDate: new Date().toISOString().slice(0, 10),
      })

      await loadHistory()
      await loadAnalysis()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save CME data',
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
            CME Futures Data
          </h1>
          <p className="mt-1 text-sm opacity-70">
            GC Futures administrative data input
          </p>
        </header>

        <section className="rounded-xl border p-6">
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="space-y-1">
              <span className="text-sm">Symbol</span>
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
              <span className="text-sm">Data Date</span>
              <input
                type="date"
                value={form.dataDate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dataDate: event.target.value,
                  })
                }
                className="w-full rounded-md border bg-transparent p-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">Data Time</span>
              <input
                type="time"
                value={form.dataTime ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dataTime: event.target.value,
                  })
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">Settlement Price</span>
              <input
                type="number"
                step="0.01"
                value={form.settlementPrice ?? ''}
                onChange={(event) =>
                  updateNumber(
                    'settlementPrice',
                    event.target.value,
                  )
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">Volume</span>
              <input
                type="number"
                value={form.volume ?? ''}
                onChange={(event) =>
                  updateNumber('volume', event.target.value)
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">Volume Z-Score</span>
              <input
                type="number"
                step="0.01"
                value={form.volumeZscore ?? ''}
                onChange={(event) =>
                  updateNumber(
                    'volumeZscore',
                    event.target.value,
                  )
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">Open Interest</span>
              <input
                type="number"
                value={form.openInterest ?? ''}
                onChange={(event) =>
                  updateNumber(
                    'openInterest',
                    event.target.value,
                  )
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">OI Change</span>
              <input
                type="number"
                value={form.oiChange ?? ''}
                onChange={(event) =>
                  updateNumber('oiChange', event.target.value)
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">OI Z-Score</span>
              <input
                type="number"
                step="0.01"
                value={form.oiZscore ?? ''}
                onChange={(event) =>
                  updateNumber(
                    'oiZscore',
                    event.target.value,
                  )
                }
                className="w-full rounded-md border bg-transparent p-2"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm">Source</span>
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
              <span className="text-sm">Note</span>
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

<div className="md:col-span-2 rounded-lg border p-4">
  <h3 className="font-semibold">
    Scan CME Screenshot
  </h3>

  <p className="mt-1 text-sm opacity-60">
    Select a CME screenshot for OCR
  </p>

  <input
    type="file"
    accept="image/*"
    onChange={(event) =>
      handleImageSelect(event.target.files?.[0] ?? null)
    }
    className="mt-3 w-full rounded-md border p-2"
  />

  {selectedImage && (
    <div className="mt-4 space-y-3">
      <div className="text-sm">
        Selected: <strong>{selectedImage.name}</strong>
      </div>

      {imagePreview && (
        <img
          src={imagePreview}
          alt="CME screenshot preview"
          className="max-h-96 rounded-lg border object-contain"
        />
      )}

      <div className="text-xs opacity-60">
        Input Method: {form.inputMethod ?? 'MANUAL'}
      </div>
    </div>
  )}
</div>

{selectedImage && (
  <button
    type="button"
    onClick={handleScanImage}
    disabled={loading}
    className="rounded-md border px-5 py-2 font-medium"
  >
    {loading ? 'Scanning...' : 'Scan CME Screenshot'}
  </button>
)}

            {ocrResult && (
              <div className="md:col-span-2 rounded-lg border p-4">
                <h3 className="font-semibold">
                  CME Vol2Vol OCR Result
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="opacity-60">GC Settlement</div>
                    <div className="font-semibold">
                      {ocrResult.underlyingFutures?.find(
                        (item) => item.symbol === 'GC',
                      )?.settlement ?? '-'}
                    </div>
                  </div>

                  <div>
                    <div className="opacity-60">Vol Settlement</div>
                    <div className="font-semibold">
                      {ocrResult.volatilitySettlement ?? '-'}
                    </div>
                  </div>

                  <div>
                    <div className="opacity-60">Calls</div>
                    <div className="font-semibold">
                      {ocrResult.callVolume ?? '-'}
                    </div>
                  </div>

                  <div>
                    <div className="opacity-60">Puts</div>
                    <div className="font-semibold">
                      {ocrResult.putVolume ?? '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium">
                    Expected Range
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    {[
                      ['-3σ', ocrResult.expectedRange?.minus3],
                      ['-2σ', ocrResult.expectedRange?.minus2],
                      ['-1σ', ocrResult.expectedRange?.minus1],
                      ['ATM', ocrResult.expectedRange?.atm],
                      ['+1σ', ocrResult.expectedRange?.plus1],
                      ['+2σ', ocrResult.expectedRange?.plus2],
                      ['+3σ', ocrResult.expectedRange?.plus3],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded border p-2"
                      >
                        <div className="opacity-60">{label}</div>
                        <div className="font-semibold">
                          {value ?? '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md border px-5 py-2 font-medium"
              >
                {loading ? 'Saving...' : 'Save CME Data'}
              </button>
            </div>
          </form>

          {message && (
            <p className="mt-4 text-sm">{message}</p>
          )}
        </section>

        <section className="rounded-xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                CME Institutional Analysis
              </h2>
              <p className="text-sm opacity-60">
                CME Intelligence + Vol2Vol State
              </p>
            </div>

            <button
              type="button"
              onClick={loadAnalysis}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Refresh Analysis
            </button>
          </div>

          {!analysis ? (
            <p className="text-sm opacity-60">
              No analysis available
            </p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold">
                  CME Intelligence
                </h3>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Price Change
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.intelligence?.priceChange ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Volume Change
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.intelligence?.volumeChange ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      OI Change
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.intelligence?.openInterestChange ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Confirmation Score
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.intelligence?.confirmationScore ?? '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Positioning
                    </div>
                    <div className="font-semibold">
                      {analysis.intelligence?.positioning ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Volume Confirmation
                    </div>
                    <div className="font-semibold">
                      {analysis.intelligence?.volumeConfirmation ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      OI Confirmation
                    </div>
                    <div className="font-semibold">
                      {analysis.intelligence?.oiConfirmation ?? '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">
                  Vol2Vol
                </h3>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Signal
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.vol2vol?.signal ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Confidence
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.vol2vol?.confidence ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Score
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.vol2vol?.score ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Positioning
                    </div>
                    <div className="text-lg font-semibold">
                      {analysis.vol2vol?.positioning ?? '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border p-3">
                  <div className="text-xs opacity-60">
                    Reasons
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {(analysis.vol2vol?.reasons ?? []).map(
                      (reason, index) => (
                        <li key={`${reason}-${index}`}>
                          {reason}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">
                  Vol2Vol State
                </h3>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Previous State
                    </div>
                    <div className="font-semibold">
                      {analysis.previousState ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Current State
                    </div>
                    <div className="font-semibold">
                      {analysis.vol2volState?.state ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Action
                    </div>
                    <div className="font-semibold">
                      {analysis.vol2volState?.action ?? '-'}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-xs opacity-60">
                      Updated
                    </div>
                    <div className="font-semibold">
                      {analysis.savedState?.updatedAt ?? '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              CME Data History
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
                  <th className="p-2">Settlement</th>
                  <th className="p-2">Volume</th>
                  <th className="p-2">OI</th>
                  <th className="p-2">OI Δ</th>
                  <th className="p-2">OI Z</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b"
                  >
                    <td className="p-2">
                      {item.dataDate}
                    </td>
                    <td className="p-2">
                      {item.settlementPrice ?? '-'}
                    </td>
                    <td className="p-2">
                      {item.volume ?? '-'}
                    </td>
                    <td className="p-2">
                      {item.openInterest ?? '-'}
                    </td>
                    <td className="p-2">
                      {item.oiChange ?? '-'}
                    </td>
                    <td className="p-2">
                      {item.oiZscore ?? '-'}
                    </td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center opacity-60"
                    >
                      No CME data
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
