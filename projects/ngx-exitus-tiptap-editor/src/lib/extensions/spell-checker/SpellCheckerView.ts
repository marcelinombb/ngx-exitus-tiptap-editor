
import { EditorView } from '@tiptap/pm/view'

export class SpellCheckerView {
  private popup: HTMLDivElement | null = null
  private view: EditorView

  constructor(view: EditorView) {
    this.view = view
    this.createPopup()
  }

  private createPopup() {
    this.popup = document.createElement('div')
    this.popup.className = 'spell-checker-suggestions'
    document.body.appendChild(this.popup)

    // Close on click outside
    document.addEventListener('click', this.handleOutsideClick)
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.popup && !this.popup.contains(e.target as Node)) {
      this.hide()
    }
  }

  public show(x: number, y: number, word: string, suggestions: string[], onReplace: (replacement: string) => void) {
    if (!this.popup) return

    this.popup.innerHTML = ''

    // Title
    const title = document.createElement('div')
    title.className = 'spell-checker-suggestions-title'
    title.textContent = `"${word}"`
    this.popup.appendChild(title)

    if (suggestions.length === 0) {
      const noSuggestions = document.createElement('div')
      noSuggestions.className = 'spell-checker-no-suggestions'
      noSuggestions.textContent = 'No suggestions'
      this.popup.appendChild(noSuggestions)
    } else {
      suggestions.forEach(suggestion => {
        const item = document.createElement('div')
        item.className = 'spell-checker-suggestions-item'
        item.textContent = suggestion

        item.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onReplace(suggestion)
          this.hide()
        })

        this.popup!.appendChild(item)
      })
    }

    this.popup.style.left = `${x}px`
    this.popup.style.top = `${y + 10}px`
    this.popup.style.display = 'block'

    // Adjust if off-screen
    const rect = this.popup.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      this.popup.style.left = `${window.innerWidth - rect.width - 10}px`
    }
    if (rect.bottom > window.innerHeight) {
      this.popup.style.top = `${y - rect.height - 10}px`
    }
  }

  public hide() {
    if (this.popup) {
      this.popup.style.display = 'none'
    }
  }

  destroy() {
    document.removeEventListener('click', this.handleOutsideClick)
    if (this.popup) {
      this.popup.remove()
      this.popup = null
    }
  }
}
