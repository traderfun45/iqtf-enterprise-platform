import {
  ShieldAlert,
  Calculator,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react"

export default function RiskManagerPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Risk Manager</h1>
        <p className="mt-1 text-zinc-400">
          Institutional Risk Management & Position Sizing
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Account Balance", "$125,840"],
          ["Risk / Trade", "1.0%"],
          ["Daily Risk Used", "2.4%"],
          ["Max Daily Loss", "5.0%"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <Calculator className="text-sky-400" />
            <h2 className="font-semibold text-white">Position Size Calculator</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Account Balance", "$125,840"],
              ["Risk %", "1.0%"],
              ["Entry Price", "3,350"],
              ["Stop Loss", "3,330"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="mb-1 text-xs text-zinc-500">{label}</p>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-white">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-sky-500/10 p-5">
            <p className="text-sm text-zinc-400">Recommended Position Size</p>
            <p className="mt-1 text-3xl font-bold text-sky-400">0.63 Lot</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-yellow-400" />
            <h2 className="font-semibold text-white">Risk Monitor</h2>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-zinc-900 p-4">
              <span className="text-zinc-400">Portfolio Risk</span>
              <span className="text-emerald-400">LOW</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-900 p-4">
              <span className="text-zinc-400">Daily Loss Limit</span>
              <span className="text-emerald-400">SAFE</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-900 p-4">
              <span className="text-zinc-400">Correlation Risk</span>
              <span className="text-yellow-400">MEDIUM</span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-900 p-4">
              <span className="text-zinc-400">Margin Utilization</span>
              <span className="text-emerald-400">32%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <ShieldCheck className="text-emerald-400" />
          <p className="mt-3 font-semibold text-white">Risk Status</p>
          <p className="mt-1 text-emerald-400">SYSTEM HEALTHY</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <AlertTriangle className="text-yellow-400" />
          <p className="mt-3 font-semibold text-white">Risk Warning</p>
          <p className="mt-1 text-zinc-400">
            Correlation exposure should be monitored.
          </p>
        </div>
      </div>
    </div>
  )
}
