import { Component, OnInit, OnDestroy, ViewEncapsulation, signal } from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';

@Component({
  selector: 'alternative-item-component',
  template: `
    <div class="ex-alternative-item" [class.ex-selected]="selected()">
      <div contenteditable="false" class="ex-alternative-item-marker">
        {{ markerText() }}
      </div>
      <div class="ex-alternative-item-content" data-node-view-content></div>
    </div>
  `,
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
})
export class AlternativeItemComponent
  extends AngularNodeViewComponent
  implements OnInit, OnDestroy
{
  markerText = signal<string>('');

  constructor() {
    super();
  }

  ngOnInit() {
    this.markerText.set(this.node().attrs['data-marker'] || '');
    this.updateMarker();
    this.editor().on('update', this.onEditorUpdate);
    this.editor().on('transaction', this.onEditorUpdate);
  }

  ngOnDestroy() {
    this.editor().off('update', this.onEditorUpdate);
    this.editor().off('transaction', this.onEditorUpdate);
  }

  onEditorUpdate = () => {
    this.updateMarker();
  };

  updateMarker() {
    const editor = this.editor();
    const getPosFn = this.getPos();
    if (typeof getPosFn !== 'function') return;
    const posValue = getPosFn();
    if (typeof posValue !== 'number') return;

    const state = editor.state;
    if (posValue < 0 || posValue > state.doc.content.size) return;

    let resolvedPos;
    try {
      resolvedPos = state.doc.resolve(posValue);
    } catch (e) {
      return;
    }

    // Find the parent alternative node
    let parentNode = null;
    for (let depth = resolvedPos.depth; depth > 0; depth--) {
      const node = resolvedPos.node(depth);
      if (node.type.name === 'alternative') {
        parentNode = node;
        break;
      }
    }

    if (!parentNode) return;

    let index = -1;
    let currentIndex = 0;

    parentNode.forEach((child) => {
      if (child.type.name === 'alternativeItem') {
        if (child === this.node()) {
          index = currentIndex;
        }
        currentIndex++;
      }
    });

    const newMarker = this.getMarkerLabel(index);
    if (newMarker !== this.markerText()) {
      this.markerText.set(newMarker);

      if (this.node().attrs['data-marker'] !== newMarker) {
        setTimeout(() => {
          if (this.editor().isEditable) {
            this.updateAttributes()({ 'data-marker': newMarker });
          }
        });
      }
    }
  }

  private getMarkerLabel(index: number): string {
    if (index === -1) return '';
    return String.fromCharCode(97 + index) + ')'; // a), b), c)
  }
}
