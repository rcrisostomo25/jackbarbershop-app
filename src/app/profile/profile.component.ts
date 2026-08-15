import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <h2>👤 Mi Perfil</h2>
      <p>Módulo de perfil en desarrollo...</p>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 20px;
      h2 {
        color: #333;
        margin-bottom: 15px;
      }
      p {
        color: #666;
        font-size: 14px;
      }
    }
  `]
})
export class ProfileComponent {}
