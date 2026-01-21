import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { tableEditing } from '@tiptap/pm/tables';
import { columnResizing } from './custom-column-resizing';
import { TableView } from './TableView';

export function fixTableEmptyParagraphs(html: string): string {
  const root = document.createElement('div')
  root.innerHTML = html

  root.querySelectorAll('td p').forEach(p => {
    const isEmpty =
      !p.textContent?.trim() &&
      !Array.from(p.children).some(
        el =>
          el.tagName === 'BR' &&
          !el.classList.contains('ProseMirror-trailingBreak'),
      )

    if (isEmpty) {
      p.querySelectorAll('br.ProseMirror-trailingBreak').forEach(br =>
        br.remove(),
      )
      p.appendChild(document.createElement('br'))
    }
  })

  return root.innerHTML
}

export const TableExtensions = [
    Table.extend({    
        addProseMirrorPlugins() {
            const isResizable = this.options.resizable && this.editor.isEditable;

            return [
                ...(isResizable
                    ? [
                        columnResizing({
                            handleWidth: this.options.handleWidth,
                            cellMinWidth: this.options.cellMinWidth,
                            defaultCellMinWidth: this.options.cellMinWidth,                           
                            View: this.options.View,
                            lastColumnResizable: this.options.lastColumnResizable,
                        }),
                    ]
                    : []),
                tableEditing({
                    allowTableNodeSelection: this.options.allowTableNodeSelection,
                }),
            ];
        },
    }).configure({
        resizable: true,
        cellMinWidth: 32,
        renderWrapper: true,
        View: TableView,
    }).extend({
        addAttributes() {
            return {
                noOuterBorder: {
                    default: false,
                    parseHTML: element => element.hasAttribute('data-no-outer-border'),
                    renderHTML: attributes => {
                        return attributes['noOuterBorder'] ? { 'data-no-outer-border': '' } : {}
                    },
                },
                noVerticalBorder: {
                    default: false,
                    parseHTML: element => element.hasAttribute('data-no-vertical-border'),
                    renderHTML: attributes => {
                        return attributes['noVerticalBorder'] ? { 'data-no-vertical-border': '' } : {}
                    },
                },
            }
        },
    }),
    TableRow,
    TableHeader,
    TableCell,
];
