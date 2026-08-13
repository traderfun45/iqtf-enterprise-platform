import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react"

const trades = [
  ["XAUUSD", "BUY", "M15", "+$185.00", "Win"],
  ["XAUUSD", "SELL", "M5", "-$72.00", "Loss"],
  ["EURUSD", "BUY", "M15", "+$124.00", "Win"],
  ["GC", "BUY", "M30", "+$310.00", "Win"],
]

export default function TradingJournalPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Trading Journal</h1>
        <p className="mt-1 text-zinc-400">
          Institutional Trade Execution & Performance Journal
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Trades", "128"],
          ["Win Rate", "72.7%"],
          ["Net P&L", "+$4,820"],
          ["Profit Factor", "2.14"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3 border-b border-zinc-800 p-5">
          <BookOpen className="text-sky-400" />
          <h2 className="font-semibold text-white">Recent Trades</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="p-4">Symbol</th>
                <th className="p-4">Side</th>
                <th className="p-4">TF</th>
                <th className="p-4">P&L</th>
                <th className="p-4">Result</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={`${trade[0]}-${trade[2]}-${trade[3]}`} className="border-t border-zinc-900">
                  <td className="p-4 font-medium text-white">{trade[0]}</td>
                  <td className={`p-4 ${trade[1] === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                    {trade[1]}
                  </td>
                  <td className="p-4 text-zinc-400">{trade[2]}</td>
                  <td className={`p-4 ${trade[3].startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                    {trade[3]}
                  </td>
                  <td className="p-4 text-zinc-300">{trade[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <TrendingUp className="text-emerald-400" />
          <p className="mt-3 text-zinc-400">Winning Trades</p>
          <p className="text-2xl font-bold text-white">93</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <TrendingDown className="text-red-400" />
          <p className="mt-3 text-zinc-400">Losing Trades</p>
          <p className="text-2xl font-bold text-white">35</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <Target className="text-sky-400" />
          <p className="mt-3 text-zinc-400">Average R:R</p>
          <p className="text-2xl font-bold text-white">1 : 2.4</p>
        </div>
      </div>
    </div>
  )
}
