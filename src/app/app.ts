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
    console.log($event);
    
  }

  
  protected readonly title = signal('my-workspace');

  defaultText = `<figure class="ex-image-wrapper ex-image-block-middle tiptap-widget" style="width: 555px;"><img src="https://fastly.picsum.photos/id/237/536/354.jpg?hmac=i0yVXW1ORpyCZpQ-CknuyV-jbtU7_x9EBQVhvT5aRr0" style="display: table-cell;"><figcaption>asdsddddddddddddddddddddas</figcaption></figure><p style="margin-left: 0px !important;">oijkljlkjlkjlkjlkjljlkjlkjlkjlkj</p>`

}
