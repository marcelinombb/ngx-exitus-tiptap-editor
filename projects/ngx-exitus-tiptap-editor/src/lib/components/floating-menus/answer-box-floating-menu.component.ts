import { Component, input, OnInit, OnDestroy, signal } from '@angular/core';
import { Editor } from '@tiptap/core';
import { TiptapBubbleMenuDirective } from '../../directives/tiptap-bubble-menu.directive';
import { EditorButtonComponent } from '../editor-button.component';
import { NodeSelection } from '@tiptap/pm/state';
import { findParentNode } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

@Component({
    selector: 'answer-box-floating-menu',
    standalone: true,
    imports: [TiptapBubbleMenuDirective, EditorButtonComponent],
    template: `
    <div class="bubble-menu" tiptapBubbleMenu
      [editor]="editor()"
      [shouldShow]="shouldShow"
      [pluginKey]="'answerBoxBubbleMenu'"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [options]="{ flip: true, placement: 'top', onShow }"
    >
      <div class="ex-toolbar-editor">
        <div class="ex-toolbar-items">
             <select (change)="onStyleChange($event)" [value]="boxStyle()" class="ex-toolbar-select">
                <option value="box">Caixa</option>
                <option value="lines">Linhas</option>
                <option value="numbered-lines">Linhas numeradas</option>
            </select>

            <input 
                type="number" 
                [value]="boxLines()" 
                (change)="onLinesChange($event)" 
                class="ex-toolbar-input" 
                min="1" 
                max="20"
            />

            <editor-button
            [icon]="!boxHeader() ? 'header-view' : 'header-slash'"
            [title]="'Alternar Cabeçalho'"
            (onClick)="toggleHeader()"
            >{{!boxHeader() ? 'Adicionar Cabeçalho' : 'Remover Cabeçalho'}}</editor-button>
           <editor-button
            [icon]="!boxBorder() ? 'square-rounded' : 'square-rounded-slash'" 
            [title]="'Alternar Borda'"
            (onClick)="toggleBorder()"
          >{{!boxBorder() ? 'Adicionar Borda' : 'Remover Borda'}}</editor-button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .bubble-menu { display:block; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; width: max-content; background: #ffffff; padding:12px; border-radius:12px; box-shadow: 0 8px 24px rgba(20,27,33,0.10); border: 1px solid rgba(16,24,40,0.04) }
    .ex-toolbar-items {
        display: flex;
        align-items: center;
        flex-direction: row;
        gap: 5px;
    }
    .ex-toolbar-select, .ex-toolbar-input {
        background: var(--ex-toolbar-bg, #fff);
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px;
        font-size: 12px;
        color: #333;
    }
    .ex-toolbar-input {
        width: 50px;
    }
  `]
})
export class AnswerBoxFloatingMenuComponent implements OnInit, OnDestroy {
    editor = input.required<Editor>();

    boxStyle = signal<'box' | 'lines' | 'numbered-lines'>('box');
    boxLines = signal<number>(5);
    boxHeader = signal<boolean>(false);
    boxBorder = signal<boolean>(true);

    ngOnInit() {
        this.editor().on('transaction', () => this.syncState());
        this.editor().on('selectionUpdate', () => this.syncState());
        this.editor().on('focus', () => this.syncState());
        this.syncState();
    }

    ngOnDestroy() {
        this.editor().off('transaction', this.syncState);
        this.editor().off('selectionUpdate', this.syncState);
        this.editor().off('focus', this.syncState);
    }

    private syncState() {
        const attrs = this.editor().getAttributes('answerBox');
        if (Object.keys(attrs).length > 0) {
            this.boxStyle.set(attrs['style'] || 'box');
            this.boxLines.set(attrs['lines'] || 5);
            this.boxHeader.set(!!attrs['showHeader']);
            this.boxBorder.set(!attrs['hideBorder']);
        }
    }

    shouldShow = ({ editor }: { editor: Editor }) => {
        if (!editor.isFocused) {
            return false;
        }

        const { selection } = editor.state;
        return editor.isActive('answerBox') || (selection instanceof NodeSelection && selection.node?.type.name === 'answerBox');
    };

    onShow = () => {
        requestAnimationFrame(() => this.editor().commands.setMeta('bubbleMenu', 'updatePosition'))
    };

    getReferencedVirtualElement = () => {
        const { state, view } = this.editor();
        const { selection } = state;

        let answerBoxNode: { node: ProseMirrorNode; pos: number } | undefined;

        if (selection instanceof NodeSelection && selection.node.type.name === 'answerBox') {
            answerBoxNode = { node: selection.node, pos: selection.from };
        } else {
            answerBoxNode = findParentNode((node) => node.type.name === 'answerBox')(selection);
        }

        if (answerBoxNode) {
            const dom = view.nodeDOM(answerBoxNode.pos) as HTMLElement | null;
            if (!dom) return null;

            return {
                getBoundingClientRect: () => dom.getBoundingClientRect(),
            };
        }

        return null;
    }

    toggleHeader() {
        this.editor().chain().focus().toggleAnswerBoxHeader().run();
    }

    toggleBorder() {
        this.editor().chain().focus().toggleAnswerBoxBorder().run();
    }

    onStyleChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        const style = target.value as 'box' | 'lines' | 'numbered-lines';
        this.editor().chain().focus().setAnswerBoxStyle(style).run();
    }

    onLinesChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const lines = parseInt(target.value, 10);
        if (!isNaN(lines)) {
            this.editor().chain().focus().setAnswerBoxLines(lines).run();
        }
    }
}
