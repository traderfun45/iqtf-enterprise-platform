const API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4100"

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  return response.json()
}
