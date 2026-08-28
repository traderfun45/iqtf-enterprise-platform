import {
  analyzeCmeOptionIntelligence,
} from './src/services/cmeOptionIntelligence.js'

const optionRows = [
  {
    strike: 4570,
    series: 'OGU6',
    callOi: 103,
    putOi: 30,
  },
  {
    strike: 4575,
    series: 'OGU6',
    callOi: 275,
    putOi: 361,
  },
  {
    strike: 4580,
    series: 'OGU6',
    callOi: 81,
    putOi: 36,
  },
  {
    strike: 4585,
    series: 'OGU6',
    callOi: 50,
    putOi: 138,
  },
  {
    strike: 4590,
    series: 'OGU6',
    callOi: 84,
    putOi: 6,
  },
  {
    strike: 4595,
    series: 'OGU6',
    callOi: 83,
    putOi: 36,
  },
  {
    strike: 4600,
    series: 'OGU6',
    callOi: 2384,
    putOi: 425,
  },
  {
    strike: 4605,
    series: 'OGU6',
    callOi: 204,
    putOi: 80,
  },
  {
    strike: 4610,
    series: 'OGU6',
    callOi: 217,
    putOi: 26,
  },
  {
    strike: 4615,
    series: 'OGU6',
    callOi: 142,
    putOi: 15,
  },
  {
    strike: 4620,
    series: 'OGU6',
    callOi: 672,
    putOi: 457,
  },
  {
    strike: 4625,
    series: 'OGU6',
    callOi: 171,
    putOi: 140,
  },
  {
    strike: 4630,
    series: 'OGU6',
    callOi: 88,
    putOi: 37,
  },
  {
    strike: 4635,
    series: 'OGU6',
    callOi: 151,
    putOi: 20,
  },
  {
    strike: 4640,
    series: 'OGU6',
    callOi: 132,
    putOi: 6,
  },
]

const result = analyzeCmeOptionIntelligence(optionRows)

console.dir(result, { depth: null })
