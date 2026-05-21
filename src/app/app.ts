import { Component } from '@angular/core';
import { AppShellComponent } from './layout/app-shell.component';

/**
 * Root Angular component for Sloty.
 *
 * Angular 21 components are standalone by default. The `imports` array declares
 * which components/directives this template can use without creating an NgModule.
 */
@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
