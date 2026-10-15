import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { VisitService } from '../../services/visit.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-visit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './visit-form.component.html',
  styleUrl: './visit-form.component.scss'
})
export class VisitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private visitService = inject(VisitService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);

  form!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  submitted = signal(false);
  clientcode = signal<string | null>(null);
  preloadedClient = signal<User | null>(null);
  isLoadingClient = signal(false);
  isNewClientCode = signal(false); // Tracks if clientcode doesn't exist in DB yet
  isSearchingPhone = signal(false); // Tracks if currently searching by phone
  clientFoundByPhone = signal<User | null>(null); // Client found via phone search
  isNameEditable = signal(true); // Controls whether name field should be editable

  serviceOptions = [
    'Jack Básico',
    'Jack Moderno',
    'Jack Vip',
    'Jack Premium'
  ];
  barberName = signal<string | null>(null);

  ngOnInit() {
    this.initializeForm();

    // Reset client found state when phone changes
    this.form.get('clientPhone')?.valueChanges.subscribe(() => {
      this.clientFoundByPhone.set(null);
      this.isNameEditable.set(true);
      this.successMessage.set('');
    });

    // Get clientcode and barberName from URL params
    this.route.queryParams.subscribe(async params => {
      // Capture barberName if provided in URL
      if (params['barberName']) {
        this.barberName.set(params['barberName']);
        console.log('✓ Barber name recibido de URL:', params['barberName']);
      }

      if (params['clientcode']) {
        this.clientcode.set(params['clientcode']);
        console.log('✓ Clientcode recibido de URL:', params['clientcode']);
        
        // Load client data from clientcode
        await this.loadClientByCode(params['clientcode']);
      }
    });
  }

  private initializeForm() {
    this.form = this.fb.group({
      clientPhone: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]], // Teléfono primero
      clientName: ['', [Validators.required, Validators.minLength(3)]],
      service: ['', [Validators.required]], // Nueva opción de servicio
      visitKey: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4), Validators.pattern(/^\d+$/)]]
    });
  }

  /**
   * Load client data by clientcode and pre-populate form
   * If clientcode doesn't exist, mark as isNewClientCode for later creation
   */
  private async loadClientByCode(code: string) {
    this.isLoadingClient.set(true);
    this.errorMessage.set('');

    try {
      const client = await this.userService.getUserByClientCode(code);

      if (client) {
        // Client found - pre-populate form fields
        this.preloadedClient.set(client);
        this.isNameEditable.set(false); // Block editing - client was preloaded
        this.isNewClientCode.set(false);
        this.form.patchValue({
          clientName: client.displayName,
          clientPhone: client.phone
        });
        
        // Mark fields as touched so they don't show validation errors initially
        this.form.get('clientName')?.markAsTouched();
        this.form.get('clientPhone')?.markAsTouched();

        console.log('✓ Cliente pre-cargado desde clientcode:', code, client.displayName);
      } else {
        // Client not found with this code - mark as new code to be created
        this.preloadedClient.set(null);
        this.isNameEditable.set(true); // Enable editing - new customer
        this.isNewClientCode.set(true);
        console.log('⚠ Clientcode no existe en BD, se creará nuevo cliente con code:', code);
        // Allow manual entry of name and phone
      }
    } catch (error: any) {
      console.error('✗ Error al buscar cliente por clientcode:', error);
      this.isNameEditable.set(true); // Enable on error
      this.isNewClientCode.set(true);
      // Don't show error, allow manual entry
    } finally {
      this.isLoadingClient.set(false);
    }
  }

  /**
   * Search for client by phone number
   * If found: auto-populate name and make it readonly
   * If not found: enable name field for new customer entry
   */
  async searchClientByPhone() {
    const phoneControl = this.form.get('clientPhone');
    const nameControl = this.form.get('clientName');
    
    if (!phoneControl || !phoneControl.valid) {
      this.errorMessage.set('Por favor ingresa un número de teléfono válido (mínimo 7 dígitos)');
      return;
    }

    const phone = phoneControl.value.trim();
    this.isSearchingPhone.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      console.log('🔍 Buscando cliente por teléfono:', phone);
      const client = await this.userService.getUserByPhone(phone);

      if (client) {
        // Client found - auto-populate name (keep enabled so value is saved)
        console.log('✅ Cliente encontrado:', client.displayName);
        this.clientFoundByPhone.set(client);
        this.isNameEditable.set(false); // Block editing - client was found
        nameControl?.patchValue(client.displayName);
        nameControl?.markAsTouched();
        nameControl?.setErrors(null);
        console.log('📝 Nombre guardado en control:', nameControl?.value);
        this.successMessage.set(`✅ Cliente encontrado: ${client.displayName}`);
      } else {
        // Client not found - clear and prepare for new entry
        console.log('ℹ️ No se encontró cliente con este teléfono. Nuevo cliente.');
        this.clientFoundByPhone.set(null);
        this.isNameEditable.set(true); // Enable editing - new customer
        nameControl?.patchValue('');
        nameControl?.markAsUntouched();
        nameControl?.setErrors(null);  // Clear any validation errors
        console.log('✅ Campo nombre habilitado para nuevo cliente. Control state:', {
          value: nameControl?.value,
          disabled: nameControl?.disabled,
          errors: nameControl?.errors,
          isNameEditable: this.isNameEditable()
        });
        this.successMessage.set('ℹ️ Número no registrado. Ingresa el nombre para crear nuevo cliente.');
      }
    } catch (error: any) {
      console.error('✗ Error al buscar cliente por teléfono:', error);
      this.errorMessage.set('Error al buscar el cliente. Por favor intenta nuevamente.');
    } finally {
      this.isSearchingPhone.set(false);
    }
  }

  async onSubmit() {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.form.valid) {
      this.errorMessage.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.isLoading.set(true);

    try {
      const { visitKey, clientName, clientPhone, service } = this.form.value;

      // Validate visit key
      const isValidKey = await this.visitService.validateVisitKey(visitKey);
      if (!isValidKey) {
        this.errorMessage.set('❌ Clave de acceso inválida. Por favor verifica los 4 dígitos.');
        this.isLoading.set(false);
        return;
      }

      // Register visit with clientcode if available
      // Pass isNewClientCode flag so service knows to create new customer with this code
      const response = await this.visitService.registerVisit(
        {
          clientName,
          clientPhone,
          service,
          barberName: this.barberName() || undefined,
          visitDate: new Date(),
          servicePerformed: 'Visita registrada desde portal público',
          createdAt: new Date()
        },
        this.clientcode() || undefined,
        this.isNewClientCode() // Flag indicating if clientcode is new (doesn't exist in DB)
      );

      if (!response.success) {
        this.errorMessage.set(response.message || 'Error al registrar la visita');
        this.isLoading.set(false);
        return;
      }

      // Navigate to success page with phone and clientcode (if applicable)
      const queryParams: any = { phone: clientPhone };
      if (this.clientcode()) {
        queryParams.clientcode = this.clientcode();
      }

      this.router.navigate(['/public/visit-success'], { queryParams });
    } catch (error: any) {
      console.error('Error registering visit:', error);
      this.errorMessage.set('Error al registrar la visita. Por favor intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetForm() {
    this.form.reset();
    this.submitted.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
