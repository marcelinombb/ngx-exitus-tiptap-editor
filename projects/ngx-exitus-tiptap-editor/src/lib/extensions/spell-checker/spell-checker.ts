export interface SpellCheckerConfig {
  apiUrl: string
  debounceMs?: number
  minWordLength?: number
}

export interface WordCheckResult {
  word: string
  isCorrect: boolean
  suggestions: string[]
}

interface CacheEntry {
  isCorrect: boolean
  suggestions: string[]
  timestamp: number
}

export class SpellChecker {
  private apiUrl: string
  private debounceMs: number
  private minWordLength: number
  private cache: Map<string, CacheEntry> = new Map()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingText: string | null = null
  private cacheMaxAge: number = 5 * 60 * 1000 // 5 minutos
  private onResultsCallback: ((results: Map<string, WordCheckResult>) => void) | null = null
  private isProcessing: boolean = false

  constructor(config: SpellCheckerConfig) {
    this.apiUrl = config.apiUrl
    this.debounceMs = config.debounceMs ?? 500
    this.minWordLength = config.minWordLength ?? 3
  }

  /**
   * Registra callback para quando os resultados estiverem prontos
   */
  onResults(callback: (results: Map<string, WordCheckResult>) => void): void {
    this.onResultsCallback = callback
  }

  /**
   * Agenda verificação de texto - só processa após o usuário parar de digitar
   */
  queueTextCheck(text: string): void {
    // Guarda o texto mais recente
    this.pendingText = text

    // Cancela timer anterior
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Agenda nova verificação após 500ms de inatividade
    this.debounceTimer = setTimeout(() => {
      this.processText()
    }, this.debounceMs)
  }

  /**
   * Processa o texto pendente após o debounce
   */
  private async processText(): Promise<void> {
    if (!this.pendingText || this.isProcessing) return

    const text = this.pendingText
    this.pendingText = null
    this.isProcessing = true

    try {
      // Extrai palavras únicas do texto
      const words = this.extractUniqueWords(text)

      // Filtra apenas palavras que não estão no cache
      const wordsToCheck = words.filter(word => !this.getFromCache(word))

      // Se não há palavras novas, notifica com resultados do cache
      if (wordsToCheck.length === 0) {
        this.notifyWithCachedResults(words)
        return
      }

      // Faz requisições em lotes de 5
      const results = new Map<string, WordCheckResult>()

      for (let i = 0; i < wordsToCheck.length; i += 5) {
        const batch = wordsToCheck.slice(i, i + 5)
        const batchResults = await Promise.all(batch.map(word => this.checkWordApi(word)))
        batchResults.forEach(result => results.set(result.word, result))
      }

      // Notifica callback com os resultados
      if (this.onResultsCallback && results.size > 0) {
        this.onResultsCallback(results)
      }
    } finally {
      this.isProcessing = false

      // Se chegou novo texto enquanto processava, processa novamente
      if (this.pendingText) {
        this.queueTextCheck(this.pendingText)
      }
    }
  }

  /**
   * Extrai palavras únicas do texto
   */
  private extractUniqueWords(text: string): string[] {
    const matches = text.match(/[a-zA-ZÀ-ÿ]+/g) || []
    const uniqueWords = new Set<string>()

    matches.forEach(word => {
      if (word.length >= this.minWordLength) {
        uniqueWords.add(word.toLowerCase())
      }
    })

    return Array.from(uniqueWords)
  }

  /**
   * Notifica com resultados do cache
   */
  private notifyWithCachedResults(words: string[]): void {
    if (!this.onResultsCallback) return

    const results = new Map<string, WordCheckResult>()
    words.forEach(word => {
      const cached = this.getFromCache(word)
      if (cached) {
        results.set(word, {
          word,
          isCorrect: cached.isCorrect,
          suggestions: cached.suggestions
        })
      }
    })

    if (results.size > 0) {
      this.onResultsCallback(results)
    }
  }

  /**
   * Verifica palavra via API
   */
  private async checkWordApi(word: string): Promise<WordCheckResult> {
    try {
      const url = this.apiUrl + '?word=' + encodeURIComponent(word)
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      })

      if (!response.ok) throw new Error('HTTP ' + response.status)

      const result = await response.json()
      this.addToCache(word, result.is_correct, result.suggestions || [])

      return {
        word: result.word,
        isCorrect: result.is_correct,
        suggestions: result.suggestions || []
      }
    } catch (error) {
      console.error('Erro ao verificar "' + word + '":', error)
      return { word, isCorrect: true, suggestions: [] }
    }
  }

  /**
   * Obtém do cache se válido
   */
  private getFromCache(word: string): CacheEntry | null {
    const entry = this.cache.get(word)
    if (entry && Date.now() - entry.timestamp < this.cacheMaxAge) {
      return entry
    }
    if (entry) this.cache.delete(word)
    return null
  }

  /**
   * Adiciona ao cache
   */
  private addToCache(word: string, isCorrect: boolean, suggestions: string[]): void {
    this.cache.set(word, { isCorrect, suggestions, timestamp: Date.now() })
  }

  /**
   * Verifica palavra do cache (síncrono)
   */
  checkWord(word: string): WordCheckResult | null {
    const normalized = word.toLowerCase().trim()
    if (normalized.length < this.minWordLength) {
      return { word: normalized, isCorrect: true, suggestions: [] }
    }

    const cached = this.getFromCache(normalized)
    if (cached) {
      return { word: normalized, isCorrect: cached.isCorrect, suggestions: cached.suggestions }
    }
    return null
  }

  /**
   * Limpa cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Destrói instância
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pendingText = null
    this.cache.clear()
    this.onResultsCallback = null
  }
}
