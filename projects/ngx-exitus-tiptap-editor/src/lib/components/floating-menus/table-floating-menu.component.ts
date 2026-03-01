import { Component, input, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { EditorButtonComponent } from '../editor-button.component';
import { Editor, findParentNode } from '@tiptap/core';
import { TiptapBubbleMenuDirective } from '../../directives/tiptap-bubble-menu.directive';
import { NodeSelection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorDropdownComponent } from "../editor-dropdown.component";
import { FloatingMenuService } from '../../services/floating-menu.service';

@Component({
    standalone: true,
    imports: [EditorButtonComponent, TiptapBubbleMenuDirective, EditorDropdownComponent],
    selector: 'table-floating-menu',
    template: `
    <div class="bubble-menu-table" tiptapBubbleMenu
      [editor]="editor()"
      [shouldShow]="shouldShowTable"
      [pluginKey]="'tableBubbleMenu'"
      [getReferencedVirtualElement]="getReferencedVirtualElement"
      [options]="{ flip: true, placement: 'top', onShow }"
    >
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
        
        <div class="ex-toolbar-divider"></div>
        
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
        
        <div class="ex-toolbar-divider"></div>

        <editor-dropdown icon="table-merge-cell" title="Mesclar células" [updateIcon]="false">   
          <editor-button icon="merge-cells-horizontal" title="Mesclar células" (onClick)="mergeCells()">
              Mesclar células
          </editor-button>
          <editor-button icon="split-cells-horizontal" title="Dividir célula" (onClick)="splitCell()">
              Dividir células
          </editor-button>
        </editor-dropdown>
        
        <div class="ex-toolbar-divider"></div>

        <editor-button [icon]="!tableBorder() ? 'square-rounded-slash' : 'square-rounded'" [title]="!tableBorder() ? 'Remover bordas' : 'Adicionar bordas'" (onClick)="toggleBorders()"></editor-button>
        
        <div class="ex-toolbar-divider"></div>

        <editor-button icon="delete-bin" title="Remover tabela" (onClick)="deleteTable()"></editor-button>
      </div>
    </div>
  `,
    styles: `
        .bubble-menu-table { 
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
          gap: 0.25rem;
        }

        .ex-toolbar-divider {
          height: 24px;
          width: 1px;
          background-color: #e6decc;
          margin: 0 0.125rem;
        }
    `
})
export class TableFloatingMenuComponent implements OnInit, OnDestroy {
    editor = input.required<Editor>();

    tableBorder = signal<boolean>(true);

    private floatingMenuService = inject(FloatingMenuService);

    ngOnInit() {
        this.floatingMenuService.registerMenu('table');
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
        const attrs = this.editor().getAttributes('table');
        if (Object.keys(attrs).length > 0) {
            this.tableBorder.set(attrs['noBorders']);
        }
    }

    shouldShowTable = ({ editor }: { editor: Editor }) => {
        if (!editor.isFocused) {
            return false;
        }
        return this.floatingMenuService.isMostSpecificNodeActive(editor, 'table');
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
