export enum Role {
  User = 'user',
  Admin = 'admin',
}

/** Datos del usuario autenticado que viajan en el JWT y en `request.user` */
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest {
  user: AuthUser;
}
