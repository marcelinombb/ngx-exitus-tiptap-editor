import { findParentNodeClosestToPos, Node } from '@tiptap/core';
import { TextSelection } from 'prosemirror-state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      toggleFigcaption: () => ReturnType;
    };
  }
}

export const Figure = Node.create({
  name: 'figure',

  group: 'block',
  content: 'image figcaption?',
  draggable: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'figure' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', HTMLAttributes, 0];
  },

  addAttributes() {
    return {
      class: {
        default: 'ex-image-wrapper ex-image-block-middle tiptap-widget',
      },
      draggable: {
        default: true
      }
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor
        const { selection } = state

        const figure = findParentNodeClosestToPos(
          selection.$from,
          node => node.type.name === 'figure',
        )

        if (!figure || editor.isActive("figcaption")) return false

        editor
          .chain()
          .focus()
          .deleteRange({
            from: figure.pos,
            to: figure.pos + figure.node.nodeSize,
          })
          .run()

        return true
      },

      Delete: ({ editor }) => {
        const { state } = editor
        const { selection } = state

        const figure = findParentNodeClosestToPos(
          selection.$from,
          node => node.type.name === 'figure',
        )

        if (!figure || editor.isActive("figcaption")) return false

        editor
          .chain()
          .focus()
          .deleteRange({
            from: figure.pos,
            to: figure.pos + figure.node.nodeSize,
          })
          .run()

        return true
      },
    }
  },

  addCommands() {
    return {
      toggleFigcaption:
        () =>
        ({ state, dispatch }) => {
          const { selection, schema } = state;
          const { $from } = selection;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === 'figure') {
              const figurePos = $from.before(d);
              const figcaptionType = schema.nodes['figcaption'];

              const hasCaption = node.childCount > 1 && node.lastChild?.type === figcaptionType;

              let tr = state.tr;

              if (hasCaption) {
                const captionPos = figurePos + node.nodeSize - node.lastChild!.nodeSize - 1;

                tr = tr.delete(captionPos, captionPos + node.lastChild!.nodeSize);
              } else {
                const caption = figcaptionType.createAndFill();
                if (!caption) return false;

                const insertPos = figurePos + node.nodeSize - 1;
                tr = tr.insert(insertPos, caption);

                // move cursor INTO figcaption
                const $pos = tr.doc.resolve(insertPos + 1);
                tr = tr.setSelection(TextSelection.near($pos));
              }

              dispatch && dispatch(tr.scrollIntoView());
              return true;
            }
          }

          return false;
        },
    };
  }
});
