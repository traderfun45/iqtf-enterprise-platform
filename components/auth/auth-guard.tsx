"use client"

import { ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const publicPaths = ["/login", "/signup"]

    if (publicPaths.includes(pathname)) {
      setChecking(false)
      return
    }

    const raw = localStorage.getItem("iqtf_user")

    if (!raw) {
      router.replace("/login")
      return
    }

    try {
      const user = JSON.parse(raw)

      if (!user?.id || !user?.email) {
        localStorage.removeItem("iqtf_user")
        router.replace("/login")
        return
      }

      setChecking(false)
    } catch {
      localStorage.removeItem("iqtf_user")
      router.replace("/login")
    }
  }, [pathname, router])

  if (checking && !["/login", "/signup"].includes(pathname)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Checking authentication...
      </main>
    )
  }

  return <>{children}</>
}
