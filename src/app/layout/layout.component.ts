import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  showMenu = signal(false);

  constructor() {
    effect(() => {
      this.authService.currentUser$.subscribe(user => {
        this.currentUser.set(user);
      });
    });
  }

  toggleMenu() {
    this.showMenu.set(!this.showMenu());
  }

  closeMenu() {
    this.showMenu.set(false);
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'admin': '👨‍💼 Administrador',
      'barber': '💇 Barbero',
      'customer': '👤 Cliente'
    };
    return labels[role] || role;
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
