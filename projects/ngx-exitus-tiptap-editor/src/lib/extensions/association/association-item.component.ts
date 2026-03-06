import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';

@Component({
  selector: 'association-item-component',
  template: `
    <div class="ex-association-item" [class.ex-selected]="selected()">
      <div contenteditable="false" class="ex-association-item-marker">
        {{ markerText() }}
      </div>
      <div class="ex-association-item-content" data-node-view-content></div>
    </div>
  `,
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
})
export class AssociationItemComponent
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

    // Find the parent column
    let colType = null;
    let colNode = null;
    for (let depth = resolvedPos.depth; depth > 0; depth--) {
      const node = resolvedPos.node(depth);
      if (node.type.name === 'associationColumn') {
        colType = node.attrs['type'];
        colNode = node;
        break;
      }
    }

    if (!colType || !colNode) return;

    // Find the parent association to get the list type
    let listType = '123'; // Default
    for (let depth = resolvedPos.depth; depth > 0; depth--) {
      const node = resolvedPos.node(depth);
      if (node.type.name === 'association') {
        listType = colType === 'colA' ? node.attrs['colAListType'] : node.attrs['colBListType'];
        break;
      }
    }

    let index = -1;
    let currentIndex = 0;

    colNode.forEach((child) => {
      if (child.type.name === 'associationItem') {
        if (child === this.node()) {
          index = currentIndex;
        }
        currentIndex++;
      }
    });

    const newMarker = this.getMarkerLabel(listType, index);
    if (newMarker !== this.markerText()) {
      this.markerText.set(newMarker);

      // Ensure the node attribute is updated for getHTML() / renderHTML() output
      if (this.node().attrs['data-marker'] !== newMarker) {
        // Use a slight timeout to prevent update loops during an ongoing transaction
        setTimeout(() => {
          if (this.editor().isEditable) {
            this.updateAttributes()({ 'data-marker': newMarker });
          }
        });
      }
    }
  }

  private getMarkerLabel(type: string, index: number): string {
    if (index === -1) return '';
    switch (type) {
      case 'abc':
        return String.fromCharCode(65 + index) + ')'; // A), B), C)
      case 'roman':
        return this.toRoman(index + 1) + ')';
      case 'gap':
        return '(\u00A0\u00A0\u00A0)';
      case '123':
      default:
        return index + 1 + ') ';
    }
  }

  private toRoman(num: number): string {
    const romanNumerals: Record<string, number> = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1,
    };
    let result = '';
    for (const key in romanNumerals) {
      while (num >= romanNumerals[key]) {
        result += key;
        num -= romanNumerals[key];
      }
    }
    return result;
  }
}
