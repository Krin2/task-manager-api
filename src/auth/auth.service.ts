import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { AuthResponseDto, LoginDto, RegisterDto } from './dto/auth.dto.js';

// Hash valido de relleno para que el login tarde lo mismo exista o no el email (evita enumerar usuarios)
const DUMMY_HASH = bcrypt.hashSync('relleno-sin-uso', 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // El rol siempre es "user": nadie puede registrarse como admin desde la API
    const user = await this.users.create(dto.email, dto.password);
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    return this.issueToken(user);
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
