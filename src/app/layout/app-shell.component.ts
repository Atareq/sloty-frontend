import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root visual shell for routed pages.
 *
 * Keep broad layout concerns here so feature pages can focus on their own UI.
 * Future navigation can be added here without rewriting every page component.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet],
  templateUrl: './app-shell.component.html'
})
export class AppShellComponent {}
