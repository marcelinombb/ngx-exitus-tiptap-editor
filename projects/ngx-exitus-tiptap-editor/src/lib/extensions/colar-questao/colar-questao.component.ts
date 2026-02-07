
import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Editor } from '@tiptap/core';

@Component({
  selector: 'colar-questao-component',
  template: `
    <div class="colar-questao" 
         draggable="true" 
         (drop)="handleDrop($event)">
      
      <label contenteditable="false">{{ title() }}</label>
      
      <button contenteditable="false" class="close-colar" (click)="handleRemove()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path>
        </svg>
      </button>

      <div class="colar-content is-editable" data-node-view-content></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: 1rem 0;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  standalone: true
})
export class ColarQuestaoComponent extends AngularNodeViewComponent {

  title = computed(() => this.node().attrs['title']);

  handleRemove() {
    const getPos = this.getPos();
    if (typeof getPos === 'function') {
      const pos = getPos();
      if (pos !== undefined) {
        this.editor().commands.removeColarQuestao(pos);
      }
    }
  }

  handleDrop(event: DragEvent) {
    const draggedNodeType = event.dataTransfer?.getData('text/html') ?? '';
    if (/colar-questao/i.test(draggedNodeType)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
