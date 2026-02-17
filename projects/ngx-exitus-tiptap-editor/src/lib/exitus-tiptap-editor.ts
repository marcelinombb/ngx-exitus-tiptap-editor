import { Component, effect, ElementRef, input, OnDestroy, output, signal, viewChild, ViewEncapsulation, Injector, inject } from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbarComponent } from './components/editor-toolbar.component';
import { Indent } from './extensions/indent/indent';
import { Tab } from './extensions/tab/tab';
import { Katex } from './extensions/katex';
import { Image } from './extensions/image/image';
import { KatexFloatingMenuComponent } from './components/floating-menus/katex-floating-menu.component';
import { ImageFloatingMenuComponent } from './components/floating-menus/image-floating-menu.component';
import { TableFloatingMenuComponent } from './components/floating-menus/table-floating-menu.component';
import { AnswerBoxFloatingMenuComponent } from './components/floating-menus/answer-box-floating-menu.component';
import { Figure } from './extensions/image/Figure';
import { Figcaption } from './extensions/image/Figcaption';
import { ColarQuestao } from './extensions/colar-questao';
import { MathType, MathTypePlugin } from './extensions/mathtype';
import { fixTableEmptyParagraphs, TableExtensions } from './extensions/table';
import { EditorDropdownService } from './components/editor-dropdown.component';
import { AnswerBox } from './extensions/answer-box/answer-box';
import { SpellCheckerExtension } from './extensions/spell-checker';
import { Paragraph } from '@tiptap/extension-paragraph';

import { SpellCheckerConfig } from './extensions/spell-checker/spell-checker';

export interface EditorExtensionsConfig {
  spellChecker?: SpellCheckerConfig;
  imageProxyUrl?: string;
}

@Component({
  selector: 'exitus-tiptap-editor',
  imports: [EditorToolbarComponent, KatexFloatingMenuComponent, ImageFloatingMenuComponent, TableFloatingMenuComponent, AnswerBoxFloatingMenuComponent],
  template: `
    <div class="exitus-tiptap-editor">
      @if(editorInstance) {
        <editor-toolbar [editor]="editorInstance"></editor-toolbar>
        <katex-floating-menu [editor]="editorInstance"></katex-floating-menu>
        <image-floating-menu [editor]="editorInstance"></image-floating-menu>
        <table-floating-menu [editor]="editorInstance"></table-floating-menu>
        <answer-box-floating-menu [editor]="editorInstance"></answer-box-floating-menu>
      }
      <div class="editor-scroller">
        <div #editor class="editor-main" spellcheck="false"></div>
      </div>
    </div>
  `,
  styleUrls: ['./exitus-tiptap-editor.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [EditorDropdownService]
})
export class ExitusTiptapEditor implements OnDestroy {
  private editorElement = viewChild.required<ElementRef>('editor');
  private editor = signal<Editor | null>(null);
  private injector = inject(Injector);
  private lastEmittedContent: string | null = null;

  editable = input<boolean>(true);
  content = input<string>(``);
  extensionsConfig = input<EditorExtensionsConfig>();

  onContentChange = output<string>();
  onEditorReady = output<Editor>();

  constructor() {

    effect(() => {
      const content = this.content();
      if (this.lastEmittedContent === content) {
        return;
      }

      const editor = this.editor();
      if (editor) {
        const currentHTML = editor.getHTML();
        if (content !== currentHTML && content !== fixTableEmptyParagraphs(currentHTML)) {
          this.setContent(content);
        }
      }
    });
  }

  setContent(newContent: string) {
    if (this.editor()) {
      this.editor()!.commands.setContent(newContent);
    }
  }

  get editorInstance(): Editor | null {
    return this.editor();
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  private initializeEditor() {
    const newEditor = new Editor({
      element: this.editorElement().nativeElement,
      editable: this.editable(),
      extensions: [
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
                  if (node.querySelector("img")) {
                    return false
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
        Katex,
        Image.configure({
          inline: false,
          allowBase64: true,
          proxyUrl: this.extensionsConfig()?.imageProxyUrl,
        }),
        Figcaption,
        Figure.configure({
          injector: this.injector
        }),
        ColarQuestao.configure({
          injector: this.injector
        }),
        MathType,
        MathTypePlugin,
        AnswerBox.configure({
          injector: this.injector
        }),
        ...TableExtensions,
        SpellCheckerExtension.configure(this.extensionsConfig()?.spellChecker),
      ],
      content: this.content(),
      onUpdate: ({ editor }) => {
        const html = fixTableEmptyParagraphs(editor.getHTML());
        this.lastEmittedContent = html;
        this.onContentChange.emit(html);
      },
      onCreate: ({ editor }) => {
        const html = fixTableEmptyParagraphs(editor.getHTML());
        this.lastEmittedContent = html;
        this.onEditorReady.emit(editor);
        this.onContentChange.emit(html);
      },
    });

    this.editor.set(newEditor);
  }

  ngOnDestroy(): void {
    this.editor()?.destroy();
  }

}
