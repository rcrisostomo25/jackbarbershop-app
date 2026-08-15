import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitService } from '../../services/visit.service';
import { Visit } from '../../models/visit.model';

@Component({
  selector: 'app-view-visits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-visits.component.html',
  styleUrl: './view-visits.component.scss'
})
export class ViewVisitsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private visitService = inject(VisitService);

  clientPhone = signal<string>('');
  visits = signal<Visit[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  currentYear = new Date().getFullYear();

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['phone']) {
        this.clientPhone.set(params['phone']);
        this.loadVisits(params['phone']);
      } else {
        this.router.navigate(['/public/visit-form']);
      }
    });
  }

  private async loadVisits(phone: string) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const visits = await this.visitService.getClientVisits(phone);
      this.visits.set(visits.sort((a, b) => 
        new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      ));
    } catch (error) {
      console.error('Error loading visits:', error);
      this.errorMessage.set('Error al cargar las visitas. Por favor intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(date: any): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatTime(date: any): string {
    const d = new Date(date);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  goBackToRegister() {
    this.router.navigate(['/public/visit-form']);
  }

  registerNewVisit() {
    this.router.navigate(['/public/visit-form']);
  }

  getTotalVisits(): number {
    return this.visits().length;
  }

  getLastVisit(): Visit | undefined {
    const visitList = this.visits();
    return visitList.length > 0 ? visitList[0] : undefined;
  }

  getDaysSinceLastVisit(): number {
    const lastVisit = this.getLastVisit();
    if (!lastVisit) return -1;
    
    const last = new Date(lastVisit.visitDate).getTime();
    const now = new Date().getTime();
    return Math.floor((now - last) / (1000 * 60 * 60 * 24));
  }
}
