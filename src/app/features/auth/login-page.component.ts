import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppCardComponent } from '../../shared/components/app-card/app-card.component';

/**
 * Login page skeleton for Sprint 0.
 *
 * This page owns only visual structure and form state. Real authentication,
 * server validation, and token updates belong to a later sprint once the API
 * contract exists.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, AppButtonComponent, AppCardComponent],
  templateUrl: './login-page.component.html'
})
export class LoginPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  /**
   * Reactive forms keep field values and validation rules in TypeScript, while
   * the template focuses on rendering the current form state.
   */
  protected readonly loginForm = this.formBuilder.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  protected onSubmit(): void {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }
  }

  protected get identifierInvalid(): boolean {
    const control = this.loginForm.controls.identifier;

    return control.invalid && control.touched;
  }

  protected get passwordInvalid(): boolean {
    const control = this.loginForm.controls.password;

    return control.invalid && control.touched;
  }
}
