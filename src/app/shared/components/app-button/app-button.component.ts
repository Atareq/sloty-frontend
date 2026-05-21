import { booleanAttribute, Component, input } from '@angular/core';

export type AppButtonType = 'button' | 'submit' | 'reset';
export type AppButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Shared Sloty button.
 *
 * Use this for common page actions so spacing, focus states, and mobile tap
 * size stay consistent across features. Keep action behavior in the parent
 * page/component.
 */
@Component({
  selector: 'app-button',
  host: {
    '[class.block]': 'fullWidth()'
  },
  templateUrl: './app-button.component.html'
})
export class AppButtonComponent {
  readonly type = input<AppButtonType>('button');
  readonly variant = input<AppButtonVariant>('primary');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
}
