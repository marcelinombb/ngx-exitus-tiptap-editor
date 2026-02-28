import { Component, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularNodeViewComponent } from 'ngx-tiptap';
import { EditorButtonComponent } from '../../components/editor-button.component';

@Component({
  selector: 'association-component',
  template: `
    <div class="ex-association-wrapper" 
         [class.ex-selected]="selected()"
         [attr.data-cola-type]="colAListType()"
         [attr.data-colb-type]="colBListType()">
      <div class="ex-association-controls" contenteditable="false" *ngIf="editor().isEditable">
        <div class="controls-left">
          <span class="association-title">Associação</span>
          <div class="col-control">
            <label>Coluna A:</label>
            <select [value]="colAListType()" (change)="onColTypeChange('A', $event)">
              <option value="123" [disabled]="colBListType() === '123'">1, 2, 3</option>
              <option value="abc" [disabled]="colBListType() === 'abc'">A, B, C</option>
              <option value="roman" [disabled]="colBListType() === 'roman'">I, II, III</option>
              <option value="gap" [disabled]="colBListType() === 'gap'">( _ )</option>
            </select>
          </div>
          <div class="col-control">
             <label>Coluna B:</label>
             <select [value]="colBListType()" (change)="onColTypeChange('B', $event)">
              <option value="123" [disabled]="colAListType() === '123'">1, 2, 3</option>
              <option value="abc" [disabled]="colAListType() === 'abc'">A, B, C</option>
              <option value="roman" [disabled]="colAListType() === 'roman'">I, II, III</option>
              <option value="gap" [disabled]="colAListType() === 'gap'">( _ )</option>
            </select>
          </div>
        </div>
        <div class="controls-right">
          <editor-button icon="delete-bin" title="Remover Associação" (onClick)="removeAssociation()"></editor-button>
        </div>
      </div>

      <div class="ex-association-content" data-node-view-content></div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, EditorButtonComponent],
  encapsulation: ViewEncapsulation.None
})
export class AssociationComponent extends AngularNodeViewComponent {
  colAListType = computed(() => this.node().attrs['colAListType'] || '123');
  colBListType = computed(() => this.node().attrs['colBListType'] || 'gap');

  onColTypeChange(col: 'A' | 'B', event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    if (col === 'A') {
      this.updateAttributes()({ colAListType: value });
    } else {
      this.updateAttributes()({ colBListType: value });
    }
  }

  removeAssociation() {
    this.deleteNode()();
  }
}
