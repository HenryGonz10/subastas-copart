# AutoSubastas GT · Subastas de vehículos en tiempo real (estilo Copart)

## 🌐 Sitio publicado: **[https://henrygonz10.github.io/subastas-copart/](https://henrygonz10.github.io/subastas-copart/)**

> API: [https://subastas-copart-api.onrender.com/api/health](https://subastas-copart-api.onrender.com/api/health)
> *(El API gratuito de Render se duerme tras 15 min sin uso: la primera carga puede tardar ~1 minuto.)*

## 🔑 Usuarios de prueba

Para probar subastas cruzadas en tiempo real, abre el sitio en **2 o 3 navegadores distintos** (o ventanas de incógnito) e inicia sesión con un usuario diferente en cada uno.

| Usuario | Correo | Contraseña |
|---|---|---|
| Ana López | `ana@subastas.gt` | `Ana#2026` |
| Carlos Méndez | `carlos@subastas.gt` | `Carlos#2026` |
| María García | `maria@subastas.gt` | `Maria#2026` |
| Importadora Demo (publicador) | `demo@subastas.gt` | `Demo#2026` |

La mayoría del inventario lo publicó *Importadora Demo*, así que Ana, Carlos y María pueden pujar entre ellos por cualquiera de esos vehículos. Cada uno de los tres tiene además una publicación propia para probar la edición.

---

## Arquitectura

```
┌──────────────────────┐   REST (JSON / multipart)   ┌─────────────────────────┐   Prisma   ┌──────────────────┐
│  Frontend SPA         │ ─────────────────────────▶ │  Web API Node/Express    │ ─────────▶ │  SQL Server       │
│  React + Vite +       │                            │  + Socket.IO             │            │  (Azure SQL /     │
│  Tailwind             │ ◀───── WebSocket ───────── │  + reloj de subastas     │            │   Docker local)   │
└──────────────────────┘   pujas e indicadores       └─────────────────────────┘            └──────────────────┘
```

| Capa | Tecnología |
|---|---|
| Frontend | React 19, React Router 7, Vite 7, Tailwind CSS 4, Socket.IO client |
| Backend | Node.js 22, Express 5, Socket.IO 4, JWT, bcrypt, Zod, Multer |
| Base de datos | SQL Server 2022 / Azure SQL Database, Prisma ORM (migraciones versionadas) |

```
subastas-copart/
├── backend/              Web API RESTful + Socket.IO
│   ├── prisma/           schema.prisma, migraciones y seed
│   ├── scripts/          smoke-test.js (pruebas de extremo a extremo)
│   └── src/
│       ├── routes/       auth, catálogos, vehículos/pujas, fotos
│       ├── services/     reglas de subasta y reloj (inicio/cierre)
│       └── realtime/     salas Socket.IO por vehículo
├── frontend/             SPA en React
│   └── src/
│       ├── pages/        Home/inventario, detalle-subasta, publicar, mis publicaciones, login, registro
│       ├── components/   tarjetas, filtros, carrusel, panel de puja, formulario de vehículo
│       └── context/      sesión, socket y catálogos
├── database/             schema.sql + diagrama entidad-relación
├── docker-compose.yml    SQL Server local
├── render.yaml           despliegue del API en Render
└── .github/workflows/    publicación del frontend en GitHub Pages
```

## Cómo se cumple cada requisito

| Requisito | Implementación |
|---|---|
| **Login obligatorio** | Los anónimos ven el inventario y el detalle en modo lectura. Publicar, editar y ofertar exigen JWT (`401` en el API y redirección a `/login` en el frontend). |
| **Registro** | Nombre, apellido, correo, teléfono y contraseña segura (8+ caracteres, mayúscula, minúscula, número y símbolo), validada en cliente y servidor. Contraseñas con bcrypt. |
| **Publicación** | Ficha técnica completa (año, tipo, marca, modelo, motor, transmisión, combustible, tren de manejo AWD/FWD/RWD/4WD, cilindros), daño 🟢🟡🔴, mínimo 5 fotos, monto base, fecha/hora de inicio y de cierre. |
| **Editar mis publicaciones** | "Mis publicaciones" con búsqueda por marca, modelo, VIN, año o lote y filtro por estado. Si la subasta ya tiene ofertas, el monto base y las fechas quedan bloqueados. |
| **Inventario y filtros** | Tarjetas con portada, cuenta regresiva, color de daño y precio en vivo. Filtros combinables por año (rango), marca, modelo, tipo, combustible, transmisión, tren de manejo, cilindros, motor, daño y precio, además de búsqueda libre, orden y estado. Los filtros quedan en la URL. |
| **Detalle y carrusel** | Ficha técnica completa y carrusel con flechas, miniaturas, teclado, gesto táctil y pantalla completa. |
| **Reglas de puja (en servidor)** | Primera oferta ≥ monto base; las siguientes deben superar la actual en al menos 10%; no se puede ofertar antes del inicio ni después del cierre; tampoco por un vehículo propio. Las pujas se serializan por vehículo con control optimista para evitar condiciones de carrera. |
| **Privacidad** | El API y los eventos públicos solo envían el monto más alto y el número de ofertas, nunca la identidad del postor. Cada usuario ve únicamente su propio historial. |
| **Tiempo real** | Socket.IO: sala por vehículo. Cada puja difunde el nuevo monto a todos y un indicador personal a cada conexión: 🟢 "¡Vas ganando esta subasta!" / 🔴 "Tu oferta ha sido superada…". El Home también actualiza los precios en vivo. Todo sin F5. |
| **Temporizador** | Cuenta regresiva sincronizada con el reloj del servidor. Al llegar la hora de cierre se muestra "Oferta cerrada" y el servidor deja de aceptar pujas. |
| **Cierre de subasta** | Un temporizador en el servidor marca la subasta como **Vendida** (si hubo ofertas ≥ base) o **Desierta / no vendida** (si no) y lo notifica en vivo. |

## Ejecutar en local

Requisitos: Node.js 20+ y Docker.

```bash
# 1. Base de datos SQL Server local (puerto 1436)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # en Windows: copy .env.example .env
npm install
npx prisma migrate deploy     # crea las tablas
npm run db:seed               # catálogos, usuarios de prueba e inventario
npm run dev                   # http://localhost:4000

# 3. Frontend (otra terminal)
cd frontend                   # .env.development ya apunta a http://localhost:4000
npm install
npm run dev                   # http://localhost:5173
```

Para reiniciar el inventario de ejemplo: `npm run db:seed -- --force`.
Para correr las pruebas de extremo a extremo con el API encendido: `npm run test:smoke`.

## Despliegue

Despliegue gratuito sugerido: **SQL Server en MonsterASP.NET** (o Azure SQL Database) + **Render** (API con WebSockets) + **GitHub Pages** (frontend).

### 1. Base de datos: SQL Server en MonsterASP.NET (gratis, sin tarjeta)

1. Crea una cuenta en [MonsterASP.NET](https://www.monsterasp.net/) (plan gratuito: 1 base SQL Server de 1 GB).
2. En el panel: **Databases → Create database** (SQL Server 2022).
3. Entra a la base → **Users and remote** → activa **Remote Access** (viene desactivado).
4. Copia del panel el *server*, el nombre de la base, el usuario y la contraseña, y arma la cadena:
   ```
   sqlserver://<server>:1433;database=<db>;user=<usuario>;password=<password>;encrypt=true;trustServerCertificate=true
   ```

### 1 (alternativa). Base de datos: Azure SQL Database

1. En el portal de Azure crea una **SQL Database** usando la oferta gratuita ("Apply free offer"), con autenticación SQL (usuario y contraseña).
2. En *Networking* del servidor activa **Allow Azure services and resources to access this server** y agrega la regla de firewall `0.0.0.0 – 255.255.255.255` (Render no tiene IP fija).
3. Arma la cadena de conexión:
   ```
   sqlserver://<servidor>.database.windows.net:1433;database=<db>;user=<usuario>;password=<password>;encrypt=true;trustServerCertificate=false
   ```

### 2. Web API: Render

1. En Render: **New → Blueprint** y selecciona este repositorio; `render.yaml` crea el servicio `subastas-copart-api`.
2. Ingresa `DATABASE_URL` (la cadena del paso 1). `CORS_ORIGIN` ya apunta a `https://henrygonz10.github.io`.
3. El build ejecuta las migraciones y el seed automáticamente (el seed no duplica datos si ya existen).

> En el plan gratuito de Render el API se suspende tras 15 minutos sin tráfico; la primera petición puede tardar ~1 minuto en despertarlo.

### 3. Frontend: GitHub Pages

1. **Settings → Pages → Source: GitHub Actions**.
2. La URL del API para producción está en `frontend/.env.production` (`VITE_API_URL=https://subastas-copart-api.onrender.com`). Si el backend cambia de dirección, edita ese archivo y haz push.
3. Cada push a `main` que toque `frontend/` publica el sitio con `.github/workflows/deploy-frontend.yml` (también se puede lanzar a mano desde **Actions → Publicar frontend en GitHub Pages → Run workflow**).

> Alternativa para el frontend: **Vercel** (directorio raíz `frontend`; toma la URL del API de `.env.production`); `frontend/vercel.json` ya incluye la regla para las rutas de la SPA.

## Endpoints del API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | — | Registro de usuario |
| POST | `/api/auth/login` | — | Inicio de sesión (JWT) |
| GET | `/api/auth/me` | ✔ | Usuario autenticado |
| GET | `/api/catalogs` | — | Todos los catálogos |
| GET | `/api/catalogs/{item-types, makes, makes/:id/models, transmissions, fuel-types, drive-trains, damage-levels}` | — | Catálogos individuales |
| POST | `/api/catalogs/makes` · `/api/catalogs/makes/:id/models` | ✔ | Agregar marca / modelo |
| GET | `/api/vehicles` | opcional | Inventario con filtros, orden y paginación |
| GET | `/api/vehicles/mine` | ✔ | Mis publicaciones (búsqueda) |
| GET | `/api/vehicles/:id` | opcional | Detalle del vehículo |
| POST | `/api/vehicles` | ✔ | Publicar (multipart, ≥ 5 fotos) |
| PUT | `/api/vehicles/:id` | ✔ dueño | Editar publicación |
| DELETE | `/api/vehicles/:id` | ✔ dueño | Eliminar (solo sin ofertas) |
| POST | `/api/vehicles/:id/bids` | ✔ | Ofertar (validado en servidor) |
| GET | `/api/vehicles/:id/my-bids` | ✔ | Mis ofertas en ese vehículo |
| GET | `/api/photos/:id` | — | Imagen de la galería |

Filtros de `GET /api/vehicles`: `q`, `status` (`OPEN`, `ACTIVE`, `SCHEDULED`, `CLOSED`, `ALL`), `makeId`, `modelId`, `itemTypeId`, `fuelTypeId`, `transmissionId`, `driveTrainId`, `damageLevelId`, `cylinders` (los de id aceptan listas separadas por coma), `yearFrom`, `yearTo`, `priceMin`, `priceMax`, `engine`, `sort`, `page`, `pageSize`.

### Eventos Socket.IO

| Evento | Dirección | Contenido |
|---|---|---|
| `auction:join` / `auction:leave` | cliente → servidor | Entrar o salir de la sala de un vehículo |
| `auction:update` | servidor → sala | Monto actual, número de ofertas, mínima siguiente, fechas y estado (sin identidad) |
| `auction:viewer` | servidor → cada conexión | `isLeader`, `hasBid`, `isOwner` del usuario conectado |
| `auction:closed` | servidor → sala | La subasta terminó: `SOLD` o `UNSOLD` |
| `inventory:update` / `inventory:changed` | servidor → todos | Precios en vivo y cambios en el inventario del Home |

---

*Las fotografías del inventario de ejemplo son ilustrativas (Unsplash); cada publicador sube las fotos reales de su vehículo.*
