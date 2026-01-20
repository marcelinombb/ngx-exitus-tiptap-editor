import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { unicodeCategories, type UnicodeCategory } from '../extensions/special-characters/unicodeSource';

@Component({
  selector: 'special-characters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ex-special-chars-container" (click)="$event.stopPropagation()">
      <div class="ex-special-chars-header">
        <div class="ex-special-chars-search">
          <input 
            type="text" 
            class="ex-special-chars-search-input" 
            placeholder="Buscar caractere..." 
            [(ngModel)]="searchQuery"
            (input)="handleSearch()"
            autofocus
          >
        </div>
        <div class="ex-special-chars-preview">
          <span class="ex-preview-char">{{ previewChar }}</span>
          <span class="ex-preview-name" [title]="previewName">{{ previewName }}</span>
        </div>
      </div>

      <div class="ex-special-chars-tabs">
        @for (category of categories; track category.name) {
          <button 
            class="ex-special-chars-tab" 
            [class.active]="currentCategory === category.name"
            (click)="selectCategory(category.name)"
          >
            {{ category.name }}
          </button>
        }
      </div>

      <div class="ex-special-chars-grid">
        @if (displayedChars.length > 0) {
            @for (char of displayedChars; track $index) {
            <button 
                class="ex-special-char-btn" 
                [title]="getCharName(char)"
                (click)="insertCharacter(char)"
                (mouseenter)="updatePreview(char)"
            >
                {{ char }}
            </button>
            }
        } @else {
            <div class="ex-special-chars-no-results">
                Nenhum caractere encontrado
            </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./special-characters.component.scss']
})
export class SpecialCharactersComponent {
  editor = input.required<Editor>();
  onSelect = output<string>();

  categories = unicodeCategories;
  currentCategory = unicodeCategories[0]?.name || 'Letras Gregas';
  
  searchQuery = '';
  displayedChars: string[] = [];
  
  previewChar = 'Ω';
  previewName = 'Omega';

  constructor() {
    this.renderCharacters(this.currentCategory);
  }

  selectCategory(categoryName: string) {
    this.currentCategory = categoryName;
    this.searchQuery = '';
    this.renderCharacters(categoryName);
  }

  renderCharacters(categoryName: string) {
    const category = this.categories.find(c => c.name === categoryName);
    if (!category) return;
    
    this.displayedChars = category.chars.filter(char => 
        char && char.trim() !== '' && char.charCodeAt(0) >= 32
    );
  }

  handleSearch() {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.renderCharacters(this.currentCategory);
      return;
    }

    this.displayedChars = [];

    this.categories.forEach((category: UnicodeCategory) => {
      category.chars.forEach(char => {
        if (!char || char.trim() === '' || char.charCodeAt(0) < 32) return;

        const charName = this.getCharName(char).toLowerCase();
        if (char.includes(query) || charName.includes(query)) {
            this.displayedChars.push(char);
        }
      });
    });
  }

  updatePreview(char: string) {
    this.previewChar = char;
    this.previewName = this.getCharName(char);
  }

  insertCharacter(char: string) {
    this.editor().chain().focus().insertContent(char).run();
    this.onSelect.emit(char);
  }

  getCharName(char: string): string {
    for (const category of this.categories) {
      if (category.chars.includes(char)) {
        if (category.name === 'Letras Gregas') {
          const code = char.codePointAt(0) || 0;
          if (code >= 0x0391 && code <= 0x03a9) return `${char} (grega maiúscula)`;
          if (code >= 0x03b1 && code <= 0x03c9) return `${char} (grega minúscula)`;
        }
        if (category.name === 'Setas') return `${char} (seta)`;
        if (category.name === 'Matemáticos') return `${char} (matemático)`;
        if (category.name === 'Moedas') return `${char} (moeda)`;
        if (category.name === 'Música') return `${char} (música)`;
        if (category.name === 'Formas Geométricas') return `${char} (forma geométrica)`;
        if (category.name === 'Desenho de Caixas') return `${char} (box drawing)`;
        if (category.name === 'Técnicos') return `${char} (técnico)`;
        if (category.name === 'Diversos') return `${char} (diverso)`;
        if (category.name === 'Símbolos Comuns') return `${char} (comum)`;
      }
    }

    return `U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`;
  }
}
