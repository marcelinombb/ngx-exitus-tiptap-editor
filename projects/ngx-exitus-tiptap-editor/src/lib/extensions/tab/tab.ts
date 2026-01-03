//@ts-nocheck
import { type Editor, Node } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'

function addTab(editor: Editor) {
  return editor.commands.insertContentAt(editor.view.state.selection.$anchor.pos, `<span class="ex-tab"></span>`, {
    updateSelection: true,
    parseOptions: {
      preserveWhitespace: 'full'
    }
  })
}

export const Tab = Node.create({
  name: 'teclatab',

  group: 'inline',

  inline: true,

  content: 'text*',

  atom: true,

  addCommands() {
    return {
      tabIndent:
        () =>
        ({ tr, state, dispatch, editor }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          tr = addTab(editor)

          if (tr.docChanged) {
            dispatch && dispatch(tr)
            return true
          }

          editor.chain().focus().run()

          return false
        },
      tabOutdent: () => () => {
        return true
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: node => {
          return (node as HTMLElement).className === 'ex-tab' && null
        },
        priority: 9999
      },
      {
        tag: 'span',
        getAttrs: node => {
          return (node as HTMLElement).className === 'tabIndent' && null
        },
        priority: 9999
      }
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'ex-tab' }), '\u00A0'.repeat(8)]
  },
  addAttributes() {
    return {
      class: {
        default: ''
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!(this.editor.isActive('bulletList') || this.editor.isActive('orderedList'))) {
          return addTab(this.editor)
        }
        return false
      },
      'Shift-Tab': () => {
        if (!(this.editor.isActive('bulletList') || this.editor.isActive('orderedList'))) {
          const selection = this.editor.view.state.selection
          if (selection && selection.$anchor) {
            const position = selection.$anchor

            if (position.nodeBefore && position.nodeBefore.type.name === 'teclatab') {
              const from = position.pos - position.nodeBefore.nodeSize
              const to = position.pos - 1

              this.editor.commands.deleteRange({ from, to })
              return true
            }
          }
        }
        return false
      }
    }
  }
})
