import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout.component';
import { PublicServiceFormComponent } from './public/public-service-form/public-service-form.component';
import { VisitFormComponent } from './public/visit-form/visit-form.component';
import { VisitSuccessComponent } from './public/visit-success/visit-success.component';
import { ViewVisitsComponent } from './public/view-visits/view-visits.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'public/service-form',
    component: PublicServiceFormComponent
  },
  {
    path: 'public/visit-form',
    component: VisitFormComponent
  },
  {
    path: 'public/visit-success',
    component: VisitSuccessComponent
  },
  {
    path: 'public/view-visits',
    component: ViewVisitsComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'appointments',
        loadComponent: () => import('./appointments/appointments.component').then(m => m.AppointmentsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./services/service-list/service-list.component').then(m => m.ServiceListComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
