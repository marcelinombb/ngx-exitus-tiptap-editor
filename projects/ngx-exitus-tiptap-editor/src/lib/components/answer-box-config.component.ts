import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';

@Component({
    selector: 'answer-box-config',
    imports: [FormsModule],
    template: `
    <div class="answer-box-config">
      <div class="config-row">
        <label>Tipo:</label>
        <select [(ngModel)]="selectedStyle">
          <option value="box">Caixa</option>
          <option value="lines">Linhas</option>
          <option value="numbered-lines">Linhas Numeradas</option>
        </select>
      </div>

      @if (selectedStyle() !== 'box') {
        <div class="config-row">
          <label>Linhas:</label>
          <input type="number" [(ngModel)]="lineCount" min="1" max="20" />
        </div>
      }
      
      <div class="config-row">
         <label>
             <input type="checkbox" [(ngModel)]="showHeader"> Mostrar Cabeçalho
         </label>
      </div>

       <div class="config-row">
         <label>
             <input type="checkbox" [(ngModel)]="hideBorder"> Ocultar Borda
         </label>
      </div>

      <div class="config-actions">
        <button class="insert-btn" (click)="insert()">Inserir</button>
      </div>
    </div>
  `,
    styles: [`
    .answer-box-config {
      padding: 10px;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .config-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      
      label {
        font-size: 13px;
        color: #333;
      }

      select, input[type="number"] {
        padding: 4px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 13px;
      }
      
      input[type="number"] {
          width: 50px;
      }
    }
    .config-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 5px;
    }
    .insert-btn {
      background-color: var(--active-blue, #0056b3);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;

      &:hover {
        opacity: 0.9;
      }
    }
  `]
})
export class AnswerBoxConfigComponent {
    editor = input.required<Editor>();
    onSelect = output<void>();

    selectedStyle = signal<'box' | 'lines' | 'numbered-lines'>('lines');
    lineCount = signal<number>(5);
    showHeader = signal<boolean>(false);
    hideBorder = signal<boolean>(false);

    insert() {
        this.editor().chain().focus().insertContent({
            type: 'answerBox',
            attrs: {
                style: this.selectedStyle(),
                lines: this.lineCount(),
                showHeader: this.showHeader(),
                hideBorder: this.hideBorder()
            }
        }).run();
        this.onSelect.emit();
    }
}
