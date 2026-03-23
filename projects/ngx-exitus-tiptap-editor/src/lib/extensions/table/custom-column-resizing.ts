import { Attrs, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorState, Transaction, Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView, NodeView, Decoration, DecorationSet } from '@tiptap/pm/view';
import { TableMap, TableView, cellAround, pointsAtCell, tableNodeTypes } from '@tiptap/pm/tables';
import { updateColumns } from './TableView';
import { Editor } from '@tiptap/core';

export const columnResizingPluginKey = new PluginKey<ResizeState>('tableColumnResizing');

export interface ColumnResizingOptions {
  handleWidth?: number;
  cellMinWidth?: number;
  defaultCellMinWidth?: number;
  lastColumnResizable?: boolean;
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

export interface Dragging {
  startX: number;
  startWidth: number;
  startTableWidth: number;
  startTableTableWidth?: number;
  startWidthNeighbor?: number;
  nextCellPos?: number;
}

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

export class ResizeState {
  constructor(
    public activeHandle: number,
    public dragging: Dragging | false,
    public lastResizeWasLastColumn = false,
  ) { }

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

      console.log('handleMouseMove:', { cell, left, right, clientX: event.clientX });
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

function handleMouseLeave(view: EditorView): void {
  if (!view.editable) return;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging) updateHandle(view, -1);
}

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
      const { width, widthNeighbor, tableWidthPct } = draggedWidthWithLimit(
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
        (pluginState.dragging as any).nextCellPos,
        widthNeighbor,
        tableWidthPct,
      );
      view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setDragging: null }));
    }
  }

  function move(event: MouseEvent): void {
    if (!event.which) return finish(event);
    const pluginState = columnResizingPluginKey.getState(view.state);
    if (!pluginState) return;
    if (pluginState.dragging) {
      const { width, widthNeighbor, tableWidthPct } = draggedWidthWithLimit(
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
        (pluginState.dragging as any).nextCellPos,
        widthNeighbor,
        tableWidthPct,
      );
    }
  }

  displayColumnWidth(view, pluginState.activeHandle, width, defaultCellMinWidth);

  win.addEventListener('mouseup', finish);
  win.addEventListener('mousemove', move);
  event.preventDefault();
  return true;
}

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

function domCellAround(target: HTMLElement | null): HTMLElement | null {
  while (target && target.nodeName != 'TD' && target.nodeName != 'TH')
    target =
      target.classList && target.classList.contains('ProseMirror')
        ? null
        : (target.parentNode as HTMLElement);
  return target;
}

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

function draggedWidthWithLimit(
  view: EditorView,
  cellPos: number,
  dragging: Dragging,
  event: MouseEvent,
  resizeMinWidth: number,
): { width: number; widthNeighbor?: number; tableWidthPct?: number } {
  let offset = event.clientX - dragging.startX;

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
    // Resize the whole table
    const newTablePixelWidth = Math.max(resizeMinWidth * map.width, tablePixelWidth + offset);
    const tableWidthPct = (newTablePixelWidth / containerWidth) * 100;
    return { width: dragging.startWidth, tableWidthPct: Math.min(100, tableWidthPct) };
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

function updateHandle(view: EditorView, value: number): void {
  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setHandle: value }));
}

function updateColumnWidth(
  view: EditorView,
  cell: number,
  width: number,
  neighborCell?: number,
  neighborWidth?: number,
  tableWidthPct?: number,
): void {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1),
    map = TableMap.get(table),
    start = $cell.start(-1);
  const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
  const tr = view.state.tr;

  let finalTableWidthPct = tableWidthPct;

  // If the table has no width attribute yet, we MUST set it now that it's being resized.
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

  if (finalTableWidthPct !== undefined) {
    let tablePos = -1;
    for (let d = $cell.depth; d >= 0; d--) {
      // @ts-ignore
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

  // Always update the changed column(s)
  // Always update the changed column(s)
  const allWidths: Record<number, number> = {};
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
      // Get current width or default
      const cellPos = map.map[i];
      const cellNode = table.nodeAt(cellPos)!;
      const index = cellNode.attrs['colspan'] === 1 ? 0 : i - map.colCount(cellPos);
      const cw = cellNode.attrs['colwidth'];

      // If cw exists, use it. If not, it might be in pixels or missing.
      // We should probably normalize existing values if they are pixels.
      let currentW = cw ? cw[index] : 100 / map.width;

      // Check for normalization of existing data
      const firstRow = table.firstChild!;
      let totalRaw = 0;
      firstRow.forEach(c => {
        const cwc = c.attrs['colwidth'];
        if (cwc) cwc.forEach((v: number) => totalRaw += v || 0);
      });
      if (totalRaw > 101) {
        currentW = (currentW / totalRaw) * 100;
      }

      allWidths[i] = currentW;
    }
  }

  // Normalize allWidths to sum to 100
  const currentSum = Object.values(allWidths).reduce((a, b) => a + b, 0) || 100;
  for (let i = 0; i < map.width; i++) {
    allWidths[i] = (allWidths[i] / currentSum) * 100;
  }

  // Update all cells in the table
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

function displayColumnWidth(
  view: EditorView,
  cell: number,
  width: number,
  defaultCellMinWidth: number,
  neighborCell?: number,
  neighborWidth?: number,
  tableWidthPct?: number,
): void {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1),
    start = $cell.start(-1);
  const map = TableMap.get(table);
  const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
  let dom: Node | null = view.domAtPos($cell.start(-1)).node;
  while (dom && dom.nodeName != 'TABLE') dom = dom.parentNode;
  if (!dom) return;

  const overrides: Record<number, number> = { [col]: width };
  if (neighborCell !== undefined && neighborWidth !== undefined) {
    const $neighbor = view.state.doc.resolve(neighborCell);
    const neighborCol =
      map.colCount($neighbor.pos - start) + $neighbor.nodeAfter!.attrs['colspan'] - 1;
    overrides[neighborCol] = neighborWidth;
  }

  const isLastColumn = col === map.width - 1;

  // Temporarily apply table width percentage if available
  if (tableWidthPct !== undefined) {
    const wrapper = (dom as HTMLElement).parentElement;
    if (wrapper && wrapper.classList.contains('tableWrapper')) {
      wrapper.style.width = `${tableWidthPct.toFixed(2)}%`;
    }
  }

  updateColumns(
    table,
    dom.firstChild as HTMLTableColElement,
    dom as HTMLTableElement,
    defaultCellMinWidth,
    overrides,
    isLastColumn,
  );
}

function zeroes(n: number): 0[] {
  return Array(n).fill(0);
}

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
  console.log('handleDecorations:', { cell, count: decorations.length });
  return DecorationSet.create(state.doc, decorations);
}
