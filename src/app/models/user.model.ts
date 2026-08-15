export interface User {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  role: 'customer' | 'barber' | 'admin';
  profilePicture?: string;
  apiKey?: string; // API key for public service registration (for barbers)
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  error?: string;
}
