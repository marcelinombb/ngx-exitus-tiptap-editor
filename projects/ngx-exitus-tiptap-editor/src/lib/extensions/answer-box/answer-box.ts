import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { AnswerBoxComponent } from './answer-box.component';
import { Injector } from '@angular/core';
import { findNodeFromSelection } from '../../utils/tiptap-selection';

export interface AnswerBoxOptions {
  HTMLAttributes: Record<string, any>;
  injector?: Injector;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    answerBox: {
      insertAnswerBox: () => ReturnType;
      setAnswerBoxStyle: (style: 'box' | 'lines' | 'numbered-lines') => ReturnType;
      toggleAnswerBoxHeader: () => ReturnType;
      toggleAnswerBoxBorder: () => ReturnType;
      toggleAnswerBoxNumbersBold: () => ReturnType;
      setAnswerBoxLines: (lines: number) => ReturnType;
    };
  }
}

export const AnswerBox = Node.create<AnswerBoxOptions>({
  name: 'answerBox',

  group: 'block',
  content: 'inline*',
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      injector: undefined,
    };
  },

  addAttributes() {
    return {
      style: {
        default: 'box',
        parseHTML: (element) => element.getAttribute('data-style') as any,
        renderHTML: (attributes) => {
          return {
            'data-style': attributes['style'],
          };
        },
      },
      lines: {
        default: 5,
        parseHTML: (element) => parseInt(element.getAttribute('data-lines') || '5', 10),
        renderHTML: (attributes) => {
          return {
            'data-lines': attributes['lines'],
          };
        },
      },
      showHeader: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-show-header') === 'true',
        renderHTML: (attributes) => {
          return {
            'data-show-header': attributes['showHeader'],
          };
        },
      },
      hideBorder: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-hide-border') === 'true',
        renderHTML: (attributes) => {
          return {
            'data-hide-border': attributes['hideBorder'],
          };
        },
      },
      numbersBold: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-numbers-bold') !== 'false',
        renderHTML: (attributes) => {
          return {
            'data-numbers-bold': attributes['numbersBold'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.ex-answer-box',
        contentElement: (element) => element.querySelector('.ex-answer-box-header') || element,
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Fallback or serialization render
    const { style, lines, hideBorder, showHeader, numbersBold } = node.attrs;
    const classes = ['ex-answer-box'];
    if (hideBorder) {
      classes.push('ex-answer-box-no-border');
    }

    const visuals: any[] = ['div', { class: 'ex-answer-box-visuals' }];

    if (style === 'lines' || style === 'numbered-lines') {
      const count = parseInt(lines, 10) || 5;
      for (let i = 1; i <= count; i++) {
        const lineChildren: any[] = [];
        if (style === 'numbered-lines') {
          const numberClasses = ['ex-answer-number'];
          if (numbersBold) {
            numberClasses.push('ex-answer-number-bold');
          }
          lineChildren.push(['span', { class: numberClasses.join(' ') }, `${i}.`]);
        }
        visuals.push(['div', { class: 'ex-answer-line' }, ...lineChildren]);
      }
    } else {
      const count = parseInt(lines, 10) || 5;
      visuals[1].style = `height: ${count * 30}px;`;
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: classes.join(' ') }),
      [
        'div',
        {
          class: 'ex-answer-box-header',
          style: showHeader ? 'display: block' : 'display: none',
          'data-node-view-content': '',
        },
        0,
      ],
      visuals,
    ];
  },

  addNodeView() {
    if (!this.options.injector) {
      console.warn('AnswerBoxExtension: Injector not provided. Angular NodeView might fail.');
    }
    return AngularNodeViewRenderer(AnswerBoxComponent, { injector: this.options.injector! });
  },

  addCommands() {
    return {
      insertAnswerBox:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {},
          });
        },
      setAnswerBoxStyle:
        (style: 'box' | 'lines' | 'numbered-lines') =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { style });
        },
      setAnswerBoxLines:
        (lines: number) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { lines });
        },
      toggleAnswerBoxHeader:
        () =>
        ({ commands, state }) => {
          const found = findNodeFromSelection(state.selection, this.name);
          if (!found) return false;

          const showHeader = !found.node.attrs['showHeader'];
          return commands.updateAttributes(this.name, { showHeader });
        },
      toggleAnswerBoxBorder:
        () =>
        ({ state, dispatch }) => {
          const found = findNodeFromSelection(state.selection, this.name);
          if (!found) return false;

          if (dispatch) {
            const hideBorder = !found.node.attrs['hideBorder'];
            dispatch(state.tr.setNodeAttribute(found.pos, 'hideBorder', hideBorder));
          }
          return true;
        },
      toggleAnswerBoxNumbersBold:
        () =>
        ({ state, dispatch }) => {
          const found = findNodeFromSelection(state.selection, 'answerBox');
          if (!found) return false;

          if (dispatch) {
            const numbersBold = !found.node.attrs['numbersBold'];
            dispatch(state.tr.setNodeAttribute(found.pos, 'numbersBold', numbersBold));
          }
          return true;
        },
    };
  },
});
