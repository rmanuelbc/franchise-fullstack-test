# Reporte técnico: Franchise Network Manager

## Objetivo

Aplicación fullstack para administrar franquicias, sucursales y el inventario de productos de cada sucursal.

## Arquitectura

- **Frontend:** React, TypeScript y Vite; se sirve como contenido estático con Nginx en la imagen Docker.
- **Backend:** ASP.NET Core Web API sobre .NET 8, con controladores REST y DTOs.
- **Persistencia:** SQLite y Entity Framework Core. Las migraciones pendientes se aplican al iniciar la API.
- **Contenedores:** Docker Compose ejecuta frontend y backend; un volumen nombrado conserva el archivo SQLite fuera del ciclo de vida de los contenedores.
- **Autenticación:** un administrador configurado mediante secretos de entorno inicia sesión y obtiene un JWT de duración limitada. Las operaciones de la API requieren un Bearer token; el login limita intentos y CORS solo permite los orígenes configurados.

## Verificación

- `dotnet test tests\Franchise.Api.Tests\Franchise.Api.Tests.csproj -c Release`: 12 pruebas aprobadas. Cubren validación de nombres normalizados, autenticación JWT, persistencia al renombrar productos y borrado en cascada.
- `npm run build` y `npm run lint`: aprobados.
- `docker compose config` y `docker compose build`: aprobados.
- Se inició la API con una base SQLite temporal vacía; la migración se aplicó y la API respondió correctamente.
- CORS se limita a orígenes configurados; Swagger solo se habilita en Development.

## Ejecución local con contenedores

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
# Reemplazar los valores de ejemplo por secretos propios
docker compose up --build
```

- Interfaz: `http://localhost:5173`
- API: `http://localhost:5206`

El despliegue en Render aún está pendiente. Configurar allí secretos JWT, el origen exacto del frontend en CORS y almacenamiento persistente montado en `/data` para conservar SQLite.
