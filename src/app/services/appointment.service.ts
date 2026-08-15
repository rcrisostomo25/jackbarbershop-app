import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, QueryConstraint, Timestamp, updateDoc, orderBy } from '@angular/fire/firestore';
import { Appointment, AppointmentResponse, AppointmentFilter, BarberSchedule } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private firestore = inject(Firestore);
  private appointmentsCollection = 'appointments';
  private usersCollection = 'users';

  /**
   * Create a new appointment
   */
  async createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppointmentResponse> {
    try {
      const appointmentsRef = collection(this.firestore, this.appointmentsCollection);
      const appointmentData = {
        ...appointment,
        appointmentDate: Timestamp.fromDate(new Date(appointment.appointmentDate)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Remove undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(appointmentData).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(appointmentsRef, cleanData);
      console.log('✓ Cita registrada:', docRef.id);

      return {
        success: true,
        message: 'Cita registrada exitosamente',
        data: { ...appointment, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as Appointment
      };
    } catch (error: any) {
      console.error('✗ Error creating appointment:', error);
      return {
        success: false,
        message: 'Error al registrar la cita',
        error: error.message
      };
    }
  }

  /**
   * Get all appointments
   */
  async getAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, this.appointmentsCollection);
      const q = query(appointmentsRef, orderBy('appointmentDate', 'asc'));
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        appointments.push({
          id: doc.id,
          barberId: data.barberId,
          barberName: data.barberName,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          appointmentDate: data.appointmentDate?.toDate() || new Date(),
          appointmentTime: data.appointmentTime,
          cutType: data.cutType,
          status: data.status || 'scheduled',
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as Appointment);
      });

      return appointments;
    } catch (error: any) {
      console.error('✗ Error fetching appointments:', error);
      return [];
    }
  }

  /**
   * Get appointments for a specific barber
   */
  async getBarberAppointments(barberId: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, this.appointmentsCollection);
      const q = query(appointmentsRef, where('barberId', '==', barberId), orderBy('appointmentDate', 'asc'));
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        appointments.push({
          id: doc.id,
          barberId: data.barberId,
          barberName: data.barberName,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          appointmentDate: data.appointmentDate?.toDate() || new Date(),
          appointmentTime: data.appointmentTime,
          cutType: data.cutType,
          status: data.status || 'scheduled',
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as Appointment);
      });

      return appointments;
    } catch (error: any) {
      console.error('✗ Error fetching barber appointments:', error);
      return [];
    }
  }

  /**
   * Get appointments by date range
   */
  async getAppointmentsByDateRange(startDate: Date, endDate: Date, barberId?: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, this.appointmentsCollection);
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);

      let constraints: QueryConstraint[] = [
        where('appointmentDate', '>=', startTimestamp),
        where('appointmentDate', '<=', endTimestamp),
        orderBy('appointmentDate', 'asc')
      ];

      if (barberId) {
        constraints = [where('barberId', '==', barberId), ...constraints];
      }

      const q = query(appointmentsRef, ...constraints);
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        appointments.push({
          id: doc.id,
          barberId: data.barberId,
          barberName: data.barberName,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          appointmentDate: data.appointmentDate?.toDate() || new Date(),
          appointmentTime: data.appointmentTime,
          cutType: data.cutType,
          status: data.status || 'scheduled',
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as Appointment);
      });

      return appointments;
    } catch (error: any) {
      console.error('✗ Error fetching appointments by date range:', error);
      return [];
    }
  }

  /**
   * Update an appointment
   */
  async updateAppointment(appointmentId: string, appointment: Partial<Appointment>): Promise<AppointmentResponse> {
    try {
      const appointmentRef = doc(this.firestore, this.appointmentsCollection, appointmentId);
      const updateData: any = {
        updatedAt: Timestamp.now()
      };

      // Only update fields that are provided and not undefined
      if (appointment.barberId) {
        updateData.barberId = appointment.barberId;
      }
      if (appointment.barberName) {
        updateData.barberName = appointment.barberName;
      }
      if (appointment.clientName) {
        updateData.clientName = appointment.clientName;
      }
      if (appointment.clientPhone) {
        updateData.clientPhone = appointment.clientPhone;
      }
      if (appointment.appointmentDate) {
        const dateToConvert = appointment.appointmentDate instanceof Date 
          ? appointment.appointmentDate 
          : new Date(appointment.appointmentDate);
        updateData.appointmentDate = Timestamp.fromDate(dateToConvert);
      }
      if (appointment.appointmentTime) {
        updateData.appointmentTime = appointment.appointmentTime;
      }
      if (appointment.cutType) {
        updateData.cutType = appointment.cutType;
      }
      if (appointment.status) {
        updateData.status = appointment.status;
      }
      if (appointment.notes) {
        updateData.notes = appointment.notes;
      }

      await updateDoc(appointmentRef, updateData);
      console.log('✓ Cita actualizada:', appointmentId);

      return {
        success: true,
        message: 'Cita actualizada exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error updating appointment:', error);
      return {
        success: false,
        message: 'Error al actualizar la cita',
        error: error.message
      };
    }
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(appointmentId: string): Promise<AppointmentResponse> {
    try {
      const appointmentRef = doc(this.firestore, this.appointmentsCollection, appointmentId);
      await deleteDoc(appointmentRef);
      console.log('✓ Cita eliminada:', appointmentId);

      return {
        success: true,
        message: 'Cita eliminada exitosamente'
      };
    } catch (error: any) {
      console.error('✗ Error deleting appointment:', error);
      return {
        success: false,
        message: 'Error al eliminar la cita',
        error: error.message
      };
    }
  }

  /**
   * Get barber schedule for a specific date
   */
  async getBarberScheduleForDate(barberId: string, date: Date): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(this.firestore, this.appointmentsCollection);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        appointmentsRef,
        where('barberId', '==', barberId),
        where('appointmentDate', '>=', Timestamp.fromDate(startOfDay)),
        where('appointmentDate', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('appointmentDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        appointments.push({
          id: doc.id,
          barberId: data.barberId,
          barberName: data.barberName,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          appointmentDate: data.appointmentDate?.toDate() || new Date(),
          appointmentTime: data.appointmentTime,
          cutType: data.cutType,
          status: data.status || 'scheduled',
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as Appointment);
      });

      return appointments;
    } catch (error: any) {
      console.error('✗ Error fetching barber schedule:', error);
      return [];
    }
  }
}
