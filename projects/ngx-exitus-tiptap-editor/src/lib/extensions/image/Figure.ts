import { findParentNode, findParentNodeClosestToPos, mergeAttributes, Node as TiptapNode } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, NodeSelection, Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { FigureView } from './figureView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      toggleFigcaption: () => ReturnType;
      setImageAlignment: (align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') => ReturnType;
      hasAlignment: (align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') => ReturnType;
      setImageWidth: (width: number | null) => ReturnType;
      cropImage: () => ReturnType;
      toggleGreyScale: () => ReturnType;
    };
  }
}

const MIN_WIDTH = 300
const MAX_WIDTH = 700

const parseWidth = (value?: string | null): number | null => {
  if (!value) return null;
  const width = parseInt(value.replace('px', ''), 10);
  return isNaN(width) ? null : Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
};

const ALIGN = {
  left: 'ex-image-block-align-left',
  middle: 'ex-image-block-middle',
  right: 'ex-image-block-align-right',
  inlineLeft: 'ex-image-float-left',
  inlineRight: 'ex-image-float-right',
} as const;

const alignClasses = ['ex-image-block-align-left', 'ex-image-block-align-right', 'ex-image-block-middle']

const allowedClasses = ['ex-image-wrapper', ...alignClasses, 'ex-image-grayscale', 'ex-image-float-left', 'ex-image-float-right']

const defaultClasses = ['ex-image-wrapper', 'ex-image-block-middle', 'tiptap-widget']

export function hasFigureAlignment(
  state: EditorState,
  align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight'
): boolean {
  const { selection } = state;

  let figureNode: { node: ProseMirrorNode; pos: number } | undefined;

  if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
    figureNode = { node: selection.node, pos: selection.from };
  } else {
    figureNode = findParentNode((node) => node.type.name === 'figure')(selection);
  }

  if (!figureNode) return false;

  const classes = (figureNode.node.attrs['class'] ?? '').split(' ');
  return classes.includes(ALIGN[align]);
}

export interface ImageOptions {
  inline: boolean
}

export const Figure = TiptapNode.create<ImageOptions>({
  name: 'figure',

  addOptions() {
    return {
      inline: false,
    }
  },

  inline() {
    return this.options.inline
  },

  group() {
    return this.options.inline ? 'inline' : 'block'
  },

  content: 'image figcaption?',
  draggable: true,
  atom: false,
  isolating: true,
  allowGapCursor: true,

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: element => {
          if (element.getAttribute('class')) {
            const classes = element.getAttribute('class')!.split(' ')
            const filteredClasses = classes.filter(cls => allowedClasses.includes(cls))

            if (filteredClasses.some(cls => alignClasses.includes(cls)) === false) {
              filteredClasses.push('ex-image-block-middle')
            }

            return {
              classes: Array.from(new Set(['ex-image-wrapper', 'tiptap-widget', ...filteredClasses])).join(' ')
            }
          } else {
            return null
          }
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes, node }) {

    const attrs = {
      ...node.attrs,
      style: `width: ${node.attrs['width']}px;`
    }

    return ['figure', mergeAttributes(HTMLAttributes, attrs), 0];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      return new FigureView(node, editor, getPos);
    };
  },

  addAttributes() {
    return {
      class: {
        default: defaultClasses.join(' '),
      },
      width: {
        default: 300,
        parseHTML: (element) => parseWidth(element.getAttribute('width')) || parseWidth(element.style.width),
      },
      originalWidth: {
        default: 300,
        parseHTML: (element) => {
          return (
            parseWidth(element.getAttribute('width')) ||
            parseWidth(element.style.width) ||
            parseWidth(element.querySelector('img')?.getAttribute('width')) ||
            parseWidth(element.querySelector('img')?.style.width) ||
            null
          );
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        const figure = findParentNodeClosestToPos(
          selection.$from,
          (node) => node.type.name === 'figure'
        );

        if (!figure || editor.isActive('figcaption')) return false;

        editor
          .chain()
          .focus()
          .deleteRange({
            from: figure.pos,
            to: figure.pos + figure.node.nodeSize,
          })
          .run();

        return true;
      },

      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        const figure = findParentNodeClosestToPos(
          selection.$from,
          (node) => node.type.name === 'figure'
        );

        if (!figure || editor.isActive('figcaption')) return false;

        editor
          .chain()
          .focus()
          .deleteRange({
            from: figure.pos,
            to: figure.pos + figure.node.nodeSize,
          })
          .run();

        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('figure-drag-select'),
        props: {
          handleDOMEvents: {
            dragstart(view, event) {
              const target = event.target as HTMLElement;

              if (!target || target.tagName !== 'IMG') {
                return false;
              }

              const pos = view.posAtDOM(target, 0);

              if (pos == null) {
                return false;
              }

              const $pos = view.state.doc.resolve(pos);

              // walk up to find the figure
              for (let d = $pos.depth; d > 0; d--) {
                const node = $pos.node(d);

                if (node.type.name === 'figure') {
                  const figurePos = $pos.before(d);

                  const tr = view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, figurePos)
                  );

                  view.dispatch(tr);

                  return false; // allow native drag to continue
                }
              }

              return false;
            },
          },
        },
      }),
    ];
  },
  addCommands() {
    return {
      hasAlignment: (align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') => {
        return ({ state }) => {
          return hasFigureAlignment(state, align);
        };
      },
      setImageAlignment: (align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight') => {
        return ({ tr, state, dispatch, view }) => {
          const { selection } = state;

          let figureNode: { node: ProseMirrorNode; pos: number } | undefined;

          if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
            figureNode = { node: selection.node, pos: selection.from };
          } else {
            figureNode = findParentNode((node) => node.type.name === 'figure')(selection);
          }

          if (!figureNode || figureNode.node.type.name !== 'figure') return false;

          const classes = new Set(
            (figureNode.node.attrs['class'] ?? '').split(' ').filter(Boolean)
          );

          const targetClass = ALIGN[align];
          const isActive = classes.has(targetClass);

          Object.values(ALIGN).forEach((cls) => classes.delete(cls));

          classes.add(isActive ? ALIGN.middle : targetClass);

          const attributes = {
            class: [...classes].join(' '),
          };

          const pos = figureNode.pos;

          tr = tr.setNodeMarkup(pos, undefined, {
            ...figureNode.node.attrs,
            ...attributes,
          });

          if (tr.docChanged) {
            dispatch && dispatch(tr);
            return true;
          }

          return false;
        };
      },
      toggleFigcaption:
        () =>
          ({ state, dispatch }) => {
            const { selection, schema } = state;

            let node: ProseMirrorNode | null = null;
            let figurePos: number | null = null;
            let from: number = selection.from;

            if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
              node = selection.node;
              figurePos = selection.from;
            } else {
              const { $from } = selection;
              from = $from.pos; // fallback for later usage if needed, but not strictly used below for `d` loop identically

              for (let d = $from.depth; d > 0; d--) {
                const currNode = $from.node(d);
                if (currNode.type.name === 'figure') {
                  node = currNode;
                  figurePos = $from.before(d);
                  break;
                }
              }
            }

            if (node && figurePos !== null) {
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

            return false;
          },
      setImageWidth: (width: number | null) => {
        return ({ tr, state, dispatch, view }) => {
          const { selection } = state;

          let figureNode: { node: ProseMirrorNode; pos: number } | undefined;

          if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
            figureNode = { node: selection.node, pos: selection.from };
          } else {
            figureNode = findParentNode((node) => node.type.name === 'figure')(selection);
          }

          if (!figureNode || figureNode.node.type.name !== 'figure') return false;

          tr = tr.setNodeMarkup(figureNode.pos, undefined, {
            ...figureNode.node.attrs,
            width,
          });

          if (tr.docChanged) {
            dispatch && dispatch(tr);
            return true;
          }

          return false;
        };
      },
      cropImage: () => {
        return ({ editor, view }) => {
          const { selection } = view.state;
          let targetPos: number | undefined;

          if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
            targetPos = selection.from;
          } else {
            const figureResult = findParentNode((node) => node.type.name === 'figure')(selection);
            targetPos = figureResult?.pos;
          }

          if (targetPos === undefined) return false;

          const dom = view.nodeDOM(targetPos) as any;
          if (dom && typeof dom.toggleCropping === 'function') {
            dom.toggleCropping();
            return true;
          }
          
          return false;
        };
      },

      toggleGreyScale: () => {
        return ({ tr, state, dispatch, view }) => {
          const { selection } = state;

          let figureNode: { node: ProseMirrorNode; pos: number } | undefined;

          if (selection instanceof NodeSelection && selection.node.type.name === 'figure') {
            figureNode = { node: selection.node, pos: selection.from };
          } else {
            figureNode = findParentNode((node) => node.type.name === 'figure')(selection);
          }

          if (!figureNode || figureNode.node.type.name !== 'figure') return false;

          const classes = new Set(
            (figureNode.node.attrs['class'] ?? '').split(' ').filter(Boolean)
          );

          
          const isActive = classes.has('ex-image-grayscale');

    
          if(isActive) {
            classes.delete('ex-image-grayscale');
          } else {
            classes.add('ex-image-grayscale');
          }
          
          const attributes = {
            class: [...classes].join(' '),
          };

          const pos = figureNode.pos;

          tr = tr.setNodeMarkup(pos, undefined, {
            ...figureNode.node.attrs,
            ...attributes,
          });

          if (tr.docChanged) {
            dispatch && dispatch(tr);
            return true;
          }

          return false;
        };
      }
    };
  },
});
