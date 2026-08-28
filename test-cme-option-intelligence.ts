import {
  analyzeCmeOptionIntelligence,
} from './src/services/cmeOptionIntelligence.js'

const concentrations = [
  { strike: 4500, series: 'OG3Q6', type: 'CALL' as const, value: 333 },
  { strike: 4500, series: 'OG3Q6', type: 'PUT' as const, value: 318 },
  { strike: 4500, series: 'OGU6', type: 'CALL' as const, value: 2180 },
  { strike: 4500, series: 'OGU6', type: 'PUT' as const, value: 859 },
  { strike: 4500, series: 'OGV6', type: 'CALL' as const, value: 3465 },
  { strike: 4500, series: 'OGV6', type: 'PUT' as const, value: 1126 },
  { strike: 4500, series: 'OGX6', type: 'CALL' as const, value: 1030 },
  { strike: 4500, series: 'OGX6', type: 'PUT' as const, value: 222 },
  { strike: 4500, series: 'OGZ6', type: 'CALL' as const, value: 10694 },
  { strike: 4500, series: 'OGZ6', type: 'PUT' as const, value: 1261 },

  { strike: 4510, series: 'OGZ6', type: 'CALL' as const, value: 5028 },
  { strike: 4510, series: 'OGZ6', type: 'PUT' as const, value: 3 },

  { strike: 4550, series: 'OGU6', type: 'CALL' as const, value: 1724 },
  { strike: 4550, series: 'OGU6', type: 'PUT' as const, value: 589 },

  { strike: 4600, series: 'OG3Q6', type: 'CALL' as const, value: 654 },
  { strike: 4600, series: 'OG3Q6', type: 'PUT' as const, value: 5 },

  { strike: 4600, series: 'OGU6', type: 'CALL' as const, value: 2496 },
  { strike: 4600, series: 'OGU6', type: 'PUT' as const, value: 131 },

  { strike: 4600, series: 'OGV6', type: 'CALL' as const, value: 5554 },
  { strike: 4600, series: 'OGV6', type: 'PUT' as const, value: 380 },

  { strike: 4600, series: 'OGX6', type: 'CALL' as const, value: 3513 },
  { strike: 4600, series: 'OGX6', type: 'PUT' as const, value: 134 },

  { strike: 4600, series: 'OGZ6', type: 'CALL' as const, value: 5097 },
  { strike: 4600, series: 'OGZ6', type: 'PUT' as const, value: 950 },

  { strike: 4600, series: 'OGG7', type: 'CALL' as const, value: 1828 },
  { strike: 4600, series: 'OGG7', type: 'PUT' as const, value: 36 },

  { strike: 4575, series: 'OG3Q6', type: 'CALL' as const, value: 297 },
  { strike: 4575, series: 'OG3Q6', type: 'PUT' as const, value: 2 },

  { strike: 4575, series: 'OGV6', type: 'CALL' as const, value: 1033 },
  { strike: 4575, series: 'OGV6', type: 'PUT' as const, value: 69 },
]

const result =
  analyzeCmeOptionIntelligence(concentrations)

console.dir(result, { depth: null })
