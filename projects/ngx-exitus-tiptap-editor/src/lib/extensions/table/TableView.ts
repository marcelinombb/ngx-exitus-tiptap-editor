import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { NodeView, ViewMutationRecord, EditorView } from '@tiptap/pm/view'
import { columnResizingPluginKey } from './custom-column-resizing'
import { Editor, findParentNode } from '@tiptap/core'
import { findNodePosition } from '../../utils'

export function getColStyleDeclaration(minWidth: number, width: number | undefined): [string, string] {
  if (width) {
    // apply the stored width unless it is below the configured minimum cell width
    return ['width', `${Math.max(width, minWidth)}px`]
  }

  // set the minimum with on the column if it has no stored width
  return ['min-width', `${minWidth}px`]
}

export function updateColumns(
  node: ProseMirrorNode,
  colgroup: HTMLTableColElement, // <colgroup> has the same prototype as <col>
  table: HTMLTableElement,
  cellMinWidth: number,
  overrides?: Record<number, number>,
  isLastColumn?: boolean,
) {
  let totalWidth = 0
  let fixedWidth = true
  let nextDOM = colgroup.firstChild
  const row = node.firstChild

  if (row !== null) {
    for (let i = 0, col = 0; i < row.childCount; i += 1) {
      const { colspan, colwidth } = row.child(i).attrs

      for (let j = 0; j < colspan; j += 1, col += 1) {
        const hasWidth = overrides && overrides[col] !== undefined ? overrides[col] : ((colwidth && colwidth[j]) as number | undefined)
        const cssWidth = hasWidth ? `${hasWidth}px` : ''

        totalWidth += hasWidth || cellMinWidth

        if (!hasWidth) {
          fixedWidth = false
        }

        if (!nextDOM) {
          const colElement = document.createElement('col')

          const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth)

          colElement.style.setProperty(propertyKey, propertyValue)

          colgroup.appendChild(colElement)
        } else {
          if ((nextDOM as HTMLTableColElement).style.width !== cssWidth) {
            const [propertyKey, propertyValue] = getColStyleDeclaration(cellMinWidth, hasWidth)

              ; (nextDOM as HTMLTableColElement).style.setProperty(propertyKey, propertyValue)
          }

          nextDOM = nextDOM.nextSibling
        }
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling

    nextDOM.parentNode?.removeChild(nextDOM)
    nextDOM = after
  }

  // Check if user has set a width style on the table node
  const hasUserWidth = (node.attrs['style'] && typeof node.attrs['style'] === 'string' && /\bwidth\s*:/i.test(node.attrs['style'])) || node.attrs['width']

  if (isLastColumn) {
    if (fixedWidth && !hasUserWidth) {
      table.style.width = `${totalWidth}px`
      table.style.minWidth = ''
    } else {
      table.style.width = ''
      table.style.minWidth = `${totalWidth}px`
    }
  } else if (overrides === undefined) {
    // On initial load or normal update, if we have a saved width, use it.
    if (node.attrs['width']) {
      table.style.width = node.attrs['width']
      table.style.minWidth = ''
    } else if (fixedWidth && !hasUserWidth) {
      // Default behavior for fixed width tables if no explicit width is saved
      table.style.width = `${totalWidth}px`
      table.style.minWidth = ''
    }
  }
}

export class TableView implements NodeView {
  node: ProseMirrorNode

  cellMinWidth: number

  dom: HTMLDivElement

  table: HTMLTableElement

  colgroup: HTMLTableColElement

  contentDOM: HTMLTableSectionElement

  view: EditorView

  editor: Editor

  getPos: () => number | undefined

  constructor(node: ProseMirrorNode, cellMinWidth: number, view: EditorView, getPos: () => number | undefined, editor: Editor) {
    this.node = node
    this.cellMinWidth = cellMinWidth
    this.view = view
    this.editor = editor
    this.getPos = getPos
    this.dom = document.createElement('div')
    this.dom.className = 'tableWrapper tiptap-widget'
    this.table = this.dom.appendChild(document.createElement('table'))

    // Apply user styles to the table element
    if (node.attrs['style']) {
      this.table.style.cssText = node.attrs['style']
    }

    if (node.attrs['noOuterBorder']) {
      this.table.setAttribute('data-no-outer-border', '')
    } else {
      this.table.removeAttribute('data-no-outer-border')
    }

    if (node.attrs['noVerticalBorder']) {
      this.table.setAttribute('data-no-vertical-border', '')
    }

    else if (node.attrs['noBorders']) {
      this.table.setAttribute('data-no-borders', '')
    }

    else {
      this.table.removeAttribute('data-no-vertical-border')
    }

    // Insert Paragraph Before button
    const insertBeforeBtn = document.createElement('div')
    insertBeforeBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-before')
    insertBeforeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
    insertBeforeBtn.title = 'Inserir parágrafo antes'
    insertBeforeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.insertParagraph('before')
    })
    this.dom.appendChild(insertBeforeBtn)

    // Insert Paragraph After button
    const insertAfterBtn = document.createElement('div')
    insertAfterBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-after')
    insertAfterBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
    insertAfterBtn.title = 'Inserir parágrafo após'
    insertAfterBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.insertParagraph('after')
    })
    this.dom.appendChild(insertAfterBtn)

    this.colgroup = this.table.appendChild(document.createElement('colgroup'))
    updateColumns(node, this.colgroup, this.table, cellMinWidth)
    this.contentDOM = this.table.appendChild(document.createElement('tbody'))
  }

  selectNode() {
    this.dom.classList.add('ex-selected')
  }

  deselectNode() {
    this.dom.classList.remove('ex-selected')
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) {
      return false
    }

    this.node = node

    if (node.attrs['noOuterBorder']) {
      this.table.setAttribute('data-no-outer-border', '')
    } else {
      this.table.removeAttribute('data-no-outer-border')
    }

    if (node.attrs['noBorders']) {
      this.table.setAttribute('data-no-borders', '')
    } else {
      this.table.removeAttribute('data-no-borders')
    }

    if (node.attrs['noVerticalBorder']) {
      this.table.setAttribute('data-no-vertical-border', '')
    } else {
      this.table.removeAttribute('data-no-vertical-border')
    }

    const pluginState = columnResizingPluginKey.getState(this.view.state)
    const isLastColumn = (pluginState as any)?.lastResizeWasLastColumn

    updateColumns(node, this.colgroup, this.table, this.cellMinWidth, undefined, isLastColumn)

    return true
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    const target = mutation.target as Node
    const isInsideWrapper = this.dom.contains(target)
    const isInsideContent = this.contentDOM.contains(target)

    if (isInsideWrapper && !isInsideContent) {
      if (mutation.type === 'attributes' || mutation.type === 'childList' || mutation.type === 'characterData') {
        return true
      }
    }

    return false
  }

  insertParagraph(where: 'before' | 'after') {
        if (typeof this.getPos !== 'function') return
        const pos = this.getPos()
        if (pos === undefined) return

        const insertionPos = where === 'before' ? pos : pos + this.node.nodeSize
        this.editor.commands.insertContentAt(insertionPos, { 
            type: 'paragraph', 
            content: [{ type: 'text', text: ' ' }]
         })

        if (where === 'before') {
            this.editor.commands.focus(insertionPos)
        } else {
            this.editor.commands.focus(insertionPos + 1)
        }
    }

}