import { Component, signal } from '@angular/core';
import { ExitusTiptapEditor } from 'ngx-exitus-tiptap-editor';


@Component({
  selector: 'app-root',
  imports: [ExitusTiptapEditor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  onContentChange($event: string) {
    console.log('Content changed:', $event);
  }
  protected readonly title = signal('my-workspace');
}
