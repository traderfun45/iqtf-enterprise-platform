import {
  BarChart3,
  Play,
  TrendingUp,
  Activity,
} from "lucide-react"

export default function BacktestPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Backtest</h1>
        <p className="mt-1 text-zinc-400">
          Institutional Strategy Backtesting Engine
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Total Trades", "1,284"],
          ["Win Rate", "74.3%"],
          ["Profit Factor", "2.31"],
          ["Max Drawdown", "8.7%"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="font-semibold text-white">Strategy Configuration</h2>

          <div className="mt-5 space-y-4">
            {[
              ["Strategy", "AI Golden Setup"],
              ["Symbol", "XAUUSD"],
              ["Timeframe", "M15"],
              ["Period", "60 Days"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="mb-1 text-xs text-zinc-500">{label}</p>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-white">
                  {value}
                </div>
              </div>
            ))}

            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 p-3 font-semibold text-white">
              <Play size={17} />
              Run Backtest
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-sky-400" />
            <h2 className="font-semibold text-white">Equity Curve</h2>
          </div>

          <div className="mt-6 flex h-64 items-end gap-2">
            {[30, 38, 35, 48, 44, 58, 63, 55, 70, 68, 82, 78, 92].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t bg-sky-500/70"
                  style={{ height: `${height}%` }}
                />
              )
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center gap-3">
          <Activity className="text-emerald-400" />
          <h2 className="font-semibold text-white">Performance Analysis</h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-zinc-500">Net Profit</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">+$12,840</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Avg Trade</p>
            <p className="mt-1 text-xl font-bold text-white">+$10.00</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Best Trade</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">+$420</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Worst Trade</p>
            <p className="mt-1 text-xl font-bold text-red-400">-$180</p>
          </div>
        </div>
      </div>
    </div>
  )
}
