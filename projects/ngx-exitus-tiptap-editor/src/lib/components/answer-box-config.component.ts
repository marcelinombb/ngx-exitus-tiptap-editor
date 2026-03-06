import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';

@Component({
  selector: 'answer-box-config',
  imports: [FormsModule],
  template: `
    <div class="answer-box-config">
      <div class="config-header">
        <span class="config-title">Configurar Caixa de Resposta</span>
      </div>

      <div class="config-body">
        <label class="config-row">
          <span class="row-label">Tipo</span>
          <select [(ngModel)]="selectedStyle">
            <option value="box">Caixa</option>
            <option value="lines">Linhas</option>
            <option value="numbered-lines">Linhas Numeradas</option>
          </select>
        </label>

        @if (selectedStyle() !== 'box') {
          <label class="config-row">
            <span class="row-label">Linhas (1-20)</span>
            <input type="number" [(ngModel)]="lineCount" min="1" max="20" />
          </label>
        }

        <label class="config-checkbox-row">
          <input type="checkbox" [(ngModel)]="showHeader" />
          <span class="checkbox-label">Mostrar Cabeçalho</span>
        </label>

        <label class="config-checkbox-row">
          <input type="checkbox" [(ngModel)]="hideBorder" />
          <span class="checkbox-label">Ocultar Borda Externa</span>
        </label>
      </div>

      <div class="config-actions">
        <button class="insert-btn" (click)="insert()">Inserir Caixa</button>
      </div>
    </div>
  `,
  styles: [
    `
      .answer-box-config {
        min-width: 260px;
        display: flex;
        flex-direction: column;
        background: #fefefe;
        font-family: 'Inter', sans-serif;
        user-select: none;
      }

      .config-header {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e6decc;
        background: #fcfcfc;
      }

      .config-title {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #686868;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .config-body {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
      }

      .config-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        cursor: pointer;

        .row-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #5c5955;
        }

        select,
        input[type='number'] {
          padding: 0.375rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #494949;
          font-family: inherit;
          transition: all 0.2s ease;
          background-color: transparent;

          &:focus {
            outline: none;
            border-color: #94a3b8;
            box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.1);
          }
        }

        select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 2rem;
          cursor: pointer;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238F8F8F' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.6rem center;
          background-size: 14px;

          &:hover {
            border-color: #94a3b8;
            background-color: #f8fafc;
          }
        }

        input[type='number'] {
          width: 60px;
          text-align: center;

          &:hover {
            border-color: #94a3b8;
          }
        }
      }

      .config-checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        margin-top: 0.25rem;

        input[type='checkbox'] {
          width: 1rem;
          height: 1rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          accent-color: #1e293b;
        }

        .checkbox-label {
          font-size: 0.875rem;
          font-weight: 400;
          color: #5c5955;
        }

        &:hover .checkbox-label {
          color: #1e293b;
        }
      }

      .config-actions {
        padding: 0 1rem 1rem 1rem;
        display: flex;
        justify-content: stretch;
      }

      .insert-btn {
        width: 100%;
        background-color: #1e293b;
        color: #fefefe;
        border: 1px solid #1e293b;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover {
          background-color: #334155;
          border-color: #334155;
        }

        &:active {
          background-color: #0f172a;
          transform: scale(0.98);
        }
      }
    `,
  ],
})
export class AnswerBoxConfigComponent {
  editor = input.required<Editor>();
  onSelect = output<void>();

  selectedStyle = signal<'box' | 'lines' | 'numbered-lines'>('lines');
  lineCount = signal<number>(5);
  showHeader = signal<boolean>(false);
  hideBorder = signal<boolean>(false);

  insert() {
    this.editor()
      .chain()
      .focus()
      .insertContent({
        type: 'answerBox',
        attrs: {
          style: this.selectedStyle(),
          lines: this.lineCount(),
          showHeader: this.showHeader(),
          hideBorder: this.hideBorder(),
        },
      })
      .run();
    this.onSelect.emit();
  }
}
