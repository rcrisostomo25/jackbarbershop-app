import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="appointments-container">
      <h2>📅 Mis Citas</h2>
      <p>Módulo de agendamiento en desarrollo...</p>
    </div>
  `,
  styles: [`
    .appointments-container {
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
export class AppointmentsComponent {}
