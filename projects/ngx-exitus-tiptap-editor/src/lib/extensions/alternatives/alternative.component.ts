import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularNodeViewComponent } from 'ngx-tiptap';
import { EditorButtonComponent } from '../../components/editor-button.component';

@Component({
  selector: 'alternative-component',
  template: `
    <div class="ex-alternative-wrapper" [class.ex-selected]="selected()">
      <div class="ex-alternative-controls" contenteditable="false" *ngIf="editor().isEditable">
        <div class="controls-left">
          <span class="alternative-title">Alternativas</span>
        </div>
        <div class="controls-right">
          <editor-button
            icon="delete-bin"
            title="Remover Alternativas"
            (onClick)="removeAlternative()"
          ></editor-button>
        </div>
      </div>

      <div class="ex-alternative-col-wrapper">
        <div class="ex-alternative-content" data-node-view-content></div>
        <div
          contenteditable="false"
          class="ex-alternative-add-btn-wrapper"
          *ngIf="editor().isEditable"
        >
          <button
            class="ex-alternative-add-btn"
            (click)="addAlternativeItem($event)"
            title="Adicionar item"
          >
            + Item
          </button>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, EditorButtonComponent],
  encapsulation: ViewEncapsulation.None,
})
export class AlternativeComponent extends AngularNodeViewComponent {
  removeAlternative() {
    this.deleteNode()();
  }

  addAlternativeItem(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const getPosFn = this.getPos();
    if (typeof getPosFn !== 'function') return;
    const pos = getPosFn();
    if (typeof pos !== 'number') return;

    const node = this.node();
    const insertPos = pos + node.nodeSize - 1; // Before the closing tag of the element

    this.editor()
      .chain()
      .insertContentAt(insertPos, {
        type: 'alternativeItem',
        content: [{ type: 'paragraph' }],
      })
      .focus(insertPos + 2) // +1 for alternativeItem open tag, +1 for paragraph inner
      .run();
  }
}
