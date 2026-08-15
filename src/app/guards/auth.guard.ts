import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private router = inject(Router);
  private firebaseAuth = inject(Auth);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Use authState Observable from AngularFire which provides auth state changes
    return authState(this.firebaseAuth).pipe(
      take(1),
      map((user) => {
        if (user) {
          // User is authenticated, allow access
          return true;
        } else {
          // User not authenticated, redirect to login
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return false;
        }
      })
    );
  }
}
