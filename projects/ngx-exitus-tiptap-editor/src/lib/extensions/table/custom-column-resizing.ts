/**
 * # Custom Column Resizing Plugin (Percentage-Based)
 *
 * This is a **heavily modified** version of the ProseMirror `prosemirror-tables`
 * column resizing plugin. The key difference is that all column widths are stored
 * and manipulated as **percentages** (0–100) instead of pixels.
 *
 * ## Architecture Overview
 *
 * The resize system has two distinct modes based on which column border is dragged:
 *
 * ### 1. Inner Column Resize (any column except the last)
 * - **Zero-sum**: dragging the border between col A and col B transfers width
 *   from one to the other. The table wrapper width does NOT change.
 * - Only the two adjacent columns (dragged + neighbor) are modified.
 * - All column widths are normalized to sum to 100%.
 *
 * ### 2. Last Column Resize (right border of the last column)
 * - **Table-expanding**: the wrapper width grows/shrinks (as a % of the container).
 * - Non-last columns preserve their **pixel width** (their % shrinks proportionally).
 * - The last column absorbs whatever percentage remains (100% - others).
 * - This mimics CKEditor behavior: dragging the table edge resizes the table, not columns.
 *
 * ## Data Flow
 *
 * ```
 * mousedown → captures start state (Dragging snapshot)
 *     │
 *     ├─ mousemove → draggedWidthWithLimit() → displayColumnWidth()
 *     │              (compute new values)       (DOM-only preview, no ProseMirror tx)
 *     │
 *     └─ mouseup → draggedWidthWithLimit() → updateColumnWidth()
 *                   (compute final values)    (ProseMirror transaction, persists to doc)
 * ```
 *
 * ## Legacy Pixel Migration
 *
 * Old documents may have `colwidth` values in pixels (e.g., [200, 300, 150]).
 * The system detects this when the total sum > 101 and automatically converts
 * to percentages during reads (see `currentColWidth` and `readColPct`).
 *
 * ## Key Files
 *
 * - `TableView.ts` — NodeView that renders the table DOM, contains `updateColumns()`
 *   which applies `<col>` styles and wrapper/table CSS.
 * - `index.ts` — Extension definition, `renderHTML`/`parseHTML` for export/import.
 *
 * @module custom-column-resizing
 */

import { Attrs, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorState, Transaction, Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView, NodeView, Decoration, DecorationSet } from '@tiptap/pm/view';
import { TableMap, TableView, cellAround, pointsAtCell, tableNodeTypes } from '@tiptap/pm/tables';
import { updateColumns } from './TableView';
import { Editor } from '@tiptap/core';

/** Plugin key used to store and retrieve the {@link ResizeState} from EditorState. */
export const columnResizingPluginKey = new PluginKey<ResizeState>('tableColumnResizing');

/** Configuration options for the column resizing plugin. */
export interface ColumnResizingOptions {
  /** Width in pixels of the invisible drag handle zone at column borders. Default: 5 */
  handleWidth?: number;
  /** Minimum column width in pixels. Prevents columns from becoming too narrow. Default: 25 */
  cellMinWidth?: number;
  /** Default minimum width for cells when no explicit width is set. Default: 100 */
  defaultCellMinWidth?: number;
  /** Whether the right border of the last column can be dragged (resizes the table). Default: true */
  lastColumnResizable?: boolean;
  /** Custom NodeView class for rendering tables. Receives an extra `editor` param. */
  View?:
  | (new (
    node: ProsemirrorNode,
    cellMinWidth: number,
    view: EditorView,
    getPos: () => number | undefined,
    editor: Editor,
  ) => NodeView)
  | null;
}

/**
 * Snapshot of the state at the moment the user starts dragging a column border.
 * Captured on `mousedown` and used throughout the drag to compute deltas.
 */
export interface Dragging {
  /** Mouse X position when the drag started. */
  startX: number;
  /** Percentage width of the dragged column at drag start. */
  startWidth: number;
  /** Table width in pixels at drag start (from getBoundingClientRect). */
  startTableWidth: number;
  /** Same as startTableWidth — kept for backward compat. Used in ratio calculations. */
  startTableTableWidth?: number;
  /** Percentage width of the right-neighbor column at drag start (inner resize only). */
  startWidthNeighbor?: number;
  /** ProseMirror position of the right-neighbor cell (inner resize only). */
  nextCellPos?: number;
}

/**
 * Creates the ProseMirror plugin that handles column resizing.
 *
 * The plugin:
 * - Registers a custom NodeView for table nodes.
 * - Tracks hover state (active handle) via `handleDOMEvents`.
 * - Captures drag state on `mousedown` and computes new widths on `mousemove`/`mouseup`.
 * - Renders resize-handle decorations on the active column border.
 */
export function columnResizing(
  {
    handleWidth = 5,
    cellMinWidth = 25,
    defaultCellMinWidth = 100,
    View = TableView,
    lastColumnResizable = true,
  }: ColumnResizingOptions = {},
  editor: Editor,
): Plugin {
  const plugin = new Plugin<ResizeState>({
    key: columnResizingPluginKey,
    state: {
      init(_, state) {
        const nodeViews = plugin.spec?.props?.nodeViews;
        const tableName = tableNodeTypes(state.schema).table.name;
        if (View && nodeViews) {
          nodeViews[tableName] = (node, view, getPos) => {
            return new View(node, defaultCellMinWidth, view, getPos, editor);
          };
        }
        return new ResizeState(-1, false);
      },
      apply(tr, prev) {
        return prev.apply(tr);
      },
    },
    props: {
      attributes: (state): Record<string, string> => {
        const pluginState = columnResizingPluginKey.getState(state);
        return pluginState && pluginState.activeHandle > -1 ? { class: 'resize-cursor' } : {};
      },

      handleDOMEvents: {
        mousemove: (view, event) => {
          handleMouseMove(view, event, handleWidth, lastColumnResizable);
        },
        mouseleave: (view) => {
          handleMouseLeave(view);
        },
        mousedown: (view, event) => {
          handleMouseDown(view, event, cellMinWidth, defaultCellMinWidth);
        },
      },

      decorations: (state) => {
        const pluginState = columnResizingPluginKey.getState(state);
        if (pluginState && pluginState.activeHandle > -1) {
          return handleDecorations(state, pluginState.activeHandle);
        }
        return DecorationSet.empty;
      },

      nodeViews: {},
    },
  });
  return plugin;
}

/**
 * Plugin state that tracks which column border is hovered (activeHandle)
 * and the current drag session (dragging).
 *
 * Immutable — each update returns a new instance.
 */
export class ResizeState {
  constructor(
    public activeHandle: number,
    public dragging: Dragging | false,
    public lastResizeWasLastColumn = false,
  ) { }

  /** Reduce function: applies metadata actions from transactions to produce new state. */
  apply(tr: Transaction): ResizeState {
    const action = tr.getMeta(columnResizingPluginKey);
    if (action && action.setHandle != null)
      return new ResizeState(action.setHandle, false, this.lastResizeWasLastColumn);
    if (action && action.setDragging !== undefined)
      return new ResizeState(this.activeHandle, action.setDragging, this.lastResizeWasLastColumn);
    if (action && action.isLastColumn !== undefined)
      return new ResizeState(this.activeHandle, this.dragging, action.isLastColumn);
    if (this.activeHandle > -1 && tr.docChanged) {
      let handle = tr.mapping.map(this.activeHandle, -1);
      if (!pointsAtCell(tr.doc.resolve(handle))) {
        handle = -1;
      }
      return new ResizeState(handle, this.dragging, this.lastResizeWasLastColumn);
    }
    return this;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Mouse Event Handlers
// These detect hover over column borders and initiate/track drag sessions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects when the mouse hovers near a column border and updates the active handle.
 * Does nothing while a drag is in progress.
 */
function handleMouseMove(
  view: EditorView,
  event: MouseEvent,
  handleWidth: number,
  lastColumnResizable: boolean,
): void {
  if (!view.editable) return;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (!pluginState) return;

  if (!pluginState.dragging) {
    const target = domCellAround(event.target as HTMLElement);
    let cell = -1;
    if (target) {
      const { left, right } = target.getBoundingClientRect();
      if (event.clientX - left <= handleWidth) cell = edgeCell(view, event, 'left', handleWidth);
      else if (right - event.clientX <= handleWidth)
        cell = edgeCell(view, event, 'right', handleWidth);


    }

    if (cell != pluginState.activeHandle) {
      if (!lastColumnResizable && cell !== -1) {
        const $cell = view.state.doc.resolve(cell);
        const table = $cell.node(-1);
        const map = TableMap.get(table);
        const tableStart = $cell.start(-1);
        const col = map.colCount($cell.pos - tableStart) + $cell.nodeAfter!.attrs['colspan'] - 1;

        if (col == map.width - 1) {
          return;
        }
      }

      updateHandle(view, cell);
    }
  }
}

/** Clears the active handle when the mouse leaves the editor. */
function handleMouseLeave(view: EditorView): void {
  if (!view.editable) return;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging) updateHandle(view, -1);
}

/**
 * Initiates a column resize drag session.
 *
 * On mousedown over an active handle:
 * 1. Snapshots the current state into a {@link Dragging} object.
 * 2. Registers global `mousemove` (live preview) and `mouseup` (persist) handlers.
 *
 * The `finish()` closure persists the final widths via `updateColumnWidth()`.
 * The `move()` closure provides live DOM feedback via `displayColumnWidth()`.
 */
function handleMouseDown(
  view: EditorView,
  event: MouseEvent,
  cellMinWidth: number,
  defaultCellMinWidth: number,
): boolean {
  if (!view.editable) return false;

  const win = view.dom.ownerDocument.defaultView ?? window;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (!pluginState || pluginState.activeHandle == -1 || pluginState.dragging) return false;

  const cell = view.state.doc.nodeAt(pluginState.activeHandle)!;
  const width = currentColWidth(view, pluginState.activeHandle, cell.attrs);
  const $cell = view.state.doc.resolve(pluginState.activeHandle);
  const start = $cell.start(-1);
  let dom: Node | null = view.domAtPos(start).node;
  while (dom && dom.nodeName != 'TABLE') dom = dom.parentNode;
  const table = dom as HTMLTableElement;
  const tableWidth = table ? table.getBoundingClientRect().width : 0;

  const map = TableMap.get($cell.node(-1));
  const tableStart = $cell.start(-1);
  const col = map.colCount($cell.pos - tableStart) + $cell.nodeAfter!.attrs['colspan'] - 1;

  let startWidthNeighbor = undefined;
  let nextCellPos = undefined;

  if (col < map.width - 1) {
    // Find next cell in the same row
    const nextCellIndex =
      map.map.indexOf($cell.pos - tableStart) + $cell.nodeAfter!.attrs['colspan'];
    if (nextCellIndex % map.width !== 0) {
      // Not the end of the row
      nextCellPos = tableStart + map.map[nextCellIndex];
      const nextCell = view.state.doc.nodeAt(nextCellPos)!;
      startWidthNeighbor = currentColWidth(view, nextCellPos, nextCell.attrs);
    }
  }

  view.dispatch(
    view.state.tr.setMeta(columnResizingPluginKey, {
      setDragging: {
        startX: event.clientX,
        startWidth: width,
        startTableWidth: tableWidth,
        startTableTableWidth: table.getBoundingClientRect().width,
        startWidthNeighbor,
        nextCellPos,
      },
    }),
  );

  function finish(event: MouseEvent) {
    win.removeEventListener('mouseup', finish);
    win.removeEventListener('mousemove', move);
    const pluginState = columnResizingPluginKey.getState(view.state);
    if (pluginState?.dragging) {
      const { width, widthNeighbor, tableWidthPct, startTablePixelWidth } = draggedWidthWithLimit(
        view,
        pluginState.activeHandle,
        pluginState.dragging,
        event,
        cellMinWidth,
      );
      updateColumnWidth(
        view,
        pluginState.activeHandle,
        width,
        (pluginState.dragging as Dragging).nextCellPos,
        widthNeighbor,
        tableWidthPct,
        startTablePixelWidth,
      );
      view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setDragging: null }));
    }
  }

  function move(event: MouseEvent): void {
    if (!event.which) return finish(event);
    const pluginState = columnResizingPluginKey.getState(view.state);
    if (!pluginState) return;
    if (pluginState.dragging) {
      const { width, widthNeighbor, tableWidthPct, startTablePixelWidth } = draggedWidthWithLimit(
        view,
        pluginState.activeHandle,
        pluginState.dragging,
        event,
        cellMinWidth,
      );
      displayColumnWidth(
        view,
        pluginState.activeHandle,
        width,
        defaultCellMinWidth,
        (pluginState.dragging as Dragging).nextCellPos,
        widthNeighbor,
        tableWidthPct,
        startTablePixelWidth,
      );
    }
  }

  displayColumnWidth(view, pluginState.activeHandle, width, defaultCellMinWidth);

  win.addEventListener('mouseup', finish);
  win.addEventListener('mousemove', move);
  event.preventDefault();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Width Calculation Utilities
// Read current column widths and compute new values during drag.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the current width of a column as a percentage (0–100).
 *
 * **Legacy migration**: If the sum of all `colwidth` values in the first row
 * exceeds 101, the values are treated as pixels and converted to percentages.
 * This handles documents saved before the percentage migration.
 *
 * @param view - The editor view.
 * @param cellPos - ProseMirror position of the cell.
 * @param attrs - Cell attrs containing `colspan` and `colwidth`.
 * @returns The column width as a percentage of the table.
 */
function currentColWidth(view: EditorView, cellPos: number, { colspan, colwidth }: Attrs): number {
  const dom = view.domAtPos(cellPos);
  const node = dom.node.childNodes[dom.offset] as HTMLElement;
  const tableElement = node.closest('table');
  const tableWidth = tableElement ? tableElement.getBoundingClientRect().width : 1;

  if (colwidth) {
    const width = colwidth[colwidth.length - 1];
    // If width is clearly a pixel value (> 100), or if all columns sum to > 101, normalize.
    const $cell = view.state.doc.resolve(cellPos);
    const tableNode = $cell.node(-1);
    const firstRow = tableNode.firstChild;
    if (firstRow) {
      let totalRawWidth = 0;
      firstRow.forEach((cell) => {
        const cw = cell.attrs['colwidth'];
        if (cw) {
          cw.forEach((w: number) => (totalRawWidth += w || 0));
        }
      });

      if (totalRawWidth > 101) {
        return (width / totalRawWidth) * 100;
      }
    }
    return width;
  }

  const pixelWidth = node.offsetWidth / colspan;
  return (pixelWidth / tableWidth) * 100;
}

/** Walks up the DOM from a target element to find the enclosing `<td>` or `<th>`. */
function domCellAround(target: HTMLElement | null): HTMLElement | null {
  while (target && target.nodeName != 'TD' && target.nodeName != 'TH')
    target =
      target.classList && target.classList.contains('ProseMirror')
        ? null
        : (target.parentNode as HTMLElement);
  return target;
}

/**
 * Finds the ProseMirror cell position at a column border edge.
 * Used to determine which column handle the cursor is hovering over.
 *
 * @param side - 'left' means the left edge of the cell (= right edge of the previous column).
 *               'right' means the right edge of the cell (= the column's own resize handle).
 */
function edgeCell(
  view: EditorView,
  event: MouseEvent,
  side: 'left' | 'right',
  handleWidth: number,
): number {
  const offset = side == 'right' ? -handleWidth : handleWidth;
  const found = view.posAtCoords({
    left: event.clientX + offset,
    top: event.clientY,
  });
  if (!found) return -1;
  const { pos } = found;
  const $cell = cellAround(view.state.doc.resolve(pos));
  if (!$cell) return -1;
  if (side == 'right') return $cell.pos;
  const map = TableMap.get($cell.node(-1)),
    start = $cell.start(-1);
  const index = map.map.indexOf($cell.pos - start);
  return index % map.width == 0 ? -1 : start + map.map[index - 1];
}

/**
 * Computes the new column width(s) based on mouse offset from drag start.
 *
 * This is the **core calculation** called on every `mousemove` and on `mouseup`.
 * It returns different shapes depending on which column is being dragged:
 *
 * **Last column** → returns `tableWidthPct` (new wrapper width) + `startTablePixelWidth`
 *   (original table pixel width for ratio calculation). Column widths stay unchanged
 *   here; the scaling happens in `displayColumnWidth`/`updateColumnWidth`.
 *
 * **Inner column** → returns `width` and `widthNeighbor` (zero-sum swap between the
 *   two adjacent columns). The table wrapper width does not change.
 *
 * @returns An object with the computed values. Optional fields are undefined when not applicable.
 */
function draggedWidthWithLimit(
  view: EditorView,
  cellPos: number,
  dragging: Dragging,
  event: MouseEvent,
  resizeMinWidth: number,
): { width: number; widthNeighbor?: number; tableWidthPct?: number; startTablePixelWidth?: number } {
  const offset = event.clientX - dragging.startX;

  const tablePixelWidth = dragging.startTableTableWidth || 1;
  const $cell = view.state.doc.resolve(cellPos);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
  const isLastColumn = col === map.width - 1;

  let dom: Node | null = view.domAtPos(start).node;
  while (dom && dom.nodeName != 'TABLE') dom = dom.parentNode;
  const tableElement = dom as HTMLElement;
  const container = tableElement?.closest('.editor-main') || tableElement?.parentElement;
  const containerWidth = container ? container.getBoundingClientRect().width : tablePixelWidth;

  if (isLastColumn) {
    // Resize wrapper + last column only
    const newTablePixelWidth = Math.max(resizeMinWidth * map.width, tablePixelWidth + offset);
    const tableWidthPct = (newTablePixelWidth / containerWidth) * 100;
    return {
      width: dragging.startWidth,
      tableWidthPct: Math.min(100, tableWidthPct),
      startTablePixelWidth: tablePixelWidth,
    };
  } else if (dragging.startWidthNeighbor !== undefined) {
    // Inner column resize: zero-sum within the 100%
    const minWidthPct = (resizeMinWidth / tablePixelWidth) * 100;
    const minOffsetPct = minWidthPct - dragging.startWidth;
    const maxOffsetPct = dragging.startWidthNeighbor - minWidthPct;

    const offsetPct = (offset / tablePixelWidth) * 100;
    const finalOffsetPct = Math.max(minOffsetPct, Math.min(maxOffsetPct, offsetPct));

    return {
      width: dragging.startWidth + finalOffsetPct,
      widthNeighbor: dragging.startWidthNeighbor - finalOffsetPct,
    };
  }

  return { width: dragging.startWidth };
}

/** Dispatches a transaction to update the active handle position in plugin state. */
function updateHandle(view: EditorView, value: number): void {
  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setHandle: value }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Width Persistence (ProseMirror transactions)
// Called on mouseup to save the final column widths into the document.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the final column widths to the ProseMirror document. Called on `mouseup`.
 *
 * This function:
 * 1. Sets the table node's `width` attribute (wrapper percentage).
 * 2. Computes new `colwidth` arrays for every cell in the table.
 * 3. Dispatches a single transaction with all the `setNodeMarkup` calls.
 *
 * **Auto-to-fixed transition**: If the table has no `width` attribute yet
 * (first resize), it calculates the current rendered width as a percentage
 * of the container and locks it in.
 *
 * **Last column mode**: Non-last columns are scaled by `oldPx/newPx` to preserve
 * their pixel width. The last column gets `100% - sum(others)`.
 *
 * **Inner column mode**: Only the dragged column and its neighbor change.
 * All widths are normalized to sum to 100%.
 *
 * @param view - The editor view.
 * @param cell - ProseMirror position of the cell being resized.
 * @param width - New percentage width for the dragged column.
 * @param neighborCell - Position of the right-neighbor cell (inner resize only).
 * @param neighborWidth - New percentage width for the neighbor (inner resize only).
 * @param tableWidthPct - New wrapper width as % of container (last column resize only).
 * @param startTablePixelWidth - Table pixel width at drag start (last column resize only).
 */
function updateColumnWidth(
  view: EditorView,
  cell: number,
  width: number,
  neighborCell?: number,
  neighborWidth?: number,
  tableWidthPct?: number,
  startTablePixelWidth?: number,
): void {
  // ── Step 1: Resolve table position and determine column index ──
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1),
    map = TableMap.get(table),
    start = $cell.start(-1);
  const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
  const tr = view.state.tr;

  // ── Step 2: Set the table's wrapper width attribute ──
  let finalTableWidthPct = tableWidthPct;

  // Auto-to-fixed transition: first resize on a table that has no width yet.
  // We capture its current rendered width as a percentage of the container.
  if (finalTableWidthPct === undefined && !table.attrs['width']) {
    let dom: Node | null = view.domAtPos(start).node;
    while (dom && dom.nodeName != 'TABLE') dom = dom.parentNode;
    const tableElement = dom as HTMLElement;
    const container = tableElement?.closest('.editor-main') || tableElement?.parentElement;
    if (container) {
      const tableRect = tableElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      finalTableWidthPct = (tableRect.width / containerRect.width) * 100;
    }
  }

  // Find the table node position by walking up the resolved cell's ancestors.
  // We can't use $cell.before(-1) directly because of how ProseMirror nests table roles.
  if (finalTableWidthPct !== undefined) {
    let tablePos = -1;
    for (let d = $cell.depth; d >= 0; d--) {
      if ($cell.node(d).type.spec['tableRole'] === 'table') {
        tablePos = $cell.before(d);
        break;
      }
    }

    if (tablePos > -1) {
      tr.setNodeMarkup(tablePos, undefined, {
        ...table.attrs,
        width: `${finalTableWidthPct.toFixed(2)}%`,
      });
    }
  }

  // ── Step 3: Compute new percentage widths for ALL columns ──
  const allWidths: Record<number, number> = {};
  const isLastColumn = col === map.width - 1;

  // Legacy detection: if the sum of raw colwidth values > 101, they're pixels.
  const firstRow = table.firstChild!;
  let totalRaw = 0;
  firstRow.forEach(c => {
    const cwc = c.attrs['colwidth'];
    if (cwc) cwc.forEach((v: number) => (totalRaw += v || 0));
  });
  const isLegacyPixels = totalRaw > 101;

  /**
   * Reads the current stored percentage for a column index.
   * Handles legacy pixel→percentage conversion and missing values.
   */
  function readColPct(colIdx: number): number {
    const cellPos = map.map[colIdx];
    const cellNode = table.nodeAt(cellPos)!;
    const index = cellNode.attrs['colspan'] === 1 ? 0 : colIdx - map.colCount(cellPos);
    const cw = cellNode.attrs['colwidth'];
    let currentW = (cw && cw[index] != null) ? cw[index] : 100 / map.width;
    if (isLegacyPixels) {
      currentW = (currentW / totalRaw) * 100;
    }
    return currentW;
  }

  if (isLastColumn && finalTableWidthPct !== undefined && startTablePixelWidth) {
    // ── Last column mode ──
    // Non-last columns must keep their absolute (pixel) width constant.
    // Since percentages are relative to the table, and the table width changed,
    // we scale each column's percentage by (oldTablePx / newTablePx).
    // The last column gets whatever remains to reach 100%.
    let dom2: Node | null = view.domAtPos(start).node;
    while (dom2 && dom2.nodeName != 'TABLE') dom2 = dom2.parentNode;
    const tableElement2 = dom2 as HTMLElement;
    const container2 = tableElement2?.closest('.editor-main') || tableElement2?.parentElement;
    const containerWidth2 = container2 ? container2.getBoundingClientRect().width : startTablePixelWidth;
    const newTablePixelWidth = (finalTableWidthPct / 100) * containerWidth2;
    const scaleRatio = startTablePixelWidth / newTablePixelWidth;

    let sumOthers = 0;
    for (let i = 0; i < map.width; i++) {
      if (i === col) continue;
      const pct = readColPct(i);
      allWidths[i] = pct * scaleRatio;
      sumOthers += allWidths[i];
    }
    // Last column gets whatever remains
    allWidths[col] = Math.max(0.5, 100 - sumOthers);
  } else {
    // ── Inner column mode (or auto-to-fixed first resize) ──
    // Only the dragged column and its direct neighbor change.
    // All other columns keep their current percentage.
    let neighborCol = -1;
    if (neighborCell !== undefined) {
      const $neighbor = view.state.doc.resolve(neighborCell);
      neighborCol = map.colCount($neighbor.pos - start) + $neighbor.nodeAfter!.attrs['colspan'] - 1;
    }

    for (let i = 0; i < map.width; i++) {
      if (i === col) {
        allWidths[i] = width;
      } else if (neighborCol !== -1 && i === neighborCol) {
        allWidths[i] = neighborWidth!;
      } else {
        allWidths[i] = readColPct(i);
      }
    }

    // Normalize allWidths to sum to 100
    const currentSum = Object.values(allWidths).reduce((a, b) => a + b, 0) || 100;
    for (let i = 0; i < map.width; i++) {
      allWidths[i] = (allWidths[i] / currentSum) * 100;
    }
  }

  // ── Step 4: Write new colwidth arrays to every cell in the table ──
  // We iterate the full TableMap (all rows × all columns) and use a Set
  // to skip cells we've already processed (important for merged cells
  // that span multiple map positions).
  const seenPos = new Set<number>();
  for (let row = 0; row < map.height; row++) {
    for (let c = 0; c < map.width; c++) {
      const pos = map.map[row * map.width + c];
      if (seenPos.has(pos)) continue;
      seenPos.add(pos);

      const cellNode = table.nodeAt(pos)!;
      const attrs = cellNode.attrs;
      const colspan = attrs['colspan'] || 1;
      const colIndex = map.colCount(pos);

      const newColWidth = [];
      for (let i = 0; i < colspan; i++) {
        newColWidth.push(allWidths[colIndex + i]);
      }

      tr.setNodeMarkup(start + pos, undefined, {
        ...attrs,
        colwidth: newColWidth,
      });
    }
  }

  if (tr.docChanged) view.dispatch(tr);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Live DOM Preview (no ProseMirror transaction)
// Called on every mousemove to give instant visual feedback.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the DOM directly (no ProseMirror transaction) to show a live preview
 * of column widths while the user is dragging.
 *
 * This function computes override percentages and passes them to `updateColumns()`
 * which sets `<col>` element styles. For last-column resizes, it also overrides
 * the wrapper width and table layout styles.
 *
 * **Important**: This is called on every `mousemove` during a drag, so it must
 * be fast. It does NOT dispatch a ProseMirror transaction — that only happens
 * on `mouseup` via {@link updateColumnWidth}.
 *
 * **Ordering note**: The wrapper/table style overrides MUST happen AFTER
 * `updateColumns()`, because `updateColumns()` resets styles based on
 * `node.attrs['width']` which hasn't been persisted yet during drag.
 */
function displayColumnWidth(
  view: EditorView,
  cell: number,
  width: number,
  defaultCellMinWidth: number,
  neighborCell?: number,
  neighborWidth?: number,
  tableWidthPct?: number,
  startTablePixelWidth?: number,
): void {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1),
    start = $cell.start(-1);
  const map = TableMap.get(table);
  const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
  let dom: Node | null = view.domAtPos($cell.start(-1)).node;
  while (dom && dom.nodeName != 'TABLE') dom = dom.parentNode;
  if (!dom) return;

  const isLastColumn = col === map.width - 1;
  let overrides: Record<number, number> = { [col]: width };

  if (isLastColumn && tableWidthPct !== undefined && startTablePixelWidth) {
    // ── Last column mode (preview) ──
    // Same logic as updateColumnWidth: scale non-last columns by pixel ratio,
    // give the last column the remainder.
    const container = (dom as HTMLElement).closest('.editor-main')
      || (dom as HTMLElement).parentElement?.parentElement;
    const containerWidth = container ? container.getBoundingClientRect().width : startTablePixelWidth;
    const newTablePixelWidth = (tableWidthPct / 100) * containerWidth;
    const scaleRatio = startTablePixelWidth / newTablePixelWidth;

    overrides = {};
    let sumOthers = 0;
    for (let i = 0; i < map.width; i++) {
      if (i === col) continue;
      const cellPos = map.map[i];
      const cellNode = table.nodeAt(cellPos)!;
      const colIndex = cellNode.attrs['colspan'] === 1 ? 0 : i - map.colCount(cellPos);
      const cw = cellNode.attrs['colwidth'];
      const currentPct = (cw && cw[colIndex] != null) ? cw[colIndex] : 100 / map.width;
      const newPct = currentPct * scaleRatio;
      overrides[i] = newPct;
      sumOthers += newPct;
    }
    // Last column gets the remainder
    overrides[col] = Math.max(0.5, 100 - sumOthers);
  } else if (neighborCell !== undefined && neighborWidth !== undefined) {
    const $neighbor = view.state.doc.resolve(neighborCell);
    const neighborCol =
      map.colCount($neighbor.pos - start) + $neighbor.nodeAfter!.attrs['colspan'] - 1;
    overrides[neighborCol] = neighborWidth;
  }

  // Update <col> elements via updateColumns
  updateColumns(
    table,
    dom.firstChild as HTMLTableColElement,
    dom as HTMLTableElement,
    defaultCellMinWidth,
    overrides,
    isLastColumn,
  );

  // AFTER updateColumns: apply wrapper width for the live drag preview.
  // Must come after updateColumns because updateColumns resets styles
  // based on node.attrs['width'] which is still the pre-drag value.
  if (tableWidthPct !== undefined) {
    const wrapper = (dom as HTMLElement).parentElement;
    if (wrapper && wrapper.classList.contains('tableWrapper')) {
      wrapper.style.width = `${tableWidthPct.toFixed(2)}%`;
      wrapper.style.display = 'table';
    }
    (dom as HTMLTableElement).style.width = '100%';
    (dom as HTMLTableElement).style.tableLayout = 'fixed';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Decorations
// Visual indicators (resize handle bars) on the active column border.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates ProseMirror decorations for the column resize handle.
 *
 * Renders a vertical blue bar (`column-resize-handle` div) at the right edge
 * of every cell in the active column. Also adds a `column-resize-dragging`
 * class to cells during an active drag.
 */
export function handleDecorations(state: EditorState, cell: number): DecorationSet {
  const decorations = [];
  const $cell = state.doc.resolve(cell);
  const table = $cell.node(-1);
  if (!table) return DecorationSet.empty;
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
  for (let row = 0; row < map.height; row++) {
    const index = col + row * map.width;
    if (
      (col == map.width - 1 || map.map[index] != map.map[index + 1]) &&
      (row == 0 || map.map[index] != map.map[index - map.width])
    ) {
      const cellPos = map.map[index];
      const pos = start + cellPos + table.nodeAt(cellPos)!.nodeSize - 1;
      const dom = document.createElement('div');
      dom.className = 'column-resize-handle';
      if (columnResizingPluginKey.getState(state)?.dragging) {
        decorations.push(
          Decoration.node(start + cellPos, start + cellPos + table.nodeAt(cellPos)!.nodeSize, {
            class: 'column-resize-dragging',
          }),
        );
      }
      decorations.push(Decoration.widget(pos, dom));
    }
  }
  return DecorationSet.create(state.doc, decorations);
}
