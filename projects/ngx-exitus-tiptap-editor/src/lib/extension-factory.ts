import { Injector } from '@angular/core';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
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
import { CustomParagraph } from './extensions/paragraph';

export class ExtensionFactory {
    static createExtensions(injector: Injector, config?: Record<string, any>) {
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
            CustomParagraph,
            Subscript,
            Superscript,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Indent,
            Tab,
            Katex,
            Image.configure({
                inline: false,
                allowBase64: true,
                ...(config!['image'] ?? {}),
            }),
            Figcaption,
            Figure.configure({
                injector,
            }),
            ColarQuestao.configure({
                injector,
            }),
            MathType,
            MathTypePlugin,
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
            ...TableExtensions,
            SpellCheckerExtension.configure(config!['spellChecker'] ?? {}),
        ];
    }
}
