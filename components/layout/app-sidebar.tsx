"use client"

import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChartCandlestick,
  FlaskConical,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react"

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Market", icon: ChartCandlestick },
  { label: "AI Analysis", icon: BrainCircuit },
  { label: "Trading Journal", icon: BookOpen },
  { label: "Backtest", icon: FlaskConical },
  { label: "Portfolio", icon: Wallet },
  { label: "Risk Manager", icon: ShieldCheck },
]

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <div>
          <div className="text-lg font-bold tracking-tight text-white">
            IQTF
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Enterprise
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                item.active
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-white">
              System Status
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-500">
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
