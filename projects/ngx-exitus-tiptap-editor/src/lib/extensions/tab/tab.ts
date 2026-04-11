import { type Editor, Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    teclatab: {
      tabIndent: () => ReturnType;
      tabOutdent: () => ReturnType;
    };
  }
}

function addTab(editor: Editor): boolean {
  return editor.commands.insertContentAt(
    editor.view.state.selection.$anchor.pos,
    { type: 'teclatab' },
    { updateSelection: true },
  );
}

export const Tab = Node.create({
  name: 'teclatab',

  group: 'inline',

  inline: true,

  // `atom: true` with no `content` makes this a leaf node (nodeSize = 1).
  // Combining `content: 'text*'` with `atom: true` caused unpredictable nodeSize
  // values (2 + text length) which broke the Shift-Tab deletion range and made
  // the rendered width depend on how many characters were stored inside.
  atom: true,

  selectable: false,

  addCommands() {
    return {
      tabIndent:
        () =>
        ({ editor }: { editor: Editor }) => {
          return addTab(editor);
        },
      tabOutdent: () => () => {
        return true;
      },
    };
  },

  parseHTML() {
    return [
      {
        // Match both legacy `tabIndent` class and current `ex-tab` class so
        // documents saved before this refactor continue to load correctly.
        tag: 'span.ex-tab, span.tabIndent',
        priority: 9999,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Width is controlled entirely by inline styles on the span.
    // No text content is stored inside the span — this eliminates the
    // font-dependent width variance caused by repeating \u00A0 characters.
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'ex-tab',
        style: 'display: inline-block; width: 4ch; min-width: 4ch; vertical-align: baseline; user-select: none; pointer-events: none;',
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!(this.editor.isActive('bulletList') || this.editor.isActive('orderedList'))) {
          return addTab(this.editor);
        }
        return false;
      },
      'Shift-Tab': () => {
        if (!(this.editor.isActive('bulletList') || this.editor.isActive('orderedList'))) {
          const { selection } = this.editor.view.state;
          const position = selection.$anchor;

          if (position.nodeBefore?.type.name === 'teclatab') {
            // Leaf atom node: nodeSize = 1.
            // Range [pos - 1, pos] covers exactly the node.
            const nodeSize = position.nodeBefore.nodeSize; // 1
            const from = position.pos - nodeSize;
            const to = position.pos;

            this.editor.commands.deleteRange({ from, to });
            return true;
          }
        }
        return false;
      },
    };
  },
});
