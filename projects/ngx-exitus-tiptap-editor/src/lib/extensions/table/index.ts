import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { tableEditing } from '@tiptap/pm/tables';
import { columnResizing } from './custom-column-resizing';
import { TableView } from './TableView';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorView, NodeView } from '@tiptap/pm/view';
import { Editor } from '@tiptap/core';

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

    root.querySelectorAll('th p').forEach(p => {
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

export interface TableOptions {
  /**
   * HTML attributes for the table element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>

  /**
   * Enables the resizing of tables.
   * @default false
   * @example true
   */
  resizable: boolean

  /**
   * Controls whether the table should be wrapped in a div with class "tableWrapper" when rendered.
   * In editable mode with resizable tables, this wrapper is always present via TableView.
   * @default false
   * @example true
   */
  renderWrapper: boolean

  /**
   * The width of the resize handle.
   * @default 5
   * @example 10
   */
  handleWidth: number

  /**
   * The minimum width of a cell.
   * @default 25
   * @example 50
   */
  cellMinWidth: number

  /**
   * The node view to render the table.
   * @default TableView
   */
  View: (new (node: ProsemirrorNode, cellMinWidth: number, view: EditorView, getPos: () => number | undefined) => NodeView) | null

  /**
   * Enables the resizing of the last column.
   * @default true
   * @example false
   */
  lastColumnResizable: boolean

  /**
   * Allow table node selection.
   * @default false
   * @example true
   */
  allowTableNodeSelection: boolean
}

export const TableExtensions = [
    Table.extend<TableOptions>({
        // @ts-ignore
        addOptions() {
            return {
            HTMLAttributes: {},
            resizable: false,
            renderWrapper: false,
            handleWidth: 5,
            cellMinWidth: 25,
            // TODO: fix
            View: TableView,
            lastColumnResizable: true,
            allowTableNodeSelection: false,
            }
        },
        onCreate({ editor }) {
            const originalGetHTML = editor.getHTML.bind(editor)
            editor.getHTML = () => fixTableEmptyParagraphs(originalGetHTML())
        },
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
                noBorders: {
                    default: false,
                    parseHTML: element => element.hasAttribute('data-no-borders'),
                    renderHTML: attributes => {
                        return attributes['noBorders'] ? { 'data-no-borders': '' } : {}
                    },
                },
                width: {
                    default: null,
                    parseHTML: element => element.style.width || null,
                    renderHTML: attributes => {
                        if (!attributes['width']) return {}
                        return { style: `width: ${attributes['width']}` }
                    },
                },
            }
        },
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
                        }, this.editor),
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
        
    }),
    TableRow,
    TableHeader,
    TableCell,
];
