import { normalizeCmeVision } from "./src/services/cmeVisionNormalizer.js"

const result = normalizeCmeVision({
  screenshot_type: "CME Options / Vol2Vol",
  as_of_date: "20/8/2569",

  notable_call_put_concentrations: [
    { strike: 4500, series: "OGU6", call: 2180, put: 859 },
    { strike: 4500, series: "OGV6", call: 3465, put: 1126 },
    { strike: 4500, series: "OGZ6", call: 10694, put: 1261 },
    { strike: 4510, series: "OGZ6", call: 5028, put: 3 },
    { strike: 4550, series: "OGU6", call: 1724, put: 589 },
    { strike: 4600, series: "OGV6", call: 5554, put: 380 },
    { strike: 4600, series: "OGZ6", call: 5097, put: 950 },
  ],
})

console.dir(result, { depth: null })
