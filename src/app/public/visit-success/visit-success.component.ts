import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-visit-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visit-success.component.html',
  styleUrl: './visit-success.component.scss'
})
export class VisitSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  clientPhone = signal<string>('');
  currentYear = new Date().getFullYear();

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['phone']) {
        this.clientPhone.set(params['phone']);
      }
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  goToViewVisits() {
    if (this.clientPhone()) {
      this.router.navigate(['/public/view-visits'], { 
        queryParams: { phone: this.clientPhone() } 
      });
    }
  }

  goToRegisterAgain() {
    this.router.navigate(['/public/visit-form']);
  }

  goToHome() {
    this.router.navigate(['/public/visit-form']);
  }
}
