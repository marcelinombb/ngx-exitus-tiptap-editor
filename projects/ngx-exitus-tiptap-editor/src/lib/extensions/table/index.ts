import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { tableEditing, TableMap } from '@tiptap/pm/tables';
import { columnResizing } from './custom-column-resizing';
import { TableView } from './TableView';
import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorView, NodeView } from '@tiptap/pm/view';

/**
 * Creates a colgroup with percentage-based widths for HTML export.
 * This replaces the upstream createColGroup which uses pixel widths.
 */
function createPercentageColGroup(
  node: ProsemirrorNode,
): { colgroup: DOMOutputSpec; tableWidth: string } {
  const cols: DOMOutputSpec[] = [];
  const row = node.firstChild;

  if (!row) {
    return { colgroup: ['colgroup', {}], tableWidth: '' };
  }

  const tableMap = TableMap.get(node);
  const colCount = tableMap.width;

  // Collect raw widths from colwidth attributes
  const rawWidths: (number | undefined)[] = [];
  for (let i = 0, col = 0; i < row.childCount; i++) {
    const { colspan, colwidth } = row.child(i).attrs;
    for (let j = 0; j < colspan; j++, col++) {
      rawWidths.push(colwidth && colwidth[j] != null ? colwidth[j] : undefined);
    }
  }

  // Normalize widths to percentages that sum to 100%
  const sum = rawWidths.reduce((acc, w) => acc! + (w || 0), 0) || 0;
  const allUndefined = rawWidths.every(w => w == null);

  let normalizedWidths: number[];
  if (allUndefined) {
    normalizedWidths = rawWidths.map(() => 100 / colCount);
  } else if (sum > 0) {
    // Assign equal shares to undefined columns, then scale everything to sum to 100%.
    // Works for both legacy pixel values and percentage values.
    const equalShare = 100 / colCount;
    const rawWithDefaults = rawWidths.map(w => w ?? equalShare);
    const totalWithDefaults = rawWithDefaults.reduce((a, b) => a + b, 0);
    normalizedWidths = rawWithDefaults.map(w => (w / totalWithDefaults) * 100);
  } else {
    normalizedWidths = rawWidths.map(() => 100 / colCount);
  }

  // NaN guard
  normalizedWidths = normalizedWidths.map(w =>
    Number.isFinite(w) ? w : 100 / colCount,
  );

  for (const w of normalizedWidths) {
    cols.push(['col', { style: `width: ${w.toFixed(2)}%` }]);
  }

  // The table width comes from the node's width attribute (already a percentage string)
  const tableWidth = node.attrs['width'] || '';

  return {
    colgroup: ['colgroup', {}, ...cols],
    tableWidth,
  };
}

/**
 * Parse colwidth attribute supporting both integer pixels and decimal percentages.
 */
function parseColwidth(element: HTMLElement): number[] | null {
  const colwidth = element.getAttribute('colwidth');
  if (colwidth) {
    const value = colwidth.split(',').map(w => parseFloat(w));
    if (value.every(v => Number.isFinite(v))) {
      return value;
    }
  }

  // Fallback: try to get from colgroup
  const cols = element.closest('table')?.querySelectorAll('colgroup > col');
  const cellIndex = Array.from(element.parentElement?.children || []).indexOf(element);

  if (cellIndex > -1 && cols && cols[cellIndex]) {
    const style = (cols[cellIndex] as HTMLElement).style.width;
    if (style && style.endsWith('%')) {
      return [parseFloat(style)];
    }
    const widthAttr = cols[cellIndex].getAttribute('width');
    if (widthAttr) {
      return [parseFloat(widthAttr)];
    }
  }

  return null;
}

/**
 * Render colwidth attribute with clean rounded values for data preservation.
 * Width styling is handled exclusively by <colgroup>/<col> elements to avoid
 * conflicts during interactive column resizing.
 */
function renderCellHTML(
  tag: 'td' | 'th',
  options: { HTMLAttributes: Record<string, unknown> },
  HTMLAttributes: Record<string, unknown>,
): DOMOutputSpec {
  const { colwidth, ...restAttrs } = HTMLAttributes;
  const attrs: Record<string, unknown> = { ...restAttrs };

  if (colwidth && Array.isArray(colwidth)) {
    // Preserve colwidth with clean rounded values for re-parsing
    attrs['colwidth'] = colwidth.map((w: number) => (w ? w.toFixed(2) : '0')).join(',');
  }

  return [tag, mergeAttributes(options.HTMLAttributes, attrs), 0];
}

export function fixTableEmptyParagraphs(html: string): string {
  const root = document.createElement('div');

  root.innerHTML = html;

  root.querySelectorAll('td p').forEach((p) => {
    const isEmpty =
      !p.textContent?.trim() &&
      !Array.from(p.children).some(
        (el) => el.tagName === 'BR' && !el.classList.contains('ProseMirror-trailingBreak'),
      );

    if (isEmpty) {
      p.querySelectorAll('br.ProseMirror-trailingBreak').forEach((br) => br.remove());
      p.appendChild(document.createElement('br'));
    }
  });

  root.querySelectorAll('th p').forEach((p) => {
    const isEmpty =
      !p.textContent?.trim() &&
      !Array.from(p.children).some(
        (el) => el.tagName === 'BR' && !el.classList.contains('ProseMirror-trailingBreak'),
      );

    if (isEmpty) {
      p.querySelectorAll('br.ProseMirror-trailingBreak').forEach((br) => br.remove());
      p.appendChild(document.createElement('br'));
    }
  });

  return root.innerHTML;
}

export interface TableOptions {
  /**
   * HTML attributes for the table element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, unknown>;

  /**
   * Enables the resizing of tables.
   * @default false
   * @example true
   */
  resizable: boolean;

  /**
   * Controls whether the table should be wrapped in a div with class "tableWrapper" when rendered.
   * In editable mode with resizable tables, this wrapper is always present via TableView.
   * @default false
   * @example true
   */
  renderWrapper: boolean;

  /**
   * The width of the resize handle.
   * @default 5
   * @example 10
   */
  handleWidth: number;

  /**
   * The minimum width of a cell.
   * @default 25
   * @example 50
   */
  cellMinWidth: number;

  /**
   * The node view to render the table.
   * @default TableView
   */
  View:
  | (new (
    node: ProsemirrorNode,
    cellMinWidth: number,
    view: EditorView,
    getPos: () => number | undefined,
  ) => NodeView)
  | null;

  /**
   * Enables the resizing of the last column.
   * @default true
   * @example false
   */
  lastColumnResizable: boolean;

  /**
   * Allow table node selection.
   * @default false
   * @example true
   */
  allowTableNodeSelection: boolean;
}

export const TableExtensions = [
  Table.extend<TableOptions>({
    // @ts-expect-error - Our TableView constructor takes an extra editor param
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
      };
    },
    onCreate({ editor }) {
      const originalGetHTML = editor.getHTML.bind(editor);
      editor.getHTML = () => fixTableEmptyParagraphs(originalGetHTML());
    },
    addAttributes() {
      return {
        noOuterBorder: {
          default: false,
          parseHTML: (element) => element.hasAttribute('data-no-outer-border'),
          renderHTML: (attributes) => {
            return attributes['noOuterBorder'] ? { 'data-no-outer-border': '' } : {};
          },
        },
        noVerticalBorder: {
          default: false,
          parseHTML: (element) => element.hasAttribute('data-no-vertical-border'),
          renderHTML: (attributes) => {
            return attributes['noVerticalBorder'] ? { 'data-no-vertical-border': '' } : {};
          },
        },
        noBorders: {
          default: false,
          parseHTML: (element) => element.hasAttribute('data-no-borders'),
          renderHTML: (attributes) => {
            return attributes['noBorders'] ? { 'data-no-borders': '' } : {};
          },
        },
        width: {
          default: null,
          parseHTML: (element) => element.style.width || null,
          renderHTML: (attributes) => {
            if (!attributes['width']) return {};
            return { style: `width: ${attributes['width']}` };
          },
        },
      };
    },
    addProseMirrorPlugins() {
      const isResizable = this.options.resizable && this.editor.isEditable;

      return [
        ...(isResizable
          ? [
            columnResizing(
              {
                handleWidth: this.options.handleWidth,
                cellMinWidth: this.options.cellMinWidth,
                defaultCellMinWidth: this.options.cellMinWidth,
                View: this.options.View,
                lastColumnResizable: this.options.lastColumnResizable,
              },
              this.editor,
            ),
          ]
          : []),
        tableEditing({
          allowTableNodeSelection: this.options.allowTableNodeSelection,
        }),
      ];
    },

    renderHTML({ node, HTMLAttributes }) {
      const { colgroup, tableWidth } = createPercentageColGroup(node);
      const options = this.options as unknown as TableOptions;

      const userStyles = HTMLAttributes['style'] as string | undefined;

      function getTableStyle() {
        let style = '';
        
        if (userStyles) {
          // Remove width from userStyles
          style = userStyles.replace(/width:\s*[^;]*;?/gi, tableWidth ? ` width: 100%;` : '').trim();
          style += ` table-layout: ${tableWidth ? 'fixed' : 'auto'};`; 
        }

        return style;
      }
      
      const table: DOMOutputSpec = [
        'table',
        mergeAttributes(options.HTMLAttributes, HTMLAttributes, {
          style: getTableStyle(),
        }
      ),
        colgroup,
        ['tbody', 0],
      ];

      return options.renderWrapper ? ['div', { class: 'tableWrapper', style: tableWidth ? `width: ${tableWidth}` : '' }, table] : table;
    },
  }).configure({
    resizable: true,
    cellMinWidth: 32,
    renderWrapper: true,
  }),
  TableRow,
  TableHeader.extend({
    addAttributes() {
      return {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: {
          default: null,
          parseHTML: (element: HTMLElement) => parseColwidth(element),
        },
      };
    },
    renderHTML({ HTMLAttributes }) {
      return renderCellHTML('th', this.options, HTMLAttributes);
    },
  }),
  TableCell.extend({
    addAttributes() {
      return {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: {
          default: null,
          parseHTML: (element: HTMLElement) => parseColwidth(element),
        },
      };
    },
    renderHTML({ HTMLAttributes }) {
      return renderCellHTML('td', this.options, HTMLAttributes);
    },
  }),
];
