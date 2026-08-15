export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment {
  id?: string;
  barberId: string;
  barberName: string;
  clientName: string;
  clientPhone: string;
  appointmentDate: Date; // Fecha de la cita
  appointmentTime: string; // HH:mm formato
  cutType?: string; // Tipo de corte (opcional)
  status: AppointmentStatus; // scheduled, completed, cancelled
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // ID del admin que registró
}

export interface AppointmentResponse {
  success: boolean;
  message: string;
  data?: Appointment;
  error?: string;
}

export interface AppointmentFilter {
  barberId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AppointmentStatus;
}

export interface CalendarDay {
  date: Date;
  dayOfWeek: string;
  appointments: Appointment[];
  appointmentCount: number;
}

export interface BarberSchedule {
  barberId: string;
  barberName: string;
  appointments: Appointment[];
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}
