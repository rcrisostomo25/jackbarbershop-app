import { Component, OnInit, signal, inject, computed, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { Appointment } from '../../models/appointment.model';
import { User } from '../../models/user.model';
import { AppointmentFormComponent } from '../appointment-form/appointment-form.component';

@Component({
  selector: 'app-appointment-list',
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
  imports: [CommonModule, FormsModule, AppointmentFormComponent],
  templateUrl: './appointment-list.component.html',
  styleUrl: './appointment-list.component.scss'
})
export class AppointmentListComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  // Signals
  appointments = signal<Appointment[]>([]);
  barbers = signal<User[]>([]);
  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  selectedBarberId = signal('');
  currentMonth = signal(new Date());
  
  // UI State
  showAppointmentForm = signal(false);
  isEditMode = signal(false);
  editingAppointmentId = signal<string | null>(null);
  formData = signal<any>({
    barberId: '',
    barberName: '',
    clientName: '',
    clientPhone: '',
    appointmentDate: new Date(),
    appointmentTime: '09:00',
    cutType: '',
    status: 'scheduled',
    notes: ''
  });

  // Calendar signals
  calendarDays = computed(() => this.generateCalendarDays());
  appointmentsByDate = computed(() => this.groupAppointmentsByDate());

  ngOnInit() {
    this.currentUser.set(this.authService.getCurrentUser());
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadAppointments(),
        this.loadBarbers()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadAppointments() {
    const user = this.currentUser();
    if (!user) return;

    let appointmentList: Appointment[] = [];
    if (user.role === 'admin') {
      appointmentList = await this.appointmentService.getAppointments();
    } else if (user.role === 'barber') {
      appointmentList = await this.appointmentService.getBarberAppointments(user.id!);
    }

    this.appointments.set(appointmentList);
  }

  private async loadBarbers() {
    const barbersList = await this.adminService.getAllBarbers();
    this.barbers.set(barbersList);
  }

  generateCalendarDays(): Date[] {
    const year = this.currentMonth().getFullYear();
    const month = this.currentMonth().getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add empty days for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -(startingDayOfWeek - 1 - i)));
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add empty days for days after month ends
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }

  groupAppointmentsByDate(): Map<string, Appointment[]> {
    const map = new Map<string, Appointment[]>();
    
    this.appointments().forEach(apt => {
      const dateKey = this.getDateKey(apt.appointmentDate);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(apt);
    });

    return map;
  }

  getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getAppointmentsForDate(date: Date): Appointment[] {
    const dateKey = this.getDateKey(date);
    const appts = this.appointmentsByDate().get(dateKey) || [];
    
    // If barber, filter by their own appointments
    const user = this.currentUser();
    if (user?.role === 'barber') {
      return appts.filter(apt => apt.barberId === user.id);
    }

    return appts;
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth().getMonth();
  }

  isTodayDate(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getDayOfWeekName(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  }

  getMonthName(): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[this.currentMonth().getMonth()]} ${this.currentMonth().getFullYear()}`;
  }

  previousMonth() {
    const date = new Date(this.currentMonth());
    date.setMonth(date.getMonth() - 1);
    this.currentMonth.set(date);
  }

  nextMonth() {
    const date = new Date(this.currentMonth());
    date.setMonth(date.getMonth() + 1);
    this.currentMonth.set(date);
  }

  openAppointmentForm(date?: Date) {
    if (this.currentUser()?.role !== 'admin') return;
    
    this.isEditMode.set(false);
    this.editingAppointmentId.set(null);
    this.formData.set({
      barberId: '',
      barberName: '',
      clientName: '',
      clientPhone: '',
      appointmentDate: date || new Date(),
      appointmentTime: '09:00',
      cutType: '',
      status: 'scheduled',
      notes: ''
    });
    this.showAppointmentForm.set(true);
  }

  openEditAppointmentModal(appointment: Appointment) {
    if (this.currentUser()?.role !== 'admin') return;

    this.isEditMode.set(true);
    this.editingAppointmentId.set(appointment.id!);
    this.formData.set({
      id: appointment.id,
      barberId: appointment.barberId,
      barberName: appointment.barberName,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      cutType: appointment.cutType || '',
      status: appointment.status,
      notes: appointment.notes || ''
    });
    this.showAppointmentForm.set(true);
  }

  async deleteAppointment(appointmentId: string, clientName: string) {
    if (this.currentUser()?.role !== 'admin') return;
    
    if (!confirm(`¿Estás seguro de que deseas eliminar la cita de ${clientName}?`)) return;

    this.isLoading.set(true);
    try {
      const response = await this.appointmentService.deleteAppointment(appointmentId);
      if (response.success) {
        await this.loadAppointments();
      } else {
        alert(response.message);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  closeAppointmentForm() {
    this.showAppointmentForm.set(false);
  }

  onAppointmentSaved(appointment: Appointment) {
    this.showAppointmentForm.set(false);
    this.loadAppointments();
  }

  formatTime(time: string): string {
    return time; // Already in HH:mm format
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
