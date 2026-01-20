/**
 * Gera caracteres a partir de ranges Unicode
 * Isso é mais confiável que depender de bibliotecas externas
 */
function generateFromRange(start: number, end: number): string[] {
  const chars: string[] = []
  for (let i = start; i <= end; i++) {
    chars.push(String.fromCodePoint(i))
  }
  return chars
}

/**
 * Gera caracteres a partir de múltiplos ranges
 */
function generateFromRanges(ranges: [number, number][]): string[] {
  return ranges.flatMap(([start, end]) => generateFromRange(start, end))
}

// Unicode Ranges por categoria
// Referência: https://unicode-table.com/en/blocks/

// Letras Gregas: U+0370–U+03FF (Greek and Coptic)
const greekUppercase = generateFromRange(0x0391, 0x03a9) // Α-Ω
const greekLowercase = generateFromRange(0x03b1, 0x03c9) // α-ω

// Setas: U+2190–U+21FF (Arrows)
const arrows = generateFromRange(0x2190, 0x21ff)

// Operadores Matemáticos: U+2200–U+22FF
const mathOperators = generateFromRange(0x2200, 0x22ff)

// Sobrescritos e Subscritos: U+2070–U+209F
const superscriptsSubscripts = generateFromRange(0x2070, 0x209f)

// Frações: U+2150–U+215F (Number Forms)
const fractions = generateFromRange(0x2150, 0x215f)

// Símbolos de Moeda: U+20A0–U+20CF
const currency = generateFromRange(0x20a0, 0x20cf)

// Símbolos Letterlike: U+2100–U+214F
const letterlike = generateFromRange(0x2100, 0x214f)

// Formas Geométricas: U+25A0–U+25FF
const geometricShapes = generateFromRange(0x25a0, 0x25ff)

// Box Drawing: U+2500–U+257F
const boxDrawing = generateFromRange(0x2500, 0x257f)

// Símbolos Miscelâneos: U+2600–U+26FF
const miscSymbols = generateFromRange(0x2600, 0x26ff)

// Dingbats: U+2700–U+27BF
const dingbats = generateFromRange(0x2700, 0x27bf)

// Símbolos Técnicos: U+2300–U+23FF
const technicalSymbols = generateFromRange(0x2300, 0x23ff)

// Símbolos Musicais: U+2669–U+266F (dentro de Misc Symbols)
const musicSymbols = generateFromRanges([
  [0x2669, 0x266f], // ♩♪♫♬♭♮♯
  [0x1d100, 0x1d126] // Símbolos musicais suplementares
])

// Pontuação Geral: U+2010–U+2027
const punctuation = generateFromRange(0x2010, 0x2027)

// Símbolos comuns adicionais
const commonSymbols = ['©', '®', '™', '§', '¶', '†', '‡', '•', '°', '′', '″', '€', '$', '£', '¥', '¢', '₽', '₹', '₩', '₿']

export interface UnicodeCategory {
  name: string
  chars: string[]
}

export const unicodeCategories: UnicodeCategory[] = [
  {
    name: 'Letras Gregas',
    chars: [...greekUppercase, ...greekLowercase]
  },
  {
    name: 'Setas',
    chars: arrows.filter(c => c.trim()) // Remove caracteres invisíveis
  },
  {
    name: 'Matemáticos',
    chars: [...mathOperators.slice(0, 80), ...superscriptsSubscripts, ...fractions]
  },
  {
    name: 'Moedas',
    chars: [...currency.filter(c => c.trim()), ...commonSymbols.filter(c => ['€', '$', '£', '¥', '¢', '₽', '₹', '₩', '₿'].includes(c))]
  },
  {
    name: 'Símbolos Comuns',
    chars: [...letterlike.slice(0, 40), ...punctuation, ...commonSymbols]
  },
  {
    name: 'Formas Geométricas',
    chars: geometricShapes
  },
  {
    name: 'Desenho de Caixas',
    chars: boxDrawing.slice(0, 60)
  },
  {
    name: 'Música',
    chars: musicSymbols.filter(c => c.trim())
  },
  {
    name: 'Técnicos',
    chars: technicalSymbols.slice(0, 60)
  },
  {
    name: 'Diversos',
    chars: [...miscSymbols.slice(0, 60), ...dingbats.slice(0, 40)]
  }
]
