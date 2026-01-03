import { Component, effect, ElementRef, input, OnDestroy, output, signal, viewChild, ViewEncapsulation } from '@angular/core';
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
import { KatexFloatingMenuComponent } from './extensions/katex/katex-floating-menu.component';
import { ImageFloatingMenuComponent } from './extensions/image/image-floating-menu.component';

@Component({
  selector: 'exitus-tiptap-editor',
  imports: [EditorToolbarComponent, KatexFloatingMenuComponent, ImageFloatingMenuComponent],
  template: `
    <div class="exitus-tiptap-editor">
      @if(editorInstance) {
        <editor-toolbar [editor]="editorInstance"></editor-toolbar>
        <katex-floating-menu [editor]="editorInstance"></katex-floating-menu>
        <image-floating-menu [editor]="editorInstance"></image-floating-menu>
      }
      <div class="editor-scroller">
        <div #editor class="editor-main"></div>
      </div>
    </div>
  `,
  styleUrls: ['./exitus-tiptap-editor.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ExitusTiptapEditor implements OnDestroy{

  private editorElement = viewChild.required<ElementRef>('editor');
  private editor = signal<Editor | null>(null);
  private contentHtml = signal<string>("");

  content = input<string>(`$$\\frac{a}{b} + c$$`);

  onContentChange = output<string>();

  constructor() {

    effect(() => {
      const content = this.content();
      if (this.editor() && content !== this.editor()!.getHTML()) {
        this.setContent(content);
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
      extensions: [
        StarterKit,
        Subscript,
        Superscript,
        TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        Indent,
        Tab,
        Katex,
        Image.configure({
          inline: false,
          allowBase64: true,
          /* resize: {
            enabled: true,
            directions: ['top', 'bottom', 'left', 'right'], // can be any direction or diagonal combination
            minWidth: 50,
            minHeight: 50,
            alwaysPreserveAspectRatio: true,
          } */
        })
      ],
      content: this.content(),
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        this.contentHtml.set(html);
        this.onContentChange.emit(html);
      },
      onCreate: ({ editor }) => {
        const html = editor.getHTML();
        this.contentHtml.set(html);
        this.onContentChange.emit(html);
      }
    });

    this.editor.set(newEditor);
  }

   ngOnDestroy(): void {
    this.editor()?.destroy();
  }

}
