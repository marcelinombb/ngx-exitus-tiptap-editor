import { Component, input } from '@angular/core';
import { Editor } from '@tiptap/core';
import { BubbleMenuComponent } from '../bubble-menu.component';
import { EditorButtonComponent } from '../editor-button.component';
import { NodeSelection } from '@tiptap/pm/state';
import { findParentNode } from '@tiptap/core';

@Component({
    selector: 'answer-box-floating-menu',
    standalone: true,
    imports: [BubbleMenuComponent, EditorButtonComponent],
    template: `
    <bubble-menu
      [editor]="editor()"
      [updateDelay]="0"
      [resizeDelay]="0"
      [shouldShow]="shouldShow"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [options]="{ flip: true, placement: 'top', onShow }"
    >
      <div class="ex-toolbar-editor">
        <div class="ex-toolbar-items">
             <select (change)="onStyleChange($event)" [value]="getStyle()" class="ex-toolbar-select">
                <option value="box">Caixa</option>
                <option value="lines">Linhas</option>
                <option value="numbered-lines">Linhas numeradas</option>
            </select>

            @if(true) {
                 <input 
                    type="number" 
                    [value]="getLines()" 
                    (change)="onLinesChange($event)" 
                    class="ex-toolbar-input" 
                    min="1" 
                    max="20"
                />
            }

             <editor-button
            [icon]="'heading'"
            [title]="'Alternar Cabeçalho'"
            [active]="hasHeader()"
            (onClick)="toggleHeader()"
          >Cabeçalho</editor-button>
           <editor-button
            [icon]="'rounded-corner'" 
            [title]="'Alternar Borda'"
            [active]="!hasBorder()"
            (onClick)="toggleBorder()"
          >Borda</editor-button>
        </div>
      </div>
    </bubble-menu>
  `,
    styles: [`
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
export class AnswerBoxFloatingMenuComponent {
    editor = input.required<Editor>();

    shouldShow = ({ editor }: { editor: Editor }) => {
        return editor.isActive('answerBox') && this.editor().isFocused;
    };

    onShow = () => {
        //requestAnimationFrame(() => this.editor().commands.setMeta('bubbleMenu', 'updatePosition'))
    };

    getReferencedVirtualElement = () => {
        const { state, view } = this.editor();
        const { selection } = state;

        // Try to find the answerBox node
        let result = findParentNode((n) => n.type.name === 'answerBox')(selection);

        // If not found in parents, check if the selection itself is the node
        if (!result && selection instanceof NodeSelection && selection.node.type.name === 'answerBox') {
            result = {
                pos: selection.from,
                start: selection.from + 1,
                depth: selection.$from.depth,
                node: selection.node
            };
        }

        if (result) {
            // Get the DOM element for the node
            const dom = view.nodeDOM(result.pos) as HTMLElement;
            if (dom) {
                // Return a virtual element interface that returns the rect
                return {
                    getBoundingClientRect: () => dom.getBoundingClientRect()
                }
            }
        }
        return null;
    }

    hasHeader() {
        // We can check attributes of the active answerBox
        return this.editor().getAttributes('answerBox')['showHeader'];
    }

    hasBorder() {
        return !this.editor().getAttributes('answerBox')['hideBorder'];
    }

    getStyle() {
        return this.editor().getAttributes('answerBox')['style'] || 'box';
    }

    getLines() {
        return this.editor().getAttributes('answerBox')['lines'] || 5;
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
