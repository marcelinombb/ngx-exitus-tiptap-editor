import { AfterContentInit, Component, ElementRef, contentChildren, inject, input, model, signal } from '@angular/core';
import { EditorButtonComponent } from './editor-button.component';
import { Observable, BehaviorSubject } from 'rxjs';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

export class EditorDropdownService {
    private isOpen = new BehaviorSubject<boolean>(false);

    setOpenState(isOpen: boolean) {
        this.isOpen.next(isOpen);
    }

    getOpenState(): Observable<boolean> {
        return this.isOpen.asObservable();
    }
}

@Component({
    standalone: true,
    selector: 'editor-dropdown',
    template: `
        <div class="ex-toolbar-dropdown" (clickOutside)="clickOutside()">
            <button 
                [class]="['ex-toolbar-button', 'btn', 'btn-' + currentIcon()]"
                [title]="title()"
                (click)="toggle()"
            >
                <span class="ex-btn-caret" [class.open]="open"></span>
            </button>
            @if(open) {
                <div class="ex-dropdown-menu " [class.vertical]="orientation() === 'vertical'" [class.horizontal]="orientation() === 'horizontal'">
                    <ng-content></ng-content>
                </div>
            }
        </div>
    `,
    styleUrls: ["editor-dropdown.component.scss", "../assets/icons/icons.css"],
    imports: [ClickOutsideDirective],
})
export class EditorDropdownComponent implements AfterContentInit {
    icon = input<string>();
    orientation = input<'vertical' | 'horizontal'>('vertical');
    open = false;
    currentIcon = signal('');
    title = model<string>('');
    updateIcon = input(true);
    editorDropdownService = inject(EditorDropdownService);

    readonly buttons = contentChildren(EditorButtonComponent, { descendants: true });
    readonly buttonEls = contentChildren(EditorButtonComponent, { read: ElementRef, descendants: true });

    ngAfterContentInit(): void {
        const buttons = this.buttons();


        this.editorDropdownService.getOpenState().subscribe(isOpen => {
            if (this.open !== isOpen) {
                this.open = isOpen;
            }
        });

        if (this.icon()) {
            this.setCurrentButton(this.icon()!, this.title());
        } else if (buttons && buttons.length > 0) {
            const first = buttons.at(0)!;
            this.setCurrentButton(first.icon()!, first.title());
        }

        if ((this.icon() === undefined) || this.updateIcon()) {
            buttons.forEach(btn => {
                btn.onClick.subscribe(() => {
                    console.log(btn.icon()!, btn.title());
                    this.setCurrentButton(btn.icon()!, btn.title());
                    this.open = false;
                })
            })
        }
    }

    private setCurrentButton(icon: string, title: string) {
        this.currentIcon.set(icon);
        this.title.set(title);
    }

    clickOutside() {
        this.open = false;
    }

    toggle() {
        const newState = !this.open;
        if (newState) {
            this.editorDropdownService.setOpenState(false);
        }
        this.open = newState;
    }

}



