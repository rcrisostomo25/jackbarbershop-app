export interface User {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  role: 'customer' | 'barber' | 'admin';
  profilePicture?: string;
  apiKey?: string; // API key for public service registration (for barbers)
  clientcode?: string; // Client code for customer registration (format: C00001) - for customers only
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  error?: string;
}
