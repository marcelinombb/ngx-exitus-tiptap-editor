import { Directive, ElementRef, inject, output } from "@angular/core";

@Directive({
    selector: '[clickOutside]',
    host: {
        '(document:click)': 'close($event)',
    },
})
export class ClickOutsideDirective {
    clickOutside = output<void>();
    private readonly elementRef = inject(ElementRef);
    private isFirstClick = true;

    protected close(e: Event) {
        if (this.isFirstClick) {
            this.isFirstClick = false;
            return;
        }

        if (!this.elementRef.nativeElement.contains(e.target)) {
            this.clickOutside.emit();
        }
    }
}