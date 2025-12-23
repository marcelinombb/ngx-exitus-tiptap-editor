import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxExitusTiptapEditor } from 'ngx-exitus-tiptap-editor';

@Component({
  selector: 'app-root',
  imports: [NgxExitusTiptapEditor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('my-workspace');
}
