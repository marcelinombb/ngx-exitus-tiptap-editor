import { Component, input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FloatingMenuService } from '../../services/floating-menu.service';
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
    <div class="bubble-menu-answer-box" tiptapBubbleMenu
      [editor]="editor()"
      [shouldShow]="shouldShow"
      [pluginKey]="'answerBoxBubbleMenu'"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [options]="{ flip: true, placement: 'top', onShow }"
    >
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
            title="Número de Linhas"
          />

          <div class="ex-toolbar-divider"></div>

          <editor-button
            [icon]="!boxHeader() ? 'header-view' : 'header-slash'"
            [title]="!boxHeader() ? 'Adicionar Cabeçalho' : 'Remover Cabeçalho'"
            (onClick)="toggleHeader()"
          ></editor-button>

          <editor-button
            [icon]="!boxBorder() ? 'square-rounded' : 'square-rounded-slash'" 
            [title]="!boxBorder() ? 'Adicionar Borda' : 'Remover Borda'"
            (onClick)="toggleBorder()"
          ></editor-button>
      </div>
    </div>
  `,
    styles: [`
    .bubble-menu-answer-box { 
      display: block; 
      font-family: 'Inter', system-ui, -apple-system, sans-serif; 
      width: max-content; 
      background: #fefefe; 
      padding: 0.5rem; 
      border-radius: 12px; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04); 
      border: 1px solid #e6decc;
      user-select: none;
    }
    
    .ex-toolbar-items {
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: 0.5rem;
    }
    
    .ex-toolbar-select, .ex-toolbar-input {
      background: transparent;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.375rem 0.5rem;
      font-size: 0.8125rem;
      font-family: inherit;
      color: #4a4a4a;
      transition: all 0.2s ease;

      &:hover {
        border-color: #94a3b8;
        background-color: #f8fafc;
      }
      
      &:focus {
        outline: none;
        border-color: #94a3b8;
        box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.1);
      }
    }

    .ex-toolbar-select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding-right: 1.75rem;
      cursor: pointer;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238F8F8F' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 14px;
    }
    
    .ex-toolbar-input {
      width: 50px;
      text-align: center;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }

    .ex-toolbar-divider {
      height: 24px;
      width: 1px;
      background-color: #e6decc;
      margin: 0 0.125rem;
    }
  `]
})
export class AnswerBoxFloatingMenuComponent implements OnInit, OnDestroy {
    editor = input.required<Editor>();

    boxStyle = signal<'box' | 'lines' | 'numbered-lines'>('box');
    boxLines = signal<number>(5);
    boxHeader = signal<boolean>(false);
    boxBorder = signal<boolean>(true);

    private floatingMenuService = inject(FloatingMenuService);

    ngOnInit() {
        this.floatingMenuService.registerMenu('answerBox');
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
        return this.floatingMenuService.isMostSpecificNodeActive(editor, 'answerBox');
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
