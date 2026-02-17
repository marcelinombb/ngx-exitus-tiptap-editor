
import { Component, computed, ViewEncapsulation } from '@angular/core';
import { AngularNodeViewComponent } from 'ngx-tiptap';

@Component({
  selector: 'answer-box-component',
  template: `
    <div class="ex-answer-box tiptap-widget" 
         [class.ex-selected]="selected()"
         [class.ex-answer-box-no-border]="hideBorder()"
         [attr.data-style]="style()">

      <!-- Header Container for Content -->
      <div class="ex-answer-box-header" 
           [style.display]="showHeader() ? 'block' : 'none'"
           data-node-view-content>
      </div>

      <!-- Visuals (Box or Lines) -->
      <div class="ex-answer-box-visuals" contenteditable="false">
        @if (style() === 'lines' || style() === 'numbered-lines') {
          @for (line of linesArray(); track $index) {
             <div class="ex-answer-line">
               @if (style() === 'numbered-lines') {
                 <span class="ex-answer-number">{{ $index + 1 }}.</span>
               }
             </div>
          }
        } @else {
           <!-- Box Style -->
           <div [style.height.px]="boxHeight()"></div>
        }
      </div>

      <!-- Insert Paragraph Before Button -->
      <div class="insert-paragraph-btn insert-paragraph-before" 
           title="Inserir parágrafo antes"
           (click)="insertParagraph('before', $event)">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/>
        </svg>
      </div>

      <!-- Insert Paragraph After Button -->
      <div class="insert-paragraph-btn insert-paragraph-after" 
           title="Inserir parágrafo após"
           (click)="insertParagraph('after', $event)">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/>
        </svg>
      </div>

    </div>
  `,
  styles: [`
    /* We expect global styles or styles from editor.scss to apply to .ex-answer-box */
    /* Component host shouldn't block layout */
    :host {
      display: block!important; 
      /* margin: 1rem 0; REMOVED to act as wrapper only */
    }
  `],
  standalone: true,
  imports: []
})
export class AnswerBoxComponent extends AngularNodeViewComponent {
  // Computed properties from node attributes
  style = computed(() => this.node().attrs['style'] || 'box');
  lines = computed(() => this.node().attrs['lines'] || 3);
  boxHeight = computed(() => this.lines() * 30 || 100);
  showHeader = computed(() => this.node().attrs['showHeader'] !== false);
  hideBorder = computed(() => this.node().attrs['hideBorder'] === true);

  linesArray = computed(() => {
    return Array(this.lines()).fill(0);
  });

  insertParagraph(where: 'before' | 'after', event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const getPosFn = this.getPos();
    if (typeof getPosFn !== 'function') return;

    const pos = getPosFn();
    if (pos === undefined) return;

    const insertionPos = where === 'before' ? pos : pos + this.node().nodeSize;

    this.editor().chain()
      .insertContentAt(insertionPos, { type: 'paragraph' })
      .focus(where === 'before' ? insertionPos : insertionPos + 1)
      .run();
  }
}
