import { Component, effect, ElementRef, input, output, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorToolbarComponent } from './components/editor-toolbar.component';

@Component({
  selector: 'exitus-tiptap-editor',
  imports: [EditorToolbarComponent],
  template: `
    <div class="exitus-tiptap-editor">
      @if(editorInstance) {
        <editor-toolbar [editor]="editorInstance"></editor-toolbar>
      }
      <div class="editor-scroller">
        <div #editor class="editor-main"></div>
      </div>
    </div>
  `,
  styleUrls: ['./exitus-tiptap-editor.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ExitusTiptapEditor {

  private editorElement = viewChild.required<ElementRef>('editor');
  private tiptapEditor = signal<Editor | null>(null);
  private contentHtml = signal<string>("");

  content = input<string>('<p>Hello World!</p>');

  onContentChange = output<string>();

  constructor() {

    effect(() => {
      const content = this.content();
      if (this.tiptapEditor() && content !== this.tiptapEditor()!.getHTML()) {
        this.setContent(content);
      }
    });
  }

  setContent(newContent: string) {
    if (this.tiptapEditor()) {
      this.tiptapEditor()!.commands.setContent(newContent);
    }
  }

  get editorInstance(): Editor | null {
    return this.tiptapEditor();
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  private initializeEditor() {
    const newEditor = new Editor({
      element: this.editorElement().nativeElement,
      extensions: [
        StarterKit,
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

    this.tiptapEditor.set(newEditor);
  }

}
