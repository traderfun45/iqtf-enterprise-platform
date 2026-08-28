"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
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

import { getSystemStatus, type SystemStatus } from "@/lib/system"

type IQTFUser = {
  id: number
  email: string
  name: string | null
  role: string
  created_at: string
}

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

  const [system, setSystem] = useState<SystemStatus | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

useEffect(() => {
  let mounted = true

  function loadUser() {
    try {
      const raw = localStorage.getItem("iqtf_user")

      if (!raw) {
        if (mounted) {
          setIsAdmin(false)
        }
        return
      }

      const user = JSON.parse(raw)

      if (mounted) {
        setIsAdmin(user?.role === "ADMIN")
      }
    } catch {
      if (mounted) {
        setIsAdmin(false)
      }
    }
  }

  loadUser()

  window.addEventListener("iqtf_user_changed", loadUser)
  window.addEventListener("storage", loadUser)

  async function loadSystem() {


      try {
        const data = await getSystemStatus()

        if (mounted) {
          setSystem(data)
        }
      } catch {
        if (mounted) {
          setSystem(null)
        }
      }
    }

    loadSystem()

    const timer = setInterval(loadSystem, 15000)

return () => {
  mounted = false
  clearInterval(timer)

  window.removeEventListener("iqtf_user_changed", loadUser)
  window.removeEventListener("storage", loadUser)
}

  }, [])

  const healthy = system?.status === "healthy"

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

      {isAdmin && (
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Administration
          </div>

          <div className="space-y-1">
            {[
              { label: "CME Data", href: "/admin/cme" },
              { label: "COT Data", href: "/admin/cot" },
              { label: "Trade Plan", href: "/admin/trade-plan" },
            ].map((item) => {
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

                  <ShieldCheck
                    className={`h-4 w-4 ${
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
          </div>
        </div>
      )}

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

        {/* Real System Status */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <Activity
              className={`h-4 w-4 ${
                healthy ? "text-emerald-400" : "text-red-400"
              }`}
            />

            <span className="text-xs font-medium text-white">
              System Status
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                healthy
                  ? "animate-pulse bg-emerald-400"
                  : "bg-red-400"
              }`}
            />

            <span
              className={`text-xs ${
                healthy ? "text-zinc-500" : "text-red-400"
              }`}
            >
              {healthy
                ? "All systems operational"
                : "System unavailable"}
            </span>
          </div>

          {system && (
            <div className="mt-3 space-y-1 border-t border-white/5 pt-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">API</span>
                <span className="text-emerald-400">
                  {system.services.api}
                </span>
              </div>

              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Market</span>
                <span className="text-emerald-400">
                  {system.services.market}
                </span>
              </div>

              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Cache</span>
                <span className="text-emerald-400">
                  {system.services.cache}
                </span>
              </div>

              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-600">Watchdog</span>
                <span className="text-emerald-400">
                  {system.services.watchdog}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Version */}
        <div className="mt-3 text-center text-[10px] text-zinc-700">
          IQTF Enterprise v1.0
        </div>
      </div>
    </aside>
  )
}
