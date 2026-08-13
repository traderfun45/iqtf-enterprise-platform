import {
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  ShieldCheck,
} from "lucide-react"

const metrics = [
  ["Market Regime", "TRENDING", "text-emerald-400"],
  ["AI Confidence", "87%", "text-emerald-400"],
  ["Institutional Bias", "BULLISH", "text-emerald-400"],
  ["Technical Score", "8.4 / 10", "text-sky-400"],
]

export default function AIAnalysisPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">AI Analysis</h1>
        <p className="mt-1 text-zinc-400">
          Institutional AI Market Analysis Engine
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value, color]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <p className="text-sm text-zinc-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Brain className="text-sky-400" />
            <h2 className="text-lg font-semibold text-white">
              AI Market Intelligence
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp size={18} />
                <span className="font-semibold">Trend</span>
              </div>
              <p className="mt-2 text-zinc-300">
                Strong bullish structure detected across higher timeframes.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck size={18} />
                <span className="font-semibold">Institutional Flow</span>
              </div>
              <p className="mt-2 text-zinc-300">
                Buying pressure remains dominant.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-sky-400">
                <Activity size={18} />
                <span className="font-semibold">Momentum</span>
              </div>
              <p className="mt-2 text-zinc-300">
                Momentum is positive with controlled volatility.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Target size={18} />
                <span className="font-semibold">Trade Zone</span>
              </div>
              <p className="mt-2 text-zinc-300">
                Wait for confirmation near the preferred entry zone.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold text-white">AI Signal</h2>

          <div className="mt-6 rounded-xl bg-emerald-500/10 p-6 text-center">
            <TrendingUp className="mx-auto text-emerald-400" size={40} />
            <p className="mt-3 text-2xl font-bold text-emerald-400">
              BUY
            </p>
            <p className="mt-1 text-zinc-400">Confidence 87%</p>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Entry</span>
              <span className="text-white">Confirmation Zone</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Stop Loss</span>
              <span className="text-red-400">ATR Based</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Take Profit</span>
              <span className="text-emerald-400">Fibonacci Target</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
