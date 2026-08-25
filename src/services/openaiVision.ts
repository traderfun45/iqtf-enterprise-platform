import "dotenv/config"
import OpenAI from "openai"
import fs from "node:fs/promises"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "x-goog-api-client": "iqtf-enterprise/1.0",
  },
})

export async function analyzeCmeImage(imagePath: string) {
  const imageBuffer = await fs.readFile(imagePath)
  const base64Image = imageBuffer.toString("base64")

  let response
  try {
    response = await client.chat.completions.create({
    model: "google/gemini-2.5-flash",
    max_tokens: 2200,

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `
Analyze this CME Group screenshot.

First identify the screenshot type.

Possible types:
- CME Options / Vol2Vol
- CME COT
- CME Futures
- Other CME market data

Extract ONLY information actually visible in the image.

For CME Options / Vol2Vol inspect:

- as of date
- underlying futures
- contract symbols
- DTE
- future settlement
- option series
- strike prices
- CALL values
- PUT values
- volatility settlement
- volatility curve
- expected range
- settlement/reference lines
- notable CALL/PUT concentrations

CONCENTRATION EXTRACTION:

CRITICAL OPTION TABLE TASK:

Do not stop after identifying the screenshot metadata.

The primary task is to inspect the visible option table.

Look specifically for:
- strike column
- CALL settlement column
- PUT settlement column
- CALL Open Interest (OI)
- CALL OI Change
- PUT Open Interest (OI)
- PUT OI Change
- option series labels
- numeric values in each row

Even if the table is partially cropped, inspect every visible row.

If at least one strike and one CALL or PUT number can be read,
you MUST return that row in option_rows.

Example:
[
  {
    "strike": 4500,
    "series": "OG3Q6",
    "call_settle": 59.9,
    "put_settle": 39.8,
    "call_oi": 171,
    "call_oi_change": 60,
    "put_oi": 140,
    "put_oi_change": 32
  }
]

Do not return [] merely because the entire table is not visible.

Return [] ONLY when there are genuinely no readable strike/CALL/PUT
numbers anywhere in the image.

This is the MOST IMPORTANT extraction task for CME Options / Vol2Vol.

The image may contain a table/grid showing option strikes with CALL and PUT values.

DO NOT decide whether a concentration exists before inspecting the table.

Follow these steps exactly:

RAW OPTION TABLE EXTRACTION:

This is a raw OCR extraction task, NOT a concentration detection task.

First read the visible option table before deciding anything about concentrations.

Extract every clearly readable option row containing:
- strike
- CALL settlement
- PUT settlement
- CALL Open Interest (OI)
- CALL OI Change
- PUT Open Interest (OI)
- PUT OI Change
- option series

Return these raw rows under "option_rows".

IMPORTANT COLUMN MEANING:
- "call_settle" = CALL Settlement price
- "put_settle" = PUT Settlement price
- "call_oi" = CALL Open Interest
- "call_oi_change" = CALL OI Change
- "put_oi" = PUT Open Interest
- "put_oi_change" = PUT OI Change

NEVER use settlement prices as OI or OI concentration values.

For the QuikStrike Settlement Sheet, the columns immediately to the
right of the volatility/settlement fields contain the Open Interest
and OI Change values for CALL and PUT.

Read the OI and OI Change columns independently from settlement prices.

A row MUST be returned if the strike and at least one option-table value
is clearly readable. Read every visible column independently.

Do NOT require the row to be a concentration.
Do NOT filter rows because the values are small.
Do NOT calculate values.
Do NOT estimate unreadable digits.
Do NOT invent values.

Example:

"option_rows": [
  {
    "strike": 4625,
    "series": "OGU6",
    "call_settle": 59.9,
    "put_settle": 39.8,
    "call_oi": 171,
    "call_oi_change": 60,
    "put_oi": 140,
    "put_oi_change": 32
  }
]

If CALL settlement is unreadable, use null.
If PUT settlement is unreadable, use null.
If CALL OI is unreadable, use null.
If CALL OI Change is unreadable, use null.
If PUT OI is unreadable, use null.
If PUT OI Change is unreadable, use null.

Return [] only when no readable strike plus CALL/PUT value exists.

STEP 1 — LOCATE THE OPTION TABLE
Find the visible option table/grid in the screenshot.

Identify:
- strike column
- CALL settlement
- PUT settlement
- CALL Open Interest (OI)
- CALL OI Change
- PUT Open Interest (OI)
- PUT OI Change
- option series/contract symbol if visible

STEP 2 — READ THE TABLE ROW BY ROW

IMPORTANT:
The QuikStrike Settlement Sheet contains multiple CALL and PUT metrics.
Do NOT collapse them into generic "call" and "put" fields.

Use these exact meanings:

- call_settle = CALL Settlement price
- put_settle = PUT Settlement price
- call_oi = CALL Open Interest
- call_oi_change = CALL Open Interest Change
- put_oi = PUT Open Interest
- put_oi_change = PUT Open Interest Change

NEVER use settlement prices as OI values.
NEVER use OI values as settlement prices.
NEVER combine OI and OI Change into one value.

Read each visible column directly from the image.
Do NOT calculate values.
Do NOT estimate unreadable digits.
Do NOT invent missing values.

If a particular field is unreadable, return null for that field.

If the strike and at least one option-table value are readable,
return the row.

Example:

{
  "strike": 4625,
  "series": "OGU6",
  "call_settle": 59.9,
  "put_settle": 39.8,
  "call_oi": 171,
  "call_oi_change": 60,
  "put_oi": 140,
  "put_oi_change": 32
}

For the QuikStrike table, carefully distinguish:
Settlement / Prior / Change
from
Open Interest / OI Change.

The OI values in the right side of the table are not settlement prices.

If multiple option series are visible, use the exact series symbol
shown in the image.


FINAL OPTION ROW REQUIREMENT:

For CME Options / Vol2Vol, option_rows is a REQUIRED raw OCR extraction field.

Before returning the final JSON, inspect the visible option table one final time.

If ANY readable strike and ANY readable CALL or PUT table value exists,
option_rows MUST contain that row.

Do NOT return option_rows as [] if readable option-table rows are visible.

Include ALL clearly readable rows, up to 15 rows.

Each row MUST use exactly these fields:

{
  "strike": number,
  "series": string,
  "call_settle": number | null,
  "put_settle": number | null,
  "call_oi": number | null,
  "call_oi_change": number | null,
  "put_oi": number | null,
  "put_oi_change": number | null
}

Missing or unreadable fields MUST be null.

Do NOT calculate.
Do NOT estimate.
Do NOT invent.

option_rows is raw table OCR.
It is NOT concentration detection.

Even if no concentration is detected, return the readable option rows.

VOLATILITY SETTLEMENT:

Return the numeric volatility settlement ONLY if clearly readable.

If not clearly readable, return null.

VOLATILITY CURVE:

Return an object only if clearly visible and readable.

Example:

{
  "type": "settlement",
  "value": 29.77,
  "change": -0.03
}

Otherwise return null.

EXPECTED RANGE:

If expected range / standard deviation levels are clearly visible, return:

{
  "center_strike": 4562.6,
  "std_dev_zones": [
    {
      "zone": "1 Standard Deviation",
      "lower_bound": 4511.3,
      "upper_bound": 4613.9,
      "implied_move_pts": 51.3
    }
  ]
}

Do NOT return an array called "values".

Do NOT return unlabeled numbers.

If expected range cannot be read reliably, return null.

UNDERLYING FUTURES:

If the image shows something like:

"Gold (GC)"

or

"Gold (OG|GC) vs 4562.6"

extract:

{
  "symbol": "GC",
  "price": 4562.6
}

If the underlying futures value cannot be read clearly, return [].

OPTION SERIES:

Return visible option series such as:

["OG3Q6"]

Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT add explanations outside JSON.

Return exactly this top-level structure:

{
  "screenshot_type": "...",
  "as_of_date": null,
  "underlying_futures": [],
  "option_series": [],
  "volatility_settlement": null,
  "volatility_curve": null,
  "expected_range": null,
  "settlement_reference_lines": null,
   "option_rows": [],
  "unreadable_or_missing_information": []
}
`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    })
  } catch (error: any) {
    console.error("===== OPENROUTER REQUEST ERROR =====")
    console.error("name:", error?.name)
    console.error("message:", error?.message)
    console.error("status:", error?.status)
    console.error("code:", error?.code)
    console.error("type:", error?.type)
    console.error("response:", JSON.stringify(error?.response?.data ?? error?.error ?? null, null, 2))
    console.error("full error:", error)
    throw error
  }

  const content = response.choices[0]?.message?.content ?? ""

  if (!content) {
    throw new Error("OpenRouter returned an empty response")
  }

  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    console.error("===== INVALID OPENROUTER JSON =====")
    console.error(cleaned)

    throw new Error(
      `OpenRouter returned invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}
