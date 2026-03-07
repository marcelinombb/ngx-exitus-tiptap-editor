import {
  findParentNodeClosestToPos,
  mergeAttributes,
  Node as TiptapNode,
} from '@tiptap/core';
import { Injector } from '@angular/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { FigureComponent } from './figure.component';
import {
  defaultClasses,
  allowedClasses,
  alignClasses,
  parseWidth,
} from './figure-utils';
import { createFigureCommands } from './figure-commands';
import { createFigurePlugins } from './figure-plugins';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      toggleFigcaption: () => ReturnType;
      setImageAlignment: (
        align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight',
      ) => ReturnType;
      hasAlignment: (
        align: 'left' | 'middle' | 'right' | 'inlineLeft' | 'inlineRight',
      ) => ReturnType;
      setImageWidth: (width: number | null) => ReturnType;
      cropImage: () => ReturnType;
      toggleGreyScale: () => ReturnType;
    };
  }
}

export interface ImageOptions {
  inline: boolean;
  injector?: Injector;
}

export const Figure = TiptapNode.create<ImageOptions>({
  name: 'figure',

  addOptions() {
    return {
      inline: false,
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  content: 'image figcaption?',
  draggable: true,
  isolating: true,
  allowGapCursor: false,

  parseHTML() {
    return [
      {
        tag: 'figure',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = {
      ...node.attrs,
      style: `width: ${node.attrs['width']}px;`,
    };

    return ['figure', mergeAttributes(HTMLAttributes, attrs), 0];
  },

  addNodeView() {
    return AngularNodeViewRenderer(FigureComponent, { injector: this.options.injector! });
  },

  addAttributes() {
    return {
      class: {
        default: defaultClasses.join(' '),
        parseHTML: (element) => {
          if (element.getAttribute('class')) {
            const classes = element.getAttribute('class')!.split(' ');
            const filteredClasses = classes.filter((cls) => allowedClasses.includes(cls));

            if (filteredClasses.some((cls) => alignClasses.includes(cls)) === false) {
              filteredClasses.push('ex-image-block-middle');
            }

            return Array.from(
              new Set(['ex-image-wrapper', 'tiptap-widget', ...filteredClasses]),
            ).join(' ');
          } else {
            return null;
          }
        },
      },
      width: {
        default: 300,
        parseHTML: (element) =>
          parseWidth(element.getAttribute('width')) || parseWidth(element.style.width),
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
          (node) => node.type.name === 'figure',
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
          (node) => node.type.name === 'figure',
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
    return createFigurePlugins();
  },

  addCommands() {
    return createFigureCommands();
  },
});
