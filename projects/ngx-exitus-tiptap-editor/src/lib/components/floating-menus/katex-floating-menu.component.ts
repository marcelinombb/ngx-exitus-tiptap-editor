import { Component, input, signal, ElementRef, viewChild } from '@angular/core';
import { updateLatexDisplay } from '../../extensions/katex/katexView';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { BubbleMenuComponent } from '../bubble-menu.component';

export const katexMenuControl = {
    forceOpen: false,
}

@Component({
    selector: 'katex-floating-menu',
    template: `
    <bubble-menu #bubble [editor]="editor()" [shouldShow]="shouldShowKatex" [options]="{ onUpdate }">
        <input type="text" [ngModel]="formula()" (ngModelChange)="onFormulaChange($event)"/>
        <button (click)="aplicar()">aplicar</button>
        <div #preview class="katex-preview" style="margin-top:8px;"></div>
    </bubble-menu>
    `,
    styles: [
        `
         input[type="text"]{ width:100%; padding:8px 10px; border-radius:8px; border:1px solid #e6edf3; box-sizing:border-box }
         button{ margin-top:8px; background:#2563eb; color:white; border:none; padding:7px 10px; border-radius:8px; cursor:pointer }
         button:active{ transform:translateY(1px) }
         .katex-preview{ margin-top:8px; background:#fbfdff; border:1px solid #e6eef8; padding:8px; border-radius:8px; min-height:36px; overflow:auto }
         .katex-preview.math-tex-error{ background:#fff7f7; border-color:#ffd4d4; color:#7f1d1d }
        `
    ],
    standalone: true,
    imports: [FormsModule, BubbleMenuComponent],
})

export class KatexFloatingMenuComponent {

    editor = input.required<Editor>();

    pos: number | null = null;

    private currentFormula = signal<string>('');

    protected formula = signal<string>('')

    private isInsertingNew = signal<boolean>(false);

    private preview = viewChild.required<ElementRef>('preview');

    shouldShowKatex = (props: any): boolean => {

        const view = this.editor().view;
        const { selection } = view.state;
        const pos = selection.$anchor.pos;

        if (katexMenuControl.forceOpen) {
            katexMenuControl.forceOpen = false
            this.isInsertingNew.set(true);
            return true
        }

        this.pos = pos;

        return this.editor().isActive('katex');

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
