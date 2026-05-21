import { Component } from '@angular/core';
import { AppCardComponent } from '../../shared/components/app-card/app-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

/**
 * Placeholder dashboard page for Sprint 0.
 *
 * Keep this page intentionally simple until real dashboard requirements,
 * permissions, and backend data are available.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [AppCardComponent, PageHeaderComponent, StatusChipComponent],
  templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent {}
