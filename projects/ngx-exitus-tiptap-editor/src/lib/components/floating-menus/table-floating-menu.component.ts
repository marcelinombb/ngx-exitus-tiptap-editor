import { Component, input } from '@angular/core';
import { EditorButtonComponent } from '../editor-button.component';
import { Editor, findParentNode } from '@tiptap/core';
import { BubbleMenuComponent } from '../bubble-menu.component';
import { NodeSelection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

@Component({
    standalone: true,
    imports: [EditorButtonComponent, BubbleMenuComponent],
    selector: 'table-floating-menu',
    template: `
    <bubble-menu
      [editor]="editor()"
      [updateDelay]="0"
      [resizeDelay]="0"
      [shouldShow]="shouldShowTable"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [pluginKey]="'tableBubbleMenu'"
      [options]="{ flip: true, placement: 'top', onShow }"
    >
      <div class="ex-toolbar-editor" style="border: none; padding: 0;">
        <div class="ex-toolbar-items">
          <editor-button icon="table-column-plus-before" title="Adicionar coluna antes" (onClick)="addColumnBefore()"></editor-button>
          <editor-button icon="table-column-plus-after" title="Adicionar coluna depois" (onClick)="addColumnAfter()"></editor-button>
          <editor-button icon="table-column-remove" title="Remover coluna" (onClick)="deleteColumn()"></editor-button>
          <span class="ex-toolbar-separator"></span>
          <editor-button icon="table-row-plus-before" title="Adicionar linha antes" (onClick)="addRowBefore()"></editor-button>
          <editor-button icon="table-row-plus-after" title="Adicionar linha depois" (onClick)="addRowAfter()"></editor-button>
          <editor-button icon="table-row-remove" title="Remover linha" (onClick)="deleteRow()"></editor-button>
          <span class="ex-toolbar-separator"></span>
          <editor-button icon="table-merge-cells" title="Mesclar células" (onClick)="mergeCells()"></editor-button>
          <editor-button icon="table-split-cells" title="Dividir célula" (onClick)="splitCell()"></editor-button>
          <span class="ex-toolbar-separator"></span>
          <editor-button icon="table-header-column" title="Alternar coluna de cabeçalho" (onClick)="toggleHeaderColumn()"></editor-button>
          <editor-button icon="table-header-row" title="Alternar linha de cabeçalho" (onClick)="toggleHeaderRow()"></editor-button>
          <span class="ex-toolbar-separator"></span>
          <editor-button icon="table-remove" title="Remover tabela" (onClick)="deleteTable()"></editor-button>
        </div>
      </div>
    </bubble-menu>
  `,
    styles: `
        .ex-toolbar-editor,
        .ex-toolbar-items {
            display: flex;
            background-color: #fff;
        }

        .ex-toolbar-editor {
            border: 1px solid var(--border-gray);
            padding: 0 calc(0.6em * 0.5);
            border-radius: 6px;
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
            margin-left: var(--spacing-sm);
        }
    `
})
export class TableFloatingMenuComponent {
    editor = input.required<Editor>();

    shouldShowTable = (props: any) => {
        return this.editor().isActive('table') && this.editor().isFocused;
    };

    addColumnBefore() {
        this.editor().chain().focus().addColumnBefore().run();
    }

    addColumnAfter() {
        this.editor().chain().focus().addColumnAfter().run();
    }

    deleteColumn() {
        this.editor().chain().focus().deleteColumn().run();
    }

    addRowBefore() {
        this.editor().chain().focus().addRowBefore().run();
    }

    addRowAfter() {
        this.editor().chain().focus().addRowAfter().run();
    }

    deleteRow() {
        this.editor().chain().focus().deleteRow().run();
    }

    deleteTable() {
        this.editor().chain().focus().deleteTable().run();
    }

    mergeCells() {
        this.editor().chain().focus().mergeCells().run();
    }

    splitCell() {
        this.editor().chain().focus().splitCell().run();
    }

    toggleHeaderColumn() {
        this.editor().chain().focus().toggleHeaderColumn().run();
    }

    toggleHeaderRow() {
        this.editor().chain().focus().toggleHeaderRow().run();
    }

    getReferencedVirtualElement = () => {
        const { state, view } = this.editor();
        const { selection } = state;

        let tableNode: { node: ProseMirrorNode; pos: number } | undefined;

        if (selection instanceof NodeSelection && selection.node.type.name === 'table') {
            tableNode = { node: selection.node, pos: selection.from };
        } else {
            tableNode = findParentNode((node) => node.type.name === 'table')(selection);
        }

        if (tableNode) {
            const dom = view.nodeDOM(tableNode.pos) as HTMLElement | null;
            if (!dom) return null;

            return {
                getBoundingClientRect: () => dom.getBoundingClientRect(),
            };
        }

        return null;
    }

    onShow = () => {
        requestAnimationFrame(() => this.editor().commands.setMeta('bubbleMenu', 'updatePosition'))
    };
}
