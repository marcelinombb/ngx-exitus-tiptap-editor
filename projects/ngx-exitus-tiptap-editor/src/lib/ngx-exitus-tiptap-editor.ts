import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

@Component({
  selector: 'lib-ngx-exitus-tiptap-editor',
  imports: [],
  template: `
    <div #editor></div>
    {{ contentHtml() }}
  `,
  styles: ``,
})
export class NgxExitusTiptapEditor {

  private editorElement = viewChild.required<ElementRef>('editor');
  private tiptapEditor = signal<Editor | null>(null);
  protected contentHtml = signal<string>("");

  content = input<string>('<p>Hello World!</p>');

  onContentChange = output<string>();

  constructor() {

    effect(() => {
      const content = this.content();
      if(this.tiptapEditor() && content !== this.tiptapEditor()!.getHTML()) {
        this.setContent(content);
      }
    });

  }

  setContent(newContent: string) {
    if(this.tiptapEditor()) {
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
      }
    });

    this.tiptapEditor.set(newEditor);
  }

}
