# Task Manager API

API REST de gestión de tareas construida con **NestJS 12**, **PostgreSQL** (TypeORM), autenticación **JWT** con roles y documentación interactiva con **Swagger / OpenAPI**. Es un proyecto de portfolio: muestra cómo estructuro un backend con validación, seguridad, tests y contenedores.

## Qué demuestra

| Área          | Detalle                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS        | Módulos, controladores, servicios, inyección de dependencias, guards globales, decoradores propios (`@Public`, `@Roles`, `@CurrentUser`)             |
| PostgreSQL    | Entidades y relaciones 1-N con TypeORM, índice por propietario, filtros, búsqueda, orden y paginación con consultas parametrizadas                    |
| Auth          | Registro y login, contraseñas con bcrypt, JWT, roles `user` / `admin`, aislamiento de datos por usuario                                              |
| Swagger       | Documentación en `/docs` generada desde los DTO, con botón **Authorize** para probar rutas protegidas                                                |
| Docker        | `Dockerfile` multi-etapa que corre sin root, y `docker-compose` con la API y PostgreSQL                                                              |
| Calidad       | Tests unitarios y e2e (Vitest + Supertest), lint, formato, CI en GitHub Actions y `npm audit`                                                        |

## Probarla con Swagger

1. Levanta la API (ver abajo) y abre <http://localhost:3000/docs>.
2. `POST /auth/register` con un email y una contraseña de 8+ caracteres. Copia el `accessToken`.
3. Pulsa **Authorize** (arriba a la derecha) y pega el token.
4. Usa `POST /tasks`, `GET /tasks?status=todo&sortBy=title&page=1&limit=10`, etc.

## Puesta en marcha

Requisitos: Node 24+ y Docker.

```bash
cp .env.example .env     # completa DB_PASSWORD y JWT_SECRET (instrucciones dentro del archivo)
docker compose up --build
```

La API queda en `http://localhost:3000` y la documentación en `/docs`. PostgreSQL no se expone fuera de la red de compose.

Para desarrollo sin contenedor de la API:

```bash
docker compose up db -d  # solo la base de datos (añade temporalmente "ports" al servicio db)
npm install
npm run start:dev
```

## Endpoints

| Método | Ruta         | Acceso  | Descripción                                          |
| ------ | ------------ | ------- | ---------------------------------------------------- |
| GET    | /health      | público | Estado del servicio                                  |
| POST   | /auth/register | público | Crea una cuenta (siempre rol `user`) y devuelve JWT |
| POST   | /auth/login  | público | Devuelve JWT                                         |
| GET    | /auth/me     | token   | Usuario autenticado                                  |
| POST   | /tasks       | token   | Crea una tarea propia                                |
| GET    | /tasks       | token   | Lista con filtros, búsqueda, orden y paginación      |
| GET    | /tasks/:id   | token   | Detalle                                              |
| PATCH  | /tasks/:id   | token   | Actualización parcial                                |
| DELETE | /tasks/:id   | token   | Elimina                                              |

Un usuario solo ve y modifica **sus** tareas (si pide una ajena recibe 404, no 403, para no revelar que existe). Un `admin` ve las de todos.

## Seguridad

- **Sin secretos en el repositorio**: toda la configuración sale de variables de entorno; `.env` está en `.gitignore` y solo se versiona `.env.example`, sin valores reales.
- **Fail-fast**: al arrancar se validan las variables; la app no inicia sin `JWT_SECRET` (32+ caracteres), ni con contraseña de admin débil.
- **Contraseñas**: bcrypt (12 rondas); el hash nunca se devuelve en respuestas (`select: false`) y el login tarda lo mismo exista o no el email.
- **Validación estricta**: `whitelist` + `forbidNonWhitelisted` rechazan campos no declarados (nadie puede enviarse `role: "admin"` ni `ownerId`).
- **Inyección SQL**: consultas parametrizadas y orden restringido a una lista cerrada de columnas.
- **Rate limiting** global (100/min) y estricto en `/auth/*` (10/min); cabeceras de seguridad con `helmet`.
- **Contenedor**: imagen sin root, base de datos sin puerto publicado, API enlazada solo a `127.0.0.1`.
- `DB_SYNCHRONIZE=true` es cómodo para la demo; en producción se usarían migraciones.

## Tests

```bash
npm test          # unitarios
npm run test:e2e  # e2e completos (usan PostgreSQL en memoria con pg-mem, sin Docker)
npm run lint
npm run build
```

## Stack

NestJS 12 · TypeScript · PostgreSQL 17 · TypeORM · JWT · Swagger · Docker · Vitest · GitHub Actions
