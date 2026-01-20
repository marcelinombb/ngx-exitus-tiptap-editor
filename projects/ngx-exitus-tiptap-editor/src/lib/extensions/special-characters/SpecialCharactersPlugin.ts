import { Plugin } from '@editor/Plugin'
import { type DropDownEventProps } from '@editor/ui'
import omegaIcon from '@icons/omega.svg'
import type ExitusEditor from '@src/ExitusEditor'

import './style.css'
import { unicodeCategories, type UnicodeCategory } from './unicodeSource'

export class SpecialCharactersPlugin extends Plugin {
  private searchInput!: HTMLInputElement
  private charGrid!: HTMLElement
  private categoryTabs!: HTMLElement
  private currentCategory: string = unicodeCategories[0]?.name || 'Letras Gregas'
  private previewChar!: HTMLElement

  static get pluginName() {
    return 'specialCharacters'
  }

  static get requires() {
    return []
  }

  init(): void {
    this.editor.toolbar.setDropDown(
      SpecialCharactersPlugin.pluginName,
      {
        icon: omegaIcon,
        click: this.showDropdown.bind(this),
        tooltip: 'Caracteres especiais',
        classes: ['ex-dropdown-special-chars']
      },
      () => this.createDropDownContent(this.editor)
    )
  }

  showDropdown({ event, dropdown }: DropDownEventProps) {
    event.stopPropagation()
    if (dropdown.isOpen) {
      dropdown.off()
    } else {
      dropdown.on()
      setTimeout(() => this.searchInput?.focus(), 100)
    }
  }

  createDropDownContent(editor: ExitusEditor) {
    const container = document.createElement('div')
    container.className = 'ex-special-chars-container'

    const header = document.createElement('div')
    header.className = 'ex-special-chars-header'

    const searchContainer = document.createElement('div')
    searchContainer.className = 'ex-special-chars-search'

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.placeholder = 'Buscar caractere...'
    this.searchInput.className = 'ex-special-chars-search-input'
    this.searchInput.addEventListener('input', () => this.handleSearch())

    searchContainer.appendChild(this.searchInput)

    this.previewChar = document.createElement('div')
    this.previewChar.className = 'ex-special-chars-preview'
    this.previewChar.innerHTML = '<span class="ex-preview-char">Ω</span><span class="ex-preview-name">Omega</span>'

    header.append(searchContainer, this.previewChar)

    this.categoryTabs = document.createElement('div')
    this.categoryTabs.className = 'ex-special-chars-tabs'

    unicodeCategories.forEach((category: UnicodeCategory) => {
      const tab = document.createElement('button')
      tab.className = 'ex-special-chars-tab'
      tab.textContent = category.name
      tab.setAttribute('data-category', category.name)

      if (category.name === this.currentCategory) {
        tab.classList.add('active')
      }

      tab.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        this.selectCategory(category.name)
      })

      this.categoryTabs.appendChild(tab)
    })

    this.charGrid = document.createElement('div')
    this.charGrid.className = 'ex-special-chars-grid'
    this.renderCharacters(this.currentCategory)

    container.append(header, this.categoryTabs, this.charGrid)

    this.charGrid.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const charButton = target.closest('.ex-special-char-btn') as HTMLElement
      if (charButton) {
        const char = charButton.getAttribute('data-char')
        if (char) {
          this.insertCharacter(editor, char)
        }
      }
    })

    this.charGrid.addEventListener('mouseover', e => {
      const target = e.target as HTMLElement
      const charButton = target.closest('.ex-special-char-btn') as HTMLElement
      if (charButton) {
        const char = charButton.getAttribute('data-char')
        const name = charButton.getAttribute('data-name') || char
        if (char) {
          this.updatePreview(char, name as string)
        }
      }
    })

    return container
  }

  private selectCategory(categoryName: string) {
    this.currentCategory = categoryName

    const tabs = this.categoryTabs.querySelectorAll('.ex-special-chars-tab')
    tabs.forEach(tab => {
      if (tab.getAttribute('data-category') === categoryName) {
        tab.classList.add('active')
      } else {
        tab.classList.remove('active')
      }
    })

    this.searchInput.value = ''
    this.renderCharacters(categoryName)
  }

  private renderCharacters(categoryName: string) {
    this.charGrid.innerHTML = ''

    const category = unicodeCategories.find(c => c.name === categoryName)
    if (!category) return

    category.chars.forEach(char => {
      if (!char || char.trim() === '' || char.charCodeAt(0) < 32) return

      const btn = document.createElement('button')
      btn.className = 'ex-special-char-btn'
      btn.setAttribute('data-char', char)
      btn.setAttribute('data-name', this.getCharName(char))
      btn.textContent = char
      btn.title = this.getCharName(char)
      this.charGrid.appendChild(btn)
    })
  }

  private handleSearch() {
    const query = this.searchInput.value.toLowerCase().trim()

    if (!query) {
      this.renderCharacters(this.currentCategory)
      return
    }

    this.charGrid.innerHTML = ''

    unicodeCategories.forEach((category: UnicodeCategory) => {
      category.chars.forEach(char => {
        if (!char || char.trim() === '' || char.charCodeAt(0) < 32) return

        const charName = this.getCharName(char).toLowerCase()
        if (char.includes(query) || charName.includes(query)) {
          const btn = document.createElement('button')
          btn.className = 'ex-special-char-btn'
          btn.setAttribute('data-char', char)
          btn.setAttribute('data-name', this.getCharName(char))
          btn.textContent = char
          btn.title = this.getCharName(char)
          this.charGrid.appendChild(btn)
        }
      })
    })

    if (this.charGrid.children.length === 0) {
      const noResults = document.createElement('div')
      noResults.className = 'ex-special-chars-no-results'
      noResults.textContent = 'Nenhum caractere encontrado'
      this.charGrid.appendChild(noResults)
    }
  }

  private updatePreview(char: string, name: string) {
    this.previewChar.innerHTML = `<span class="ex-preview-char">${char}</span><span class="ex-preview-name">${name}</span>`
  }

  private insertCharacter(editor: ExitusEditor, char: string) {
    editor.chain().focus().insertContent(char).run()
  }

  private getCharName(char: string): string {
    for (const category of unicodeCategories) {
      if (category.chars.includes(char)) {
        if (category.name === 'Letras Gregas') {
          const code = char.codePointAt(0) || 0
          if (code >= 0x0391 && code <= 0x03a9) return `${char} (grega maiúscula)`
          if (code >= 0x03b1 && code <= 0x03c9) return `${char} (grega minúscula)`
        }
        // Nome especial para setas
        if (category.name === 'Setas') return `${char} (seta)`
        // Nome especial para matemáticos
        if (category.name === 'Matemáticos') return `${char} (matemático)`
        // Nome especial para moedas
        if (category.name === 'Moedas') return `${char} (moeda)`
        // Nome especial para música
        if (category.name === 'Música') return `${char} (música)`
        // Nome especial para formas geométricas
        if (category.name === 'Formas Geométricas') return `${char} (forma geométrica)`
        // Nome especial para box drawing
        if (category.name === 'Desenho de Caixas') return `${char} (box drawing)`
        // Nome especial para técnicos
        if (category.name === 'Técnicos') return `${char} (técnico)`
        // Nome especial para diversos
        if (category.name === 'Diversos') return `${char} (diverso)`
        // Nome especial para símbolos comuns
        if (category.name === 'Símbolos Comuns') return `${char} (comum)`
      }
    }

    return `U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`
  }
}
