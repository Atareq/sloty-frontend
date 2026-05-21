import { Component, input } from '@angular/core';

/**
 * Reusable page title block.
 *
 * Feature pages can use this to present a consistent Arabic heading,
 * supporting text, and optional eyebrow without recreating layout markup.
 */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html'
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly description = input<string>('');
}
