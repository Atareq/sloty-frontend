import { Component, input } from '@angular/core';

export type StatusChipTone =
  | 'neutral'
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'expired';

/**
 * Small reusable status label.
 *
 * Status chips make booking/payment states scannable. The component only owns
 * visual tone mapping; feature pages decide which status label is correct.
 */
@Component({
  selector: 'app-status-chip',
  templateUrl: './status-chip.component.html'
})
export class StatusChipComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusChipTone>('neutral');
}
