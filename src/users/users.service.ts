import {
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../common/auth.types.js';
import type { Env } from '../config/env.js';
import { User } from './user.entity.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Crea el admin inicial a partir de variables de entorno, si estan definidas y no existe */
  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!email || !password) return;
    if (await this.findByEmail(email)) return;

    await this.create(email, password, Role.Admin);
    this.logger.log('Usuario admin inicial creado');
  }

  findById(id: number): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.toLowerCase() });
  }

  /** Incluye el hash de la contrasena; solo para verificar el login */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async create(
    email: string,
    password: string,
    role: Role = Role.User,
  ): Promise<User> {
    if (await this.findByEmail(email)) {
      throw new ConflictException('El email ya esta registrado');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = this.users.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
    });
    const saved = await this.users.save(user);
    // Nunca devolvemos el hash, ni siquiera internamente
    const { passwordHash: _omit, ...safe } = saved;
    return safe as User;
  }
}
