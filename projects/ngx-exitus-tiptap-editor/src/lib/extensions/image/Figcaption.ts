import { Node } from '@tiptap/core'

export const Figcaption = Node.create({
  name: 'figcaption',

  content: 'inline*',
  isolating: true,

  parseHTML() {
    return [{ tag: 'figcaption' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figcaption', HTMLAttributes, 0]
  },
})
