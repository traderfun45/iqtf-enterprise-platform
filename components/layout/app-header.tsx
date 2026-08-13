"use client"

import {
  Bell,
  Search,
  Settings,
  UserCircle,
} from "lucide-react"

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        <div className="hidden text-sm font-medium text-zinc-400 sm:block">
          Institutional Quantitative Trading Framework
        </div>
        <div className="text-sm font-semibold text-white sm:hidden">
          IQTF Enterprise
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          aria-label="Search"
          className="rounded-lg p-2.5 text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          aria-label="Notifications"
          className="relative rounded-lg p-2.5 text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </button>

        <button
          aria-label="Settings"
          className="hidden rounded-lg p-2.5 text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white sm:block"
        >
          <Settings className="h-4 w-4" />
        </button>

        <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">
          <UserCircle className="h-7 w-7 text-zinc-400" />
          <div className="hidden sm:block">
            <div className="text-xs font-medium text-white">
              Trader
            </div>
            <div className="text-[10px] text-zinc-500">
              Administrator
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
