import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { tableEditing } from '@tiptap/pm/tables';
import { columnResizing } from './custom-column-resizing';

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
    }),
    TableRow,
    TableHeader,
    TableCell,
];
