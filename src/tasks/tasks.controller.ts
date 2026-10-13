import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../common/auth.types.js';
import { CurrentUser } from '../common/decorators.js';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  PaginatedTasksDto,
  TaskResponseDto,
  UpdateTaskDto,
} from './dto/task.dto.js';
import type { Task } from './task.entity.js';
import { TasksService } from './tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, invalido o expirado' })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una tarea propia' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasks.create(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista tareas con filtros, busqueda, orden y paginacion',
    description: 'Un usuario ve sus tareas; un admin ve las de todos.',
  })
  @ApiOkResponse({ type: PaginatedTasksDto })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTasksQueryDto,
  ): Promise<PaginatedTasksDto> {
    return this.tasks.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una tarea' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'No existe o pertenece a otro usuario' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Task> {
    return this.tasks.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza parcialmente una tarea' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'No existe o pertenece a otro usuario' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasks.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una tarea' })
  @ApiNoContentResponse({ description: 'Tarea eliminada' })
  @ApiNotFoundResponse({ description: 'No existe o pertenece a otro usuario' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.tasks.remove(user, id);
  }
}
