"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { apiPost } from "@/lib/api"

type LoginResponse = {
  data: {
    id: number
    email: string
    name: string | null
    role: string
    created_at: string
  }
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!email.trim()) {
      setError("กรุณากรอก Email")
      return
    }

    if (!password) {
      setError("กรุณากรอกรหัสผ่าน")
      return
    }

    try {
      setLoading(true)

      const result = await apiPost<LoginResponse>("/login", {
        email: email.trim(),
        password,
      })

localStorage.setItem(
  "iqtf_user",
  JSON.stringify(result.data),
)

window.dispatchEvent(new Event("iqtf_user_changed"))

      router.push("/")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "เข้าสู่ระบบไม่สำเร็จ",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">
              IQTF Enterprise
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
