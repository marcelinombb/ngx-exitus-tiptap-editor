import { Component, output, signal } from '@angular/core';

@Component({
    selector: 'table-grid',
    standalone: true,
    template: `
    <div class="ex-table-grid-container">
      <div class="ex-table-grid-header">
        {{ hoveredRows }} x {{ hoveredCols }}
      </div>
      <div class="ex-table-grid" (mouseleave)="resetHover()">
        @for (row of rows; track row) {
          <div class="ex-table-grid-row">
            @for (col of cols; track col) {
              <div 
                class="ex-table-grid-cell"
                [class.selected]="row <= hoveredRows && col <= hoveredCols"
                (mouseenter)="onHover(row, col)"
                (click)="selectGrid(row, col)"
              ></div>
            }
          </div>
        }
      </div>
    </div>
  `,
    styles: `
    .ex-table-grid-container {
      padding: 10px;
      background: white;
      border-radius: 4px;
      user-select: none;
    }
    .ex-table-grid-header {
      text-align: center;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: bold;
      color: #666;
    }
    .ex-table-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ex-table-grid-row {
      display: flex;
      gap: 2px;
    }
    .ex-table-grid-cell {
      width: 12px;
      height: 12px;
      border: 1px solid #ddd;
      border-radius: 2px;
      cursor: pointer;
      transition: background-color 0.1s;
    }
    .ex-table-grid-cell:hover {
      border-color: hsl(218, 81.8%, 56.9%);
      background-color: #cae1fc;
    }
    .ex-table-grid-cell.selected {
      border-color: hsl(218, 81.8%, 56.9%);
      background-color: #cae1fc;
    }
  `
})
export class TableGridComponent {
    onSelect = output<{ rows: number; cols: number }>();

    rows = Array.from({ length: 10 }, (_, i) => i + 1);
    cols = Array.from({ length: 10 }, (_, i) => i + 1);

    hoveredRows = 0;
    hoveredCols = 0;

    onHover(row: number, col: number) {
        this.hoveredRows = row;
        this.hoveredCols = col;
    }

    resetHover() {
        this.hoveredRows = 0;
        this.hoveredCols = 0;
    }

    selectGrid(rows: number, cols: number) {
        this.onSelect.emit({ rows, cols });
    }
}
