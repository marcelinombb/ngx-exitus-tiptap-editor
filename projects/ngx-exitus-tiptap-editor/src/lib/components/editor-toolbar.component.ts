import { ChangeDetectorRef, Component, inject, input, OnInit } from '@angular/core';
import { EditorButtonComponent } from './editor-button.component';
import { EditorDropdownComponent } from './editor-dropdown.component';
import { Editor } from '@tiptap/core';
import { katexMenuControl } from '../extensions/katex/katex-floating-menu.component';

@Component({
    standalone: true,
    imports: [EditorButtonComponent, EditorDropdownComponent],
    selector: 'editor-toolbar',
    template: `
        <div class="ex-toolbar-editor">
            <div class="ex-toolbar-items">
                <editor-button [icon]="'bold'" [title]="'Negrito'" [active]="isActive('bold')" (onClick)="toggleBold()"></editor-button>
                <editor-button [icon]="'italic'" [title]="'Itálico'" [active]="isActive('italic')" (onClick)="toggleItalic()"></editor-button>
                <editor-button [icon]="'underline'" [title]="'Sublinhado'" [active]="isActive('underline')" (onClick)="toggleUnderline()"></editor-button>
                <editor-button [icon]="'strike'" [title]="'Tachado'" [active]="isActive('strike')" (onClick)="toggleStrike()"></editor-button>
                <editor-button [icon]="'subscript'" [title]="'Subscrito'" [active]="isActive('subscript')" (onClick)="toggleSubscript()"></editor-button>
                <editor-button [icon]="'superscript'" [title]="'Sobrescrito'" [active]="isActive('superscript')" (onClick)="toggleSuperscript()"></editor-button>
                <editor-button [icon]="'format-clear'" [title]="'Limpar formatação'" [active]="isActive('format-clear')" (onClick)="unsetAllMarks()"></editor-button>
                <span class="ex-toolbar-separator"></span>
                <editor-button [icon]="'table'" [title]="'Tabela'" [active]="isActive('table')"></editor-button>
                <editor-dropdown>
                    <editor-button [icon]="'align-left'" [title]="'Alinhar à esquerda'" [active]="isActive('alignLeft')" (onClick)="setTextAlign('left')"></editor-button>
                    <editor-button [icon]="'align-right'" [title]="'Alinhar à direita'" [active]="isActive('alignRight')" (onClick)="setTextAlign('right')"></editor-button>
                    <editor-button [icon]="'align-center'" [title]="'Alinhar ao centro'" [active]="isActive('alignCenter')" (onClick)="setTextAlign('center')"></editor-button>
                    <editor-button [icon]="'align-justify'" [title]="'Alinhar justificado'" [active]="isActive('alignJustify')" (onClick)="setTextAlign('justify')"></editor-button>
                </editor-dropdown>
                <editor-button [icon]="'image'" [title]="'Inserir imagem'" [active]="isActive('image')"></editor-button>
                <editor-button [icon]="'blockquote'" [title]="'Citação'" [active]="isActive('blockquote')" (onClick)="toggleBlockquote()"></editor-button>
                <editor-button [icon]="'undo'" [title]="'Desfazer'" [active]="isActive('undo')" (onClick)="undo()"></editor-button>
                <editor-button [icon]="'redo'" [title]="'Refazer'" [active]="isActive('redo')" (onClick)="redo()"></editor-button>
                 <editor-dropdown>
                    <editor-button [icon]="'bullet-list'" [title]="'Lista não ordenada'" [active]="isActive('bulletList')" (onClick)="toggleBulletList()"></editor-button>
                    <editor-button [icon]="'ordered-list'" [title]="'Lista ordenada'" [active]="isActive('orderedList')" (onClick)="toggleOrderedList()"></editor-button>
                </editor-dropdown>
                <editor-button [icon]="'indent-decrease'" [title]="'Diminuir recuo'" [active]="isActive('indent')" (onClick)="decreaseIndent()"></editor-button>
                <editor-button [icon]="'indent-increase'" [title]="'Aumentar recuo'" [active]="isActive('indent')" (onClick)="increaseIndent()"></editor-button>
                <span class="ex-toolbar-separator"></span>
                <editor-button [icon]="'formula'" [title]="'Inserir fórmula'" [active]="isActive('katex')" (onClick)="insertFormula()"></editor-button>
               
             </div>
        </div>
    `,
    styles: `
        .ex-toolbar-editor,
        .ex-toolbar-items {
        display: flex;
        background-color: #fff;
        }

        .ex-toolbar-editor {
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            border: 1px solid var(--border-gray);
            padding: 0 calc(0.6em * 0.5);
        }

        .ex-toolbar-items {
        align-items: center;
        border-radius: 5px;
        }

        .ex-toolbar-separator {
        display: inline-block;
        align-self: stretch;
        background: var(--border-gray);
        margin-bottom: var(--spacing-sm);
        margin-top: var(--spacing-sm);
        min-width: 1px;
        width: 1px;
        margin-right: var(--spacing-sm);
        }
    `
})
export class EditorToolbarComponent implements OnInit {

    private cdr = inject(ChangeDetectorRef);

    editor = input.required<Editor>()

    ngOnInit(): void {
        this.editor().on('selectionUpdate', () => this.cdr.detectChanges());
    }

    isActive(name: string): boolean {
        return this.editor().isActive(name);
    }

    toggleBold() {
        this.editor().chain().focus().toggleBold().run();
    }

    toggleItalic() {
        this.editor().chain().focus().toggleItalic().run()
    }

    toggleStrike() {
        this.editor().chain().focus().toggleStrike().run()
    }

    toggleUnderline() {
        this.editor().chain().focus().toggleUnderline().run()
    }

    toggleBlockquote() {
        this.editor().chain().focus().toggleBlockquote().run()
    }

    toggleBulletList() {
        this.editor().chain().focus().toggleBulletList().run()
    }

    toggleOrderedList() {
        this.editor().chain().focus().toggleOrderedList().run()
    }

    toggleSubscript() {
        this.editor().chain().focus().toggleSubscript().run()
    }
    
    toggleSuperscript() {
        this.editor().chain().focus().toggleSuperscript().run()
    }

    unsetAllMarks() {
        this.editor().chain().focus().unsetAllMarks().run()
    }

    setTextAlign(align: 'left' | 'center' | 'right' | 'justify') {
        this.editor().chain().focus().setTextAlign(align).run()
    }

    decreaseIndent() {
        this.editor().commands.outdent()
    }

    increaseIndent() {
        this.editor().commands.indent()
    }

    undo() {
        this.editor().chain().focus().undo().run()
    }

    redo() {
        this.editor().chain().focus().redo().run()
    }

    insertFormula() {
        katexMenuControl.forceOpen = true
        this.editor().commands.focus()
    }

}