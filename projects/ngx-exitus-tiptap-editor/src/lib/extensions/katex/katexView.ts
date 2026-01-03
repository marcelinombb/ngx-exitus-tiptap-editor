import { createHTMLElement } from '../../utils'
import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type NodeView } from '@tiptap/pm/view'
import katex from 'katex'
import { parseLatex } from './katex'

export function updateLatexDisplay(latex: string, containerDisplay: Element) {
  const formula = latex

  try {
    const matches = parseLatex(formula)
    const latexFormula = matches
    containerDisplay.innerHTML = katex.renderToString(latexFormula, {
      output: 'html'
    })
    containerDisplay.classList.remove('math-tex-error')
  } catch (error) {
    containerDisplay.innerHTML = formula
    containerDisplay.classList.add('math-tex-error')
  }
}

export class KatexView implements NodeView {
  dom: HTMLElement
  node: ProseMirrorNode
  renderedLatex: HTMLElement
  editor: Editor
  getPos: boolean | (() => number)
  editing: boolean
  checkboxDisplay: any

  constructor(node: ProseMirrorNode, editor: Editor, getPos: boolean | (() => number)) {
    this.node = node
    this.editor = editor
    this.getPos = getPos
    const { isEditing, display, latexFormula } = this.node.attrs
    this.editing = isEditing

    this.dom = createHTMLElement('span', { contentEditable: 'false', class: 'math-tex tiptap-widget ' }) as HTMLElement
    this.dom.setAttribute('latexFormula', latexFormula)
    this.dom.classList.toggle('katex-display', display)

    this.renderedLatex = document.createElement('span')
    this.renderedLatex.contentEditable = 'false'
    this.renderedLatex.style.display = 'inline-block'

    updateLatexDisplay(latexFormula, this.renderedLatex)
  
    this.dom.append(this.renderedLatex)
  }

  updateAttributes(attributes: Record<string, any>) {
    if (typeof this.getPos === 'function') {
      const { view } = this.editor
      const transaction = view.state.tr
      transaction.setNodeMarkup(this.getPos(), undefined, attributes)
      view.dispatch(transaction)
    }
  }

  isEditing() {
    return this.editing
  }

  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) {
      return false
    }

    this.node = newNode

    //if (!this.isEditing()) {
      const { display, latexFormula } = this.node.attrs
      //this.balloon.input.value = latexFormula

      updateLatexDisplay(latexFormula, this.renderedLatex)
      this.dom.classList.toggle('katex-display', display)
    //}

    return true
  }

  deleteNode() {
    if (typeof this.getPos === 'function') {
      const pos = this.getPos()
      if (typeof pos !== 'number') return
      const tr = this.editor.view.state.tr

      this.editor.view.dispatch(tr.delete(pos, pos + this.node.nodeSize))
    }
  }

  stopEvent(event: Event) {
    if (event.type === 'dragstart' && this.isEditing()) {
      event.preventDefault()
    }

    return this.isEditing()
  }
}
