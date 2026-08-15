import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitService } from '../../services/visit.service';
import { FidelizationReport } from '../../models/visit.model';

@Component({
  selector: 'app-fidelization-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fidelization-report.component.html',
  styleUrl: './fidelization-report.component.scss'
})
export class FidelizationReportComponent implements OnInit {
  private visitService = inject(VisitService);

  report = signal<FidelizationReport | null>(null);
  isLoading = signal(false);
  selectedDateRange = signal<'month' | 'quarter' | 'year'>('month');
  startDate = signal(this.getMonthStartDate());
  endDate = signal(new Date());

  ngOnInit() {
    this.loadReport();
  }

  /**
   * Load fidelization report
   */
  async loadReport() {
    this.isLoading.set(true);
    try {
      const reportData = await this.visitService.generateFidelizationReport();
      this.report.set(reportData);
      console.log('✓ Reporte de fidelización cargado');
    } catch (error: any) {
      console.error('✗ Error loading report:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load report by date range
   */
  async loadReportByDateRange() {
    this.isLoading.set(true);
    try {
      const reportData = await this.visitService.getReportByDateRange(
        this.startDate(),
        this.endDate()
      );
      this.report.set(reportData);
      console.log('✓ Reporte por rango de fechas cargado');
    } catch (error: any) {
      console.error('✗ Error loading report by date range:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Set date range based on selected option
   */
  setDateRange(range: 'month' | 'quarter' | 'year') {
    this.selectedDateRange.set(range);
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'month':
        startDate = this.getMonthStartDate();
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    this.startDate.set(startDate);
    this.endDate.set(now);
    this.loadReportByDateRange();
  }

  /**
   * Get start of current month
   */
  private getMonthStartDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Handle start date change
   */
  onStartDateChange(event: any) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.startDate.set(new Date(value));
    }
  }

  /**
   * Handle end date change
   */
  onEndDateChange(event: any) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.endDate.set(new Date(value));
    }
  }

  /**
   * Export report as CSV
   */
  exportToCSV() {
    const data = this.report();
    if (!data) return;

    let csv = 'Reporte de Fidelización\n';
    csv += `Período: ${data.period}\n\n`;
    csv += `Clientes Totales,${data.totalClients}\n`;
    csv += `Visitas Totales,${data.totalVisits}\n`;
    csv += `Promedio de Visitas por Cliente,${data.averageVisitsPerClient.toFixed(2)}\n\n`;
    csv += `Distribución por Tier\n`;
    csv += `Nuevos (1-2),${data.tierDistribution.new}\n`;
    csv += `Regulares (3-4),${data.tierDistribution.regular}\n`;
    csv += `Premium (5-9),${data.tierDistribution.premium}\n`;
    csv += `VIP (10+),${data.tierDistribution.vip}\n\n`;
    csv += `Ofertas Canjeadas\n`;
    csv += `Promociones Generales,${data.offerBreakdown.promo}\n`;
    csv += `Descuentos 5%,${data.offerBreakdown.discount_5}\n`;
    csv += `Productos Exclusivos,${data.offerBreakdown.exclusive_products}\n`;
    csv += `Cortes Gratis,${data.offerBreakdown.free_cut}\n`;
    csv += `Total Ofertas,${data.totalOffersRedeemed}\n\n`;
    csv += `Top 5 Clientes\n`;
    csv += `Nombre,Teléfono,Visitas\n`;
    data.topClients.forEach(client => {
      csv += `${client.name},${client.phone},${client.totalVisits}\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `reporte_fidelizacion_${new Date().toISOString().slice(0, 10)}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * Export report as JSON
   */
  exportToJSON() {
    const data = this.report();
    if (!data) return;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)));
    element.setAttribute('download', `reporte_fidelizacion_${new Date().toISOString().slice(0, 10)}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * Print report
   */
  printReport() {
    window.print();
  }
}
