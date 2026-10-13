import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataType, newDb } from 'pg-mem';
import { DataSource } from 'typeorm';
import { Task } from '../src/tasks/task.entity.js';
import { User } from '../src/users/user.entity.js';

/**
 * Sustituye a DatabaseModule en los tests e2e: usa pg-mem (PostgreSQL en memoria),
 * asi la suite corre sin Docker ni base de datos instalada.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        entities: [User, Task],
        synchronize: true,
        retryAttempts: 1, // si falla, que falle rapido en vez de reintentar
      }),
      dataSourceFactory: async (options) => {
        const db = newDb();
        db.public.registerFunction({
          name: 'current_database',
          returns: DataType.text,
          implementation: () => 'test',
        });
        db.public.registerFunction({
          name: 'version',
          returns: DataType.text,
          implementation: () => 'PostgreSQL 16.0 (pg-mem)',
        });
        // Funciones que TypeORM consulta al sincronizar el esquema y que pg-mem no trae
        db.public.registerFunction({
          name: 'quote_ident',
          args: [DataType.text],
          returns: DataType.text,
          implementation: (value: string) => `"${value}"`,
        });
        db.public.registerFunction({
          name: 'obj_description',
          args: [DataType.text, DataType.text],
          returns: DataType.text,
          implementation: () => null,
        });
        const dataSource: DataSource =
          await db.adapters.createTypeormDataSource(options!);
        return dataSource.initialize();
      },
    }),
  ],
})
export class TestDatabaseModule {}
