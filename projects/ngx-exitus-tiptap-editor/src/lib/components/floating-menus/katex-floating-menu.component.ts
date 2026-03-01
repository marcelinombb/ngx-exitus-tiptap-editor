import { Component, input, signal, ElementRef, viewChild, inject, OnInit } from '@angular/core';
import { FloatingMenuService } from '../../services/floating-menu.service';
import { updateLatexDisplay } from '../../extensions/katex/katexView';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { TiptapBubbleMenuDirective } from '../../directives/tiptap-bubble-menu.directive';
import { KatexMenuService } from '../../services/katex-menu.service';

@Component({
    selector: 'katex-floating-menu',
    template: `
    <div class="bubble-menu-katex" tiptapBubbleMenu
      [editor]="editor()"
      [shouldShow]="shouldShowKatex"
      [pluginKey]="'katexBubbleMenu'"
      [options]="{ onUpdate }"
    >
      <div class="katex-input-row">
        <input type="text" [ngModel]="formula()" (ngModelChange)="onFormulaChange($event)" placeholder="Digite a fórmula LaTeX..."/>
        <button class="katex-apply-btn" (click)="aplicar()">Aplicar</button>
      </div>
      <div #preview class="katex-preview"></div>
    </div>
    `,
    styles: [
        `
        .bubble-menu-katex { 
          display: flex; 
          flex-direction: column;
          gap: 0.75rem;
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          width: 320px; 
          max-width: 90vw;
          background: #fefefe; 
          padding: 1rem; 
          border-radius: 12px; 
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04); 
          border: 1px solid #e6decc;
          user-select: none;
        }

        .katex-input-row {
          display: flex;
          gap: 0.5rem;
        }

        input[type="text"] { 
          flex: 1;
          padding: 0.5rem 0.75rem; 
          border-radius: 6px; 
          border: 1px solid #cbd5e1; 
          box-sizing: border-box;
          font-family: 'Inter', monospace;
          font-size: 0.875rem;
          color: #1e293b;
          transition: all 0.2s ease;
          background: #f8fafc;

          &::placeholder {
            color: #94a3b8;
          }

          &:focus {
            outline: none;
            border-color: #94a3b8;
            box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.1);
            background: #ffffff;
          }
        }

        .katex-apply-btn { 
          background: #1e293b; 
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

        .katex-preview { 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          padding: 0.75rem; 
          border-radius: 6px; 
          min-height: 48px; 
          overflow-x: auto;
          overflow-y: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .katex-preview.math-tex-error { 
          background: #fef2f2; 
          border-color: #fecaca; 
          color: #991b1b; 
          font-size: 0.875rem;
          padding: 0.5rem;
        }
        `
    ],
    standalone: true,
    imports: [FormsModule, TiptapBubbleMenuDirective],
})

export class KatexFloatingMenuComponent implements OnInit {

    editor = input.required<Editor>();

    pos: number | null = null;

    private katexMenuService = inject(KatexMenuService);

    private currentFormula = signal<string>('');

    protected formula = signal<string>('')

    private isInsertingNew = signal<boolean>(false);

    private preview = viewChild.required<ElementRef>('preview');

    private floatingMenuService = inject(FloatingMenuService);

    ngOnInit() {
        this.floatingMenuService.registerMenu('katex');
    }

    shouldShowKatex = ({ editor }: { editor: Editor }) => {

        const view = editor.view;
        const { selection } = view.state;
        const pos = selection.$anchor.pos;

        if (this.katexMenuService.forceOpen) {
            this.katexMenuService.setForceOpen(false);
            this.isInsertingNew.set(true);
            return true
        }

        this.pos = pos;

        if (!editor.isFocused) {
            return false;
        }

        return this.floatingMenuService.isMostSpecificNodeActive(editor, 'katex');

    }

    onUpdate = () => {
        if (!this.editor().isActive('katex')) return;
        const node = this.editor().view.state.doc.nodeAt(this.pos!);
        const latexFormula = node!.attrs['latexFormula'];
        this.formula.set(latexFormula);
        this.currentFormula.set(latexFormula);
        try { updateLatexDisplay(latexFormula, this.preview().nativeElement); } catch (e) { }
    }

    onFormulaChange(value: string) {
        this.formula.set(value);
        try {
            updateLatexDisplay(value, this.preview().nativeElement);
        } catch (e) {
            // ignore preview errors
        }
    }

    aplicar() {
        const { view } = this.editor();

        if (this.isInsertingNew()) {
            this.isInsertingNew.set(false);
            this.editor().chain().focus().insertContent({
                type: 'katex',
                attrs: {
                    isEditing: false,
                    latexFormula: this.formula()
                },
                updateSelection: false
            }).run();
        } else {
            const node = view.state.doc.nodeAt(this.pos!);
            if (node && node.type.name === 'katex') {
                const transaction = view.state.tr;
                transaction.setNodeMarkup(this.pos!, undefined, {
                    ...node.attrs,
                    latexFormula: this.formula(),
                    isEditing: false
                });
                view.dispatch(transaction);
                this.pos = null;
            }
        }
    }
}
