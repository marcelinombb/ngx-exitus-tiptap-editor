import { Component, signal, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ExitusTiptapEditor } from 'ngx-exitus-tiptap-editor';

@Component({
  selector: 'app-root',
  imports: [ExitusTiptapEditor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private sanitizer = inject(DomSanitizer);
  htmlContent = signal<SafeHtml>('');

  onContentChange($event: string) {
    //console.log($event);
    localStorage.setItem('defaultText', $event);
    this.htmlContent.set(this.sanitizer.bypassSecurityTrustHtml($event));
  }

  defaultText = `<img src="https://images.unsplash.com/photo-1765707886460-3059e2fec28f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Gráfico, Diagrama O conteúdo gerado por IA pode estar incorreto." width="441" height="188"><p><img src="https://images.unsplash.com/photo-1765707886460-3059e2fec28f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Gráfico, Diagrama O conteúdo gerado por IA pode estar incorreto." width="441" height="188"></p>`

  //defaultText = '';

  ngOnInit() {

    if (localStorage.getItem('defaultText')) {
      this.defaultText = localStorage.getItem('defaultText')!;
    }

  }

}

