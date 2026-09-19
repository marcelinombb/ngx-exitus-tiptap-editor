import { Injector } from '@angular/core';
import { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Indent } from './extensions/indent/indent';
import { Tab } from './extensions/tab/tab';
import { Katex } from './extensions/katex';
import { Image } from './extensions/image/image';
import { Figure } from './extensions/image/Figure';
import { Figcaption } from './extensions/image/Figcaption';
import { ColarQuestao } from './extensions/colar-questao';
import { MathType, MathTypePlugin } from './extensions/mathtype';
import { TableExtensions } from './extensions/table';
import { AnswerBox } from './extensions/answer-box/answer-box';
import { Association } from './extensions/association/association';
import { AssociationColumn } from './extensions/association/association-column';
import { AssociationItem } from './extensions/association/association-item';
import { Alternative } from './extensions/alternatives/alternative';
import { AlternativeItem } from './extensions/alternatives/alternative-item';
import { SpellCheckerExtension } from './extensions/spell-checker';

export interface ExtensionFactoryConfig {
  image?: Record<string, any>;
  spellChecker?: Record<string, any>;
  [key: string]: any;
}

/**
 * Creates core typography and text manipulation extensions.
 */
export function createCoreExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      link: false,
      trailingNode: false,
      heading: false,
      codeBlock: false,
      code: false,
      listKeymap: false,
      paragraph: false,
    }),
    Paragraph.extend({
      parseHTML() {
        return [
          {
            tag: 'p',
            getAttrs: (node) => {
              if (node instanceof HTMLElement && node.querySelector('img')) {
                return false;
              }
              return {};
            },
          },
        ];
      },
    }),
    Subscript,
    Superscript,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Indent,
    Tab,
  ];
}

/**
 * Creates math and formula editing extensions (KaTeX and MathType).
 */
export function createMathExtensions(): AnyExtension[] {
  return [Katex, MathType, MathTypePlugin];
}

/**
 * Creates image handling extensions with Angular node views.
 */
export function createImageExtensions(
  injector: Injector,
  imageConfig?: Record<string, any>,
): AnyExtension[] {
  return [
    Image.configure({
      inline: false,
      allowBase64: true,
      ...(imageConfig ?? {}),
    }),
    Figcaption,
    Figure.configure({
      injector,
    }),
  ];
}

/**
 * Creates educational question/quiz structured extensions.
 */
export function createQuestionExtensions(injector: Injector): AnyExtension[] {
  return [
    ColarQuestao.configure({
      injector,
    }),
    AnswerBox.configure({
      injector,
    }),
    Association.configure({
      injector,
    }),
    AssociationColumn.configure({
      injector,
    }),
    AssociationItem.configure({
      injector,
    }),
    Alternative.configure({
      injector,
    }),
    AlternativeItem.configure({
      injector,
    }),
  ];
}

/**
 * Returns table support extensions.
 */
export function createTableExtensions(): AnyExtension[] {
  return [...TableExtensions];
}

/**
 * Creates spell checker extensions.
 */
export function createSpellCheckerExtensions(
  spellCheckerConfig?: Record<string, any>,
): AnyExtension[] {
  return [SpellCheckerExtension.configure(spellCheckerConfig ?? {})];
}

/**
 * Factory class aggregating all extension modules.
 */
export class ExtensionFactory {
  static createExtensions(injector: Injector, config: ExtensionFactoryConfig = {}): AnyExtension[] {
    return [
      ...createCoreExtensions(),
      ...createMathExtensions(),
      ...createImageExtensions(injector, config['image']),
      ...createQuestionExtensions(injector),
      ...createTableExtensions(),
      ...createSpellCheckerExtensions(config['spellChecker']),
    ];
  }
}
