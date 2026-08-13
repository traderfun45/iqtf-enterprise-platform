"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
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
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Market",
    href: "/market",
    icon: ChartCandlestick,
  },
  {
    label: "AI Analysis",
    href: "/ai-analysis",
    icon: BrainCircuit,
  },
  {
    label: "Trading Journal",
    href: "/trading-journal",
    icon: BookOpen,
  },
  {
    label: "Backtest",
    href: "/backtest",
    icon: FlaskConical,
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: Wallet,
  },
  {
    label: "Risk Manager",
    href: "/risk-manager",
    icon: ShieldCheck,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      {/* Brand */}
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

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Workspace
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 h-5 w-0.5 rounded-full bg-emerald-400" />
              )}

              <Icon
                className={`h-4 w-4 transition-colors ${
                  isActive
                    ? "text-emerald-400"
                    : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              />

              <span>{item.label}</span>

              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-4">
        <Link
          href="/settings"
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
            pathname === "/settings"
              ? "bg-white/[0.08] text-white"
              : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          {pathname === "/settings" && (
            <span className="absolute left-0 h-5 w-0.5 rounded-full bg-emerald-400" />
          )}

          <Settings
            className={`h-4 w-4 ${
              pathname === "/settings"
                ? "text-emerald-400"
                : "text-zinc-500 group-hover:text-zinc-300"
            }`}
          />

          <span>Settings</span>
        </Link>

        {/* System Status */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />

            <span className="text-xs font-medium text-white">
              System Status
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-xs text-zinc-500">
              All systems operational
            </span>
          </div>
        </div>

        {/* Version */}
        <div className="mt-3 text-center text-[10px] text-zinc-700">
          IQTF Enterprise v1.0
        </div>
      </div>
    </aside>
  )
}
