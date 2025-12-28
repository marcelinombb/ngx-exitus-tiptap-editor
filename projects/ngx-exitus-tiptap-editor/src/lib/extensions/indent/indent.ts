// Sources:
//https://github.com/ueberdosis/tiptap/issues/1036#issuecomment-981094752
//https://github.com/django-tiptap/django_tiptap/blob/main/django_tiptap/templates/forms/tiptap_textarea.html#L453-L602

import { Extension } from '@tiptap/core'
import { type Node } from '@tiptap/pm/model'
import { type Transaction } from '@tiptap/pm/state'
import { AllSelection, TextSelection } from 'prosemirror-state'

export const clamp = (val: number, min: number, max: number) => {
  if (val < min) {
    return min
  }
  if (val > max) {
    return max
  }
  return val
}

const IndentProps = {
  min: 0,
  max: 270,

  more: 30,
  less: -30
}

export function isBulletListNode(node: Node) {
  return node.type.name === 'bullet_list'
}

export function isOrderedListNode(node: Node) {
  return node.type.name === 'order_list'
}

export function isTodoListNode(node: Node) {
  return node.type.name === 'todo_list'
}

export function isListNode(node: Node) {
  return isBulletListNode(node) || isOrderedListNode(node) || isTodoListNode(node)
}

function setNodeIndentMarkup(tr: Transaction, pos: number, delta: number) {
  if (!tr.doc) return tr

  const node = tr.doc.nodeAt(pos)
  if (!node) return tr

  const minIndent = IndentProps.min
  const maxIndent = IndentProps.max

  const indent = clamp((node.attrs['indent'] || 0) + delta, minIndent, maxIndent)

  if (indent === node.attrs['indent']) return tr

  const nodeAttrs = {
    ...node.attrs,
    indent
  }

  return tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks)
}

const updateIndentLevel = (tr: Transaction, delta: number) => {
  const { doc, selection } = tr

  if (!doc || !selection) return tr

  if (!(selection instanceof TextSelection || selection instanceof AllSelection)) {
    return tr
  }

  const { from, to } = selection

  doc.nodesBetween(from, to, (node, pos) => {
    const nodeType = node.type

    if (nodeType.name === 'paragraph' || nodeType.name === 'heading') {
      tr = setNodeIndentMarkup(tr, pos, delta)
      return false
    }
    if (isListNode(node)) {
      return false
    }
    return true
  })

  return tr
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

export interface IndentOptions {
  types: string[]
  indentLevels: number[]
  defaultIndentLevel: number
}

export const Indent = Extension.create<IndentOptions>({
  name: 'indent',
  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      indentLevels: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270],
      defaultIndentLevel: 0
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: this.options.defaultIndentLevel,
            renderHTML: attributes => ({
              style: `margin-left: ${attributes['indent']}px!important;`
            }),
            parseHTML: element => parseInt(element.style.marginLeft) || this.options.defaultIndentLevel
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch, editor }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          tr = updateIndentLevel(tr, IndentProps.more)

          if (tr.docChanged) {
            // eslint-disable-next-line no-unused-expressions
            dispatch && dispatch(tr)
            return true
          }

          editor.chain().focus().run()

          return false
        },

      outdent:
        () =>
        ({ tr, state, dispatch, editor }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          tr = updateIndentLevel(tr, IndentProps.less)

          if (tr.docChanged) {
            // eslint-disable-next-line no-unused-expressions
            dispatch && dispatch(tr)
            return true
          }

          editor.chain().focus().run()

          return false
        }
    }
  }
})
