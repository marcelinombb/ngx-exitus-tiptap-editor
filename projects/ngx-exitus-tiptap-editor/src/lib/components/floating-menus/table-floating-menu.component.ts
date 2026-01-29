import { Component, input } from '@angular/core';
import { EditorButtonComponent } from '../editor-button.component';
import { Editor, findParentNode } from '@tiptap/core';
import { BubbleMenuComponent } from '../bubble-menu.component';
import { NodeSelection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorDropdownComponent } from "../editor-dropdown.component";

@Component({
    standalone: true,
    imports: [EditorButtonComponent, BubbleMenuComponent, EditorDropdownComponent],
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
            <editor-dropdown icon="table-header-column" title="Colunas" [updateIcon]="false">
                <editor-button icon="table-header-column" title="Alternar coluna de cabeçalho" (onClick)="toggleHeaderColumn()">
                    Alternar coluna de cabeçalho
                </editor-button>
                <editor-button icon="table-column-plus-before" title="Adicionar coluna antes" (onClick)="addColumnBefore()">
                    Adicionar coluna antes
                </editor-button>
                <editor-button icon="table-column-plus-after" title="Adicionar coluna depois" (onClick)="addColumnAfter()">
                    Adicionar coluna depois 
                </editor-button>
                <editor-button icon="table-column-remove" title="Remover coluna" (onClick)="deleteColumn()">
                    Remover coluna
                </editor-button>
            </editor-dropdown>
          <span class="ex-toolbar-separator"></span>
          <editor-dropdown icon="table-header-row" title="Linhas" [updateIcon]="false">
            <editor-button icon="table-header-row" title="Alternar linha de cabeçalho" (onClick)="toggleHeaderRow()">
                Alternar linha de cabeçalho
            </editor-button>
            <editor-button icon="table-row-plus-before" title="Adicionar linha antes" (onClick)="addRowBefore()">
                Adicionar linha antes
            </editor-button>
            <editor-button icon="table-row-plus-after" title="Adicionar linha depois" (onClick)="addRowAfter()">
                Adicionar linha depois
                </editor-button>
            <editor-button icon="table-row-remove" title="Remover linha" (onClick)="deleteRow()">
                Remover linha
            </editor-button>
          </editor-dropdown>
          <span class="ex-toolbar-separator"></span>
          <editor-dropdown icon="table-merge-cell" title="Mesclar células" [updateIcon]="false">   
            <editor-button icon="merge-cells-horizontal" title="Mesclar células" (onClick)="mergeCells()">
                Mesclar células
            </editor-button>
            <editor-button icon="split-cells-horizontal" title="Dividir célula" (onClick)="splitCell()">
                Dividir células
            </editor-button>
          </editor-dropdown>
          <span class="ex-toolbar-separator"></span>
          <editor-dropdown icon="table-view" title="Bordas" [updateIcon]="false">
            <editor-button icon="table-view" title="Alternar bordas externas" (onClick)="toggleOuterBorder()"></editor-button>
            <editor-button icon="table-row" title="Apenas bordas horizontais" (onClick)="toggleVerticalBorder()"></editor-button>
            <editor-button icon="table-row" title="Sem bordas" (onClick)="toggleBorders()"></editor-button>
          </editor-dropdown>
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

    toggleOuterBorder() {
        this.toggleTableAttribute('noOuterBorder');
    }

    toggleVerticalBorder() {
        this.toggleTableAttribute('noVerticalBorder');
    }

    toggleBorders() {
        this.toggleTableAttribute('noBorders');
    }

    private toggleTableAttribute(attribute: string) {
        const { state, dispatch } = this.editor().view;
        const { selection } = state;

        let tablePos: number | null = null;
        let tableNode: ProseMirrorNode | null = null;

        if (selection instanceof NodeSelection && selection.node.type.name === 'table') {
            tablePos = selection.from;
            tableNode = selection.node;
        } else {
            const predicate = (node: ProseMirrorNode) => node.type.name === 'table';
            const parent = findParentNode(predicate)(selection);
            if (parent) {
                tablePos = parent.pos;
                tableNode = parent.node;
            }
        }

        if (tablePos !== null && tableNode !== null && dispatch) {
            const currentState = tableNode.attrs[attribute];
            dispatch(state.tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, [attribute]: !currentState }));
        }
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
