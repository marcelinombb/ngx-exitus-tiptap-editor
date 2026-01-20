import { Node } from '@tiptap/core'

export const Figcaption = Node.create({
  name: 'figcaption',

  content: 'text*',
  isolating: true,

  parseHTML() {
    return [{ tag: 'figcaption' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figcaption', HTMLAttributes, 0]
  },
})
