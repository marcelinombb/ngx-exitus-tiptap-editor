import { type ChainedCommands, type Editor } from '@tiptap/core'
import { DOMSerializer, type Node, type Schema } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { Fragment } from 'prosemirror-model'

export function createHTMLElement<T = Element>(tagName: string, attributes: Record<string, string>, childrens?: Element[]): T {
  // Create the element
  const element = document.createElement(tagName)

  // Set attributes if provided
  if (attributes) {
    for (const key in attributes) {
      if (attributes.hasOwnProperty(key)) {
        element.setAttribute(key, attributes[key])
      }
    }
  }

  // Set content if provided
  if (childrens) {
    element.append(...childrens)
  }

  return element as T
}

export function insertParagraph(editor: Editor, position: number) {
  const { view } = editor
  const { tr, schema } = view.state

  const paragraph = schema.nodes['paragraph'].create()

  const transaction = tr.insert(position, Fragment.from(paragraph))

  view.dispatch(transaction)
  // Set selection to new paragraph
  editor.commands.setTextSelection(position + 1)
}

export function findNodePosition(editor: Editor, targetNode: Node) {
  const { doc } = editor.view.state
  let position = -1

  doc.descendants((node, pos) => {
    if (node === targetNode) {
      position = pos
      return false // Stop traversing
    }
    return true
  })

  return position
}

export function setSelectionAfter(editor: Editor, targetNode: Node) {
  const { view } = editor
  const { doc, tr } = view.state

  // Find the position of the target node
  let targetPos = null
  doc.descendants((node, pos) => {
    if (node === targetNode) {
      targetPos = pos + node.nodeSize // Position after the target node
      return false // Stop the iteration
    }
    return true
  })

  if (targetPos !== null) {
    const selection = TextSelection.create(doc, targetPos)
    const transaction = tr.setSelection(selection)
    view.dispatch(transaction)
    view.focus()
  }
}

export function getNodeFromSelection(editor: Editor): Node | null {
  const { state } = editor.view
  const { from } = state.selection
  const node = state.doc.nodeAt(from)
  return node
}

export function deleteSelectedNode(editor: Editor): ChainedCommands {
  return editor.chain().command(({ tr, state, dispatch }) => {
    const { selection } = state
    const { $from, $to } = selection
    const node = $from.node()

    if (dispatch && node) {
      tr.delete($from.pos, $to.pos)
    }

    return true
  })
}

export function getNodeBoundingClientRect(editor: Editor, nodePos: number) {
  const view = editor.view
  const dom = view.nodeDOM(nodePos) // Get the DOM element for the node at position nodePos  
  if (dom) {
    //@ts-ignore
    return dom.getBoundingClientRect()
  }
  return null
}

export function cssParaObj(cssString: string): Record<string, string> {
  const styles: Record<string, string> = {}

  // Remover espaços em branco desnecessários
  cssString = cssString.replace(/\s*:\s*/g, ':').replace(/\s*;\s*/g, ';')

  // Dividir a string por ponto e vírgula para obter as declarações individuais
  const declarations = cssString.split(';')

  // Iterar sobre as declarações e adicionar ao objeto
  declarations.forEach(declaration => {
    const [property, value] = declaration.split(':')
    if (property && value) {
      styles[property.trim()] = value.trim()
    }
  })

  return styles
}

export function objParaCss(styles: Record<string, string>): string {
  let cssString = ''

  for (const property in styles) {
    if (styles.hasOwnProperty(property)) {
      cssString += `${property}: ${styles[property]}; `
    }
  }
  return cssString.trim()
}

export function getHTMLFromFragment(fragment: Fragment, schema: Schema): string {
  const documentFragment = DOMSerializer.fromSchema(schema).serializeFragment(fragment)

  const temporaryDocument = document.implementation.createHTMLDocument()
  const container = temporaryDocument.createElement('div')

  container.appendChild(documentFragment)

  container.querySelectorAll('p').forEach(paragraph => {
    if (paragraph.textContent?.trim() === '' && paragraph.children.length === 0) {
      paragraph.innerHTML = ''
      paragraph.appendChild(document.createElement('br')).classList.add('ProseMirror-trailingBreak')
    }
  })

  return container.innerHTML
}

export function debounce<F extends (...args: any[]) => void>(fn: F, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<F>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
