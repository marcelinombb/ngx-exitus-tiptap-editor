import { Component, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularNodeViewComponent } from 'ngx-tiptap';

@Component({
    selector: 'association-column-component',
    template: `
    <div class="ex-association-col-wrapper" 
         [class.ex-selected]="selected()"
         [attr.data-col-type]="colType()">
      <div class="ex-association-col-content" data-node-view-content></div>
      <div contenteditable="false" class="ex-association-add-btn-wrapper" *ngIf="editor().isEditable">
          <button class="ex-association-add-btn" (click)="addAssociationItem($event)" title="Adicionar item">
             + Item
          </button>
      </div>
    </div>
  `,
    standalone: true,
    imports: [CommonModule],
    encapsulation: ViewEncapsulation.None
})
export class AssociationColumnComponent extends AngularNodeViewComponent {

    colType = computed(() => this.node().attrs['type']);

    addAssociationItem(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        const { view } = this.editor();
        const getPosFn = this.getPos();
        if (typeof getPosFn !== 'function') return;
        const pos = getPosFn();
        if (pos === null || pos === undefined) return;

        const node = this.node();
        const insertPos = pos + node.nodeSize - 1; // Before the closing tag of the column

        this.editor().chain()
            .insertContentAt(insertPos, {
                type: 'associationItem',
                content: [{ type: 'paragraph' }]
            })
            .focus(insertPos + 2) // +1 for associationItem open tag, +1 for paragraph inner
            .run();
    }
}
