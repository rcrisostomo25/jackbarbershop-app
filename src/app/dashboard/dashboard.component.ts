import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  showMenu = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
  }

  ngOnInit() {
    // Verify user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  async logout() {
    const response = await this.authService.logout();
    if (response.success) {
      this.router.navigate(['/login']);
    }
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'customer': '👤 Cliente',
      'barber': '✂️ Barbero',
      'admin': '⚙️ Administrador'
    };
    return labels[role] || role;
  }

  getRoleIcon(role: string): string {
    const icons: { [key: string]: string } = {
      'customer': 'person',
      'barber': 'scissors',
      'admin': 'admin_panel_settings'
    };
    return icons[role] || 'person';
  }

  toggleMenu() {
    this.showMenu.set(!this.showMenu());
  }

  goToAdminPanel() {
    this.router.navigate(['/admin']);
  }
}
