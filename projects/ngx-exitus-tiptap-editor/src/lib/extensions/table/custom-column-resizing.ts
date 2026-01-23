import { Attrs, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorState, Transaction, Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView, NodeView, Decoration, DecorationSet } from '@tiptap/pm/view';
import { TableMap, TableView, cellAround, pointsAtCell, tableNodeTypes } from '@tiptap/pm/tables';
import { updateColumns } from './TableView';

export const columnResizingPluginKey = new PluginKey<ResizeState>('tableColumnResizing');

export type ColumnResizingOptions = {
    handleWidth?: number;
    cellMinWidth?: number;
    defaultCellMinWidth?: number;
    lastColumnResizable?: boolean;
    View?: (new (node: ProsemirrorNode, cellMinWidth: number, view: EditorView) => NodeView) | null;
};

export type Dragging = { startX: number; startWidth: number; startTableWidth: number; startWidthNeighbor?: number; nextCellPos?: number };

export function columnResizing({
    handleWidth = 5,
    cellMinWidth = 25,
    defaultCellMinWidth = 100,
    View = TableView,
    lastColumnResizable = true,
}: ColumnResizingOptions = {}): Plugin {
    const plugin = new Plugin<ResizeState>({
        key: columnResizingPluginKey,
        state: {
            init(_, state) {
                const nodeViews = plugin.spec?.props?.nodeViews;
                const tableName = tableNodeTypes(state.schema).table.name;
                if (View && nodeViews) {
                    nodeViews[tableName] = (node, view) => {
                        return new View(node, defaultCellMinWidth, view);
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
    constructor(public activeHandle: number, public dragging: Dragging | false, public lastResizeWasLastColumn: boolean = false) { }

    apply(tr: Transaction): ResizeState {
        const state = this;
        const action = tr.getMeta(columnResizingPluginKey);
        if (action && action.setHandle != null) return new ResizeState(action.setHandle, false, state.lastResizeWasLastColumn);
        if (action && action.setDragging !== undefined) return new ResizeState(state.activeHandle, action.setDragging, state.lastResizeWasLastColumn);
        if (action && action.isLastColumn !== undefined) return new ResizeState(state.activeHandle, state.dragging, action.isLastColumn);
        if (state.activeHandle > -1 && tr.docChanged) {
            let handle = tr.mapping.map(state.activeHandle, -1);
            if (!pointsAtCell(tr.doc.resolve(handle))) {
                handle = -1;
            }
            return new ResizeState(handle, state.dragging, state.lastResizeWasLastColumn);
        }
        return state;
    }
}

function handleMouseMove(view: EditorView, event: MouseEvent, handleWidth: number, lastColumnResizable: boolean): void {
    if (!view.editable) return;

    const pluginState = columnResizingPluginKey.getState(view.state);
    if (!pluginState) return;

    if (!pluginState.dragging) {
        const target = domCellAround(event.target as HTMLElement);
        let cell = -1;
        if (target) {
            const { left, right } = target.getBoundingClientRect();
            if (event.clientX - left <= handleWidth) cell = edgeCell(view, event, 'left', handleWidth);
            else if (right - event.clientX <= handleWidth) cell = edgeCell(view, event, 'right', handleWidth);
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

function handleMouseDown(view: EditorView, event: MouseEvent, cellMinWidth: number, defaultCellMinWidth: number): boolean {
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
        const nextCellIndex = map.map.indexOf($cell.pos - tableStart) + $cell.nodeAfter!.attrs['colspan'];
        if (nextCellIndex % map.width !== 0) { // Not the end of the row
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
                startWidthNeighbor,
                nextCellPos
            },
        }),
    );

    function finish(event: MouseEvent) {
        win.removeEventListener('mouseup', finish);
        win.removeEventListener('mousemove', move);
        const pluginState = columnResizingPluginKey.getState(view.state);
        if (pluginState?.dragging) {
            const { width, widthNeighbor } = draggedWidthWithLimit(view, pluginState.activeHandle, pluginState.dragging, event, cellMinWidth);
            updateColumnWidth(view, pluginState.activeHandle, width, (pluginState.dragging as any).nextCellPos, widthNeighbor);
            view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setDragging: null }));
        }
    }

    function move(event: MouseEvent): void {
        if (!event.which) return finish(event);
        const pluginState = columnResizingPluginKey.getState(view.state);
        if (!pluginState) return;
        if (pluginState.dragging) {
            const { width, widthNeighbor } = draggedWidthWithLimit(view, pluginState.activeHandle, pluginState.dragging, event, cellMinWidth);
            displayColumnWidth(view, pluginState.activeHandle, width, defaultCellMinWidth, (pluginState.dragging as any).nextCellPos, widthNeighbor);
        }
    }

    displayColumnWidth(view, pluginState.activeHandle, width, defaultCellMinWidth);

    win.addEventListener('mouseup', finish);
    win.addEventListener('mousemove', move);
    event.preventDefault();
    return true;
}

function currentColWidth(view: EditorView, cellPos: number, { colspan, colwidth }: Attrs): number {
    const width = colwidth && colwidth[colwidth.length - 1];
    if (width) return width;
    const dom = view.domAtPos(cellPos);
    const node = dom.node.childNodes[dom.offset] as HTMLElement;
    let domWidth = node.offsetWidth,
        parts = colspan;
    if (colwidth)
        for (let i = 0; i < colspan; i++)
            if (colwidth[i]) {
                domWidth -= colwidth[i];
                parts--;
            }
    return domWidth / parts;
}

function domCellAround(target: HTMLElement | null): HTMLElement | null {
    while (target && target.nodeName != 'TD' && target.nodeName != 'TH')
        target = target.classList && target.classList.contains('ProseMirror') ? null : (target.parentNode as HTMLElement);
    return target;
}

function edgeCell(view: EditorView, event: MouseEvent, side: 'left' | 'right', handleWidth: number): number {
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

function draggedWidthWithLimit(view: EditorView, cellPos: number, dragging: Dragging, event: MouseEvent, resizeMinWidth: number): { width: number, widthNeighbor?: number } {
    let offset = event.clientX - dragging.startX;

    // Limit width based on container and other columns
    const $cell = view.state.doc.resolve(cellPos);
    const table = $cell.node(-1);
    const map = TableMap.get(table);
    const start = $cell.start(-1);
    const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
    const isLastColumn = col === map.width - 1;

    let dom: Node | null = view.domAtPos(start).node;
    while (dom && dom.nodeName != 'TABLE') dom = dom.parentNode;
    const container = (dom as HTMLElement)?.closest('.editor-main');

    if (dom && container) {
        const containerRect = container.getBoundingClientRect();
        const padding = 38 * 2;
        const maxWidth = containerRect.width - padding;

        if (isLastColumn) {
            const otherColumnsWidth = dragging.startTableWidth - dragging.startWidth;
            const maxAllowedColumnWidth = maxWidth - otherColumnsWidth;
            const minAllowedOffset = resizeMinWidth - dragging.startWidth;
            const maxAllowedOffset = maxAllowedColumnWidth - dragging.startWidth;
            offset = Math.max(minAllowedOffset, Math.min(maxAllowedOffset, offset));
            return { width: dragging.startWidth + offset };
        } else if (dragging.startWidthNeighbor !== undefined) {
            // For inner columns, it's zero-sum.
            const minAllowedOffset = resizeMinWidth - dragging.startWidth;
            const maxAllowedOffset = dragging.startWidthNeighbor - resizeMinWidth;
            offset = Math.max(minAllowedOffset, Math.min(maxAllowedOffset, offset));
            return {
                width: dragging.startWidth + offset,
                widthNeighbor: dragging.startWidthNeighbor - offset
            };
        }
    }

    return { width: Math.max(resizeMinWidth, dragging.startWidth + offset) };
}

function updateHandle(view: EditorView, value: number): void {
    view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setHandle: value }));
}

function updateColumnWidth(view: EditorView, cell: number, width: number, neighborCell?: number, neighborWidth?: number): void {
    const $cell = view.state.doc.resolve(cell);
    const table = $cell.node(-1),
        map = TableMap.get(table),
        start = $cell.start(-1);
    const col = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs['colspan'] - 1;
    const isLastColumn = col === map.width - 1;
    const tr = view.state.tr;
    tr.setMeta(columnResizingPluginKey, { isLastColumn });

    const updateColumn = (c: number, w: number) => {
        for (let row = 0; row < map.height; row++) {
            const mapIndex = row * map.width + c;
            if (row && map.map[mapIndex] == map.map[mapIndex - map.width]) continue;
            const pos = map.map[mapIndex];
            const node = table.nodeAt(pos);
            if (!node) continue;
            const attrs = node.attrs;
            const index = attrs['colspan'] == 1 ? 0 : c - map.colCount(pos);
            if (attrs['colwidth'] && attrs['colwidth'][index] == w) continue;
            const colwidth = attrs['colwidth'] ? attrs['colwidth'].slice() : zeroes(attrs['colspan']);
            colwidth[index] = w;
            tr.setNodeMarkup(start + pos, undefined, { ...attrs, colwidth: colwidth });
        }
    };

    updateColumn(col, width);
    if (neighborCell !== undefined && neighborWidth !== undefined) {
        const $neighbor = view.state.doc.resolve(neighborCell);
        const neighborCol = map.colCount($neighbor.pos - start) + $neighbor.nodeAfter!.attrs['colspan'] - 1;
        updateColumn(neighborCol, neighborWidth);
    }

    if (isLastColumn) {
        let totalWidth = 0;
        for (let c = 0; c < map.width; c++) {
            if (c === col) {
                totalWidth += width;
            } else {
                const cellPos = map.map[c];
                const attrs = table.nodeAt(cellPos)!.attrs;
                const index = attrs['colspan'] === 1 ? 0 : c - map.colCount(cellPos);
                totalWidth += (attrs['colwidth'] && attrs['colwidth'][index]) || 32;
            }
        }
        tr.setNodeMarkup($cell.before(-1), undefined, { ...table.attrs, width: `${totalWidth}px` });
    }

    if (tr.docChanged) view.dispatch(tr);
}

function displayColumnWidth(view: EditorView, cell: number, width: number, defaultCellMinWidth: number, neighborCell?: number, neighborWidth?: number): void {
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
        const neighborCol = map.colCount($neighbor.pos - start) + $neighbor.nodeAfter!.attrs['colspan'] - 1;
        overrides[neighborCol] = neighborWidth;
    }

    const isLastColumn = col === map.width - 1;
    updateColumns(table, dom.firstChild as HTMLTableColElement, dom as HTMLTableElement, defaultCellMinWidth, overrides, isLastColumn);
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
        if ((col == map.width - 1 || map.map[index] != map.map[index + 1]) && (row == 0 || map.map[index] != map.map[index - map.width])) {
            const cellPos = map.map[index];
            const pos = start + cellPos + table.nodeAt(cellPos)!.nodeSize - 1;
            const dom = document.createElement('div');
            dom.className = 'column-resize-handle';
            if (columnResizingPluginKey.getState(state)?.dragging) {
                decorations.push(Decoration.node(start + cellPos, start + cellPos + table.nodeAt(cellPos)!.nodeSize, { class: 'column-resize-dragging' }));
            }
            decorations.push(Decoration.widget(pos, dom));
        }
    }
    return DecorationSet.create(state.doc, decorations);
}
