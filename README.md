# Franchise Network Manager

Aplicación fullstack para administrar franquicias, sus sucursales y los productos con inventario de cada sucursal.

## Requisitos

- .NET SDK 8.x
- Node.js 18 o posterior y npm
- SQLite (incluido mediante EF Core; no requiere instalar un servidor)

## Ejecutar el backend

Desde la raíz del repositorio:

```powershell
cd backend
dotnet restore
dotnet tool restore

$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
dotnet user-secrets set "Authentication:SigningKey" ([Convert]::ToBase64String($bytes))
dotnet user-secrets set "Authentication:AdminUsername" "admin"
dotnet user-secrets set "Authentication:AdminPassword" (Read-Host "Choose a strong admin password (16+ characters)")

dotnet run --launch-profile http
```

La API estará disponible en `http://localhost:5206` y Swagger UI en `http://localhost:5206/swagger` (solo en Development). Inicia sesión en la interfaz con el usuario y la contraseña configurados arriba. El token JWT se mantiene solo en memoria; al recargar la página tendrás que iniciar sesión otra vez.
La base de datos SQLite se crea en `backend/franchises.db`; la API aplica las migraciones pendientes al iniciar. Los secretos locales se guardan con .NET User Secrets y no en el repositorio.

La migración `InitialCreate` define las tablas y relaciones. La herramienta local `dotnet-ef` está fijada a EF Core 8 en el manifiesto del repositorio. Si cambias los modelos, crea y aplica una migración:

```powershell
dotnet ef migrations add NombreDeLaMigracion
dotnet ef database update
```

## Ejecutar el frontend

En otra terminal, desde la raíz:

```powershell
cd frontend
npm install
npm run dev
```

Vite muestra la URL local al iniciar (normalmente `http://localhost:5173`). La aplicación consume la API en `http://localhost:5206/api`; para cambiarla, define `VITE_API_BASE_URL` en el entorno del frontend.

## Ejecutar con Docker

Desde la raíz del repositorio, crea tu archivo `.env` a partir de la plantilla y reemplaza los valores de ejemplo por secretos propios:

```powershell
Copy-Item .env.example .env
# Edita .env y configura una clave JWT aleatoria y una contraseña fuerte.
docker compose up --build
```

La interfaz estará en `http://localhost:5173` y la API en `http://localhost:5206`. Swagger se deshabilita en Production. Docker Compose restringe CORS al origen configurado en `FRONTEND_ORIGIN` y conserva SQLite en el volumen `franchise-data`, incluso después de `docker compose down`. No uses las credenciales de ejemplo para publicar el servicio.

## Pruebas

Ejecuta las pruebas unitarias del backend desde la raíz:

```powershell
dotnet test tests\Franchise.Api.Tests\Franchise.Api.Tests.csproj -c Release
```

Para validar el frontend:

```powershell
cd frontend
npm run build
npm run lint
```

## Funcionalidades

- Crear y listar franquicias; cambiar el nombre de una franquicia.
- Eliminar permanentemente una franquicia y sus sucursales/productos asociados.
- Crear y listar sucursales; cambiar el nombre de una sucursal.
- Eliminar permanentemente una sucursal y sus productos asociados.
- Crear y listar productos de una sucursal; cambiar el nombre y el stock de un producto.
- Actualizar el stock, descontar una cantidad configurable de unidades y eliminar productos.
- Consultar el producto con mayor stock por sucursal de una franquicia.
- La interfaz requiere iniciar sesión y muestra estados de carga y errores de la API.
- La API requiere un JWT válido para todas las operaciones, salvo `POST /auth/login`.

## Flujo mínimo de la interfaz

Después de iniciar sesión, el dashboard muestra una pantalla a la vez y permite navegar con el selector de pasos:

1. **Franchises:** se cargan las franquicias existentes y se puede crear una nueva.
2. **Branches:** al elegir una franquicia se abre esta pantalla, donde se cargan sus sucursales y se puede agregar otra.
3. **Branch Products:** al elegir una sucursal se abre esta pantalla; se cargan sus productos y se puede crear uno con stock inicial o cambiar su stock con **Save**.

Los pasos siguientes se habilitan cuando existe la selección necesaria. La interfaz muestra **Loading** durante las cargas y presenta errores de validación o de la API en un aviso visible. Las pantallas se administran dentro de React y no usan rutas separadas.

## Modelo de datos

Las respuestas de la API usan estos contratos JSON (los nombres de las propiedades se serializan en camelCase):

```ts
Franchise: { id: number; name: string }
Branch: { id: number; franchiseId: number; name: string }
Product: { id: number; branchId: number; name: string; stock: number }
```

`Branch.franchiseId` referencia `Franchise.id`, y `Product.branchId` referencia `Branch.id`. Al eliminar una franquicia también se eliminan sus sucursales y productos; al eliminar una sucursal se eliminan sus productos. Los IDs se generan en el backend. Los modelos de persistencia incluyen propiedades de navegación de EF Core, pero las respuestas públicas usan DTOs y mantienen únicamente los campos indicados arriba.

## API

Todos los endpoints están bajo `/api`:

| Método | Ruta | Acción |
| --- | --- | --- |
| `POST` | `/auth/login` | Iniciar sesión y obtener un JWT |
| `GET` | `/franchises` | Listar franquicias |
| `POST` | `/franchises` | Crear franquicia |
| `GET` | `/franchises/{franchiseId}` | Consultar franquicia |
| `PATCH` | `/franchises/{franchiseId}` | Cambiar nombre de franquicia |
| `DELETE` | `/franchises/{franchiseId}` | Eliminar franquicia y sus sucursales/productos |
| `GET` | `/franchises/{franchiseId}/branches` | Listar sucursales |
| `POST` | `/franchises/{franchiseId}/branches` | Crear sucursal |
| `GET` | `/branches/{branchId}` | Consultar sucursal |
| `PATCH` | `/branches/{branchId}` | Cambiar nombre de sucursal |
| `DELETE` | `/branches/{branchId}` | Eliminar sucursal y sus productos |
| `GET` | `/branches/{branchId}/products` | Listar productos |
| `POST` | `/branches/{branchId}/products` | Crear producto |
| `GET` | `/products/{productId}` | Consultar producto |
| `PATCH` | `/products/{productId}` | Cambiar nombre del producto |
| `PATCH` | `/products/{productId}/stock` | Actualizar stock |
| `DELETE` | `/branches/{branchId}/products/{productId}` | Eliminar producto |
| `GET` | `/franchises/{franchiseId}/top-stock-products` | Producto con más stock por sucursal |

Las solicitudes de creación y actualización validan los datos recibidos después de quitar espacios. Los errores no exponen stack traces. El inicio de sesión permite cinco intentos por minuto y los tokens expiran según `Authentication:TokenLifetimeMinutes`. En Development, Swagger permite introducir un token Bearer después de iniciar sesión. El archivo `backend/Franchise.Api.http` contiene ejemplos para probar los endpoints, la validación y un caso de recurso inexistente.

## Arquitectura

- `backend/Controllers`: endpoints REST implementados con controladores ASP.NET Core.
- `backend/DTOs`: contratos de entrada y salida, separados de las entidades.
- `backend/Models` y `backend/Data`: entidades, relaciones y acceso a SQLite mediante EF Core.
- `frontend/src`: interfaz React con TypeScript; `services/api.ts` centraliza las solicitudes HTTP.
- `tests/Franchise.Api.Tests`: pruebas unitarias del backend con xUnit.
- [Reporte técnico](docs/reporte-tecnico.md): arquitectura, ejecución y validación del proyecto.

## Despliegue en Render

`render.yaml` define el frontend estático y la API Docker en la región de Ohio. Al crear un Blueprint desde Render, revisa el plan y el costo mostrado antes de confirmar: el disco persistente de 1 GB necesario para conservar SQLite y el servicio de API pueden generar cargos. El frontend estático usa HTTPS y la API restringe CORS al origen configurado.

Para desplegar, publica esta rama en GitHub, conecta el repositorio en Render y crea un Blueprint seleccionando `render.yaml`. Revisa los recursos y cargos que Render muestra antes de confirmar la creación.

Render genera la clave JWT y las credenciales de administrador durante la creación. Consúltalas desde la configuración privada del servicio y guárdalas de forma segura; no las añadas al repositorio ni compartas el archivo `.env`. La base de datos queda en `/data/franchises.db`, dentro del disco persistente. SQLite está pensado aquí para una sola instancia de API; considera una base de datos administrada antes de escalar.

## Flujo de trabajo con Git

Trabaja en una rama de feature y no directamente en `main`. Usa commits pequeños, descriptivos y en inglés; después publica la rama y abre un Pull Request hacia `main` con un resumen de los cambios y cómo se verificaron. El PR facilita revisar el trabajo antes de integrarlo.
