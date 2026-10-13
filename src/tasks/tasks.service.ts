import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser, Role } from '../common/auth.types.js';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  PaginatedTasksDto,
  UpdateTaskDto,
} from './dto/task.dto.js';
import { Task } from './task.entity.js';

const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  create(user: AuthUser, dto: CreateTaskDto): Promise<Task> {
    // Campos explicitos: ownerId siempre sale del token, nunca del cuerpo
    const task = this.tasks.create({
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      dueDate: dto.dueDate,
      ownerId: user.id,
    });
    return this.tasks.save(task);
  }

  /** Un usuario ve solo sus tareas; el admin ve las de todos */
  async findAll(
    user: AuthUser,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasksDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;

    const qb = this.tasks.createQueryBuilder('task');
    if (user.role !== Role.Admin) {
      qb.where('task.ownerId = :ownerId', { ownerId: user.id });
    }
    if (query.status)
      qb.andWhere('task.status = :status', { status: query.status });
    if (query.priority)
      qb.andWhere('task.priority = :priority', { priority: query.priority });
    if (query.search) {
      // Parametrizado: el texto del usuario nunca se concatena en el SQL
      // En PostgreSQL la barra invertida es el escape por defecto de LIKE
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        {
          search: `%${escapeLike(query.search)}%`,
        },
      );
    }

    // sortBy esta validado contra una lista cerrada en el DTO, por eso es seguro usarlo como columna
    qb.orderBy(`task.${query.sortBy ?? 'createdAt'}`, query.order ?? 'DESC')
      .addOrderBy('task.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** 404 tambien cuando la tarea es de otro usuario: no revela que existe */
  async findOne(user: AuthUser, id: number): Promise<Task> {
    const where = user.role === Role.Admin ? { id } : { id, ownerId: user.id };
    const task = await this.tasks.findOneBy(where);
    if (!task) throw new NotFoundException('Tarea no encontrada');
    return task;
  }

  async update(user: AuthUser, id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(user, id);
    Object.assign(task, dto);
    return this.tasks.save(task);
  }

  async remove(user: AuthUser, id: number): Promise<void> {
    const task = await this.findOne(user, id);
    await this.tasks.remove(task);
  }
}

/** Escapa los comodines de LIKE para que "%" o "_" se busquen como texto literal */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
