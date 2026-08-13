"use client"

import { ReactNode } from "react"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1800px] p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
