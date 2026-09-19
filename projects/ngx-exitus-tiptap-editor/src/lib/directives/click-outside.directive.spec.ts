import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
  standalone: true,
  imports: [ClickOutsideDirective],
  template: `
    <div id="outside">Outside</div>
    <div clickOutside (clickOutside)="onOutsideClicked()" id="inside">Inside</div>
  `,
})
class TestHostComponent {
  outsideClicked = false;
  onOutsideClicked() {
    this.outsideClicked = true;
  }
}

describe('ClickOutsideDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should ignore first document click and not emit', () => {
    const outsideEl = fixture.nativeElement.querySelector('#outside') as HTMLElement;
    outsideEl.click();
    expect(hostComponent.outsideClicked).toBeFalse();
  });

  it('should emit clickOutside on second click if target is outside', () => {
    const outsideEl = fixture.nativeElement.querySelector('#outside') as HTMLElement;
    // First click consumes isFirstClick flag
    outsideEl.click();
    expect(hostComponent.outsideClicked).toBeFalse();

    // Second click triggers clickOutside
    outsideEl.click();
    expect(hostComponent.outsideClicked).toBeTrue();
  });

  it('should not emit clickOutside when click target is inside', () => {
    const insideEl = fixture.nativeElement.querySelector('#inside') as HTMLElement;
    // First click
    insideEl.click();
    expect(hostComponent.outsideClicked).toBeFalse();

    // Second click inside
    insideEl.click();
    expect(hostComponent.outsideClicked).toBeFalse();
  });
});
