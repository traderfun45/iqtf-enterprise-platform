import fs from "node:fs"
import { parseCmeVol2Vol } from "./src/services/cmeVol2VolParser"

const ocr = fs.readFileSync(process.argv[2], "utf8")

console.log("===== PARSER RESULT =====")
console.log(JSON.stringify(parseCmeVol2Vol(ocr), null, 2))
