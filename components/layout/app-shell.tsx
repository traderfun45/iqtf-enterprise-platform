"use client"

import { ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem("iqtf_user")

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    setCheckingAuth(false)
  }, [router, pathname])

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-sm text-zinc-500">
          Checking authentication...
        </div>
      </div>
    )
  }

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
