"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiPost } from "@/lib/api"

type CreateUserResponse = {
  data: {
    id: number
    email: string
    name: string | null
    created_at: string
  }
}

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")
    setSuccess(false)

    const cleanEmail = email.trim()
    const cleanName = name.trim()

    if (!cleanEmail) {
      setError("กรุณากรอก Email")
      return
    }

    setLoading(true)

    try {
      await apiPost<CreateUserResponse>("/users", {
        email: cleanEmail,
        name: cleanName || undefined,
      })

      setSuccess(true)
      setName("")
      setEmail("")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "สมัครสมาชิกไม่สำเร็จ"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      <Card className="w-full max-w-md border-white/10 bg-white/[0.03]">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <UserPlus className="h-6 w-6 text-zinc-300" />
          </div>

          <div>
            <CardTitle className="text-2xl">
              Create Account
            </CardTitle>

            <p className="mt-2 text-sm text-zinc-500">
              สมัครสมาชิก IQTF Enterprise
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />

              <div>
                <h2 className="text-lg font-semibold text-white">
                  สมัครสมาชิกสำเร็จ
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  บัญชีของคุณถูกสร้างในระบบแล้ว
                </p>
              </div>

              <Link
                href="/"
                className="block rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
              >
                กลับ Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm text-zinc-300"
                >
                  Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm text-zinc-300"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังสมัคร...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    สมัครสมาชิก
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/"
                  className="text-sm text-zinc-500 transition hover:text-white"
                >
                  กลับหน้า Dashboard
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
