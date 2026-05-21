import { Component, input } from '@angular/core';

export type AppCardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Reusable white surface for grouping related UI.
 *
 * Keep this component presentational. It should frame content consistently, but
 * should not fetch data or contain Sloty business rules.
 */
@Component({
  selector: 'app-card',
  host: {
    class: 'block'
  },
  templateUrl: './app-card.component.html'
})
export class AppCardComponent {
  readonly padding = input<AppCardPadding>('md');
}
