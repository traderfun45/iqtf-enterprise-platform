import {
  Wallet,
  TrendingUp,
  Shield,
  PieChart,
} from "lucide-react"

export default function PortfolioPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Portfolio</h1>
        <p className="mt-1 text-zinc-400">
          Institutional Portfolio Management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Equity", "$125,840"],
          ["Daily P&L", "+$2,480"],
          ["Open Positions", "7"],
          ["Portfolio Risk", "3.2%"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Wallet className="text-sky-400" />
            <h2 className="font-semibold text-white">Open Positions</h2>
          </div>

          <div className="mt-6 space-y-3">
            {[
              ["XAUUSD", "BUY", "2.50", "+$1,240"],
              ["EURUSD", "BUY", "1.00", "+$320"],
              ["GC", "BUY", "1", "+$780"],
              ["USDJPY", "SELL", "0.50", "+$140"],
            ].map((position) => (
              <div
                key={position[0]}
                className="grid grid-cols-4 rounded-lg bg-zinc-900 p-4 text-sm"
              >
                <span className="font-semibold text-white">{position[0]}</span>
                <span className={position[1] === "BUY" ? "text-emerald-400" : "text-red-400"}>
                  {position[1]}
                </span>
                <span className="text-zinc-400">{position[2]}</span>
                <span className="text-right text-emerald-400">{position[3]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center gap-3">
            <PieChart className="text-sky-400" />
            <h2 className="font-semibold text-white">Asset Allocation</h2>
          </div>

          <div className="mt-6 space-y-5">
            {[
              ["Gold / Futures", "55%"],
              ["Forex", "25%"],
              ["Cash", "20%"],
            ].map(([name, percent]) => (
              <div key={name}>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{name}</span>
                  <span className="text-white">{percent}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-sky-500"
                    style={{ width: percent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <TrendingUp className="text-emerald-400" />
          <p className="mt-3 text-zinc-400">Monthly Return</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">+8.42%</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <Shield className="text-sky-400" />
          <p className="mt-3 text-zinc-400">Risk Utilization</p>
          <p className="mt-1 text-3xl font-bold text-white">32%</p>
        </div>
      </div>
    </div>
  )
}
