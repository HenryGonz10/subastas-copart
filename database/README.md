# Modelo de base de datos (SQL Server)

- `schema.sql`: script DDL completo para crear las tablas en SQL Server / Azure SQL (generado desde `backend/prisma/schema.prisma`).
- La fuente de verdad es `backend/prisma/schema.prisma`; las migraciones versionadas están en `backend/prisma/migrations/`.
- Para regenerar el script: `cd backend && npm run db:sql`.

## Diagrama entidad-relación

```mermaid
erDiagram
    Users ||--o{ Vehicles : "publica"
    Users ||--o{ Bids : "oferta"
    Users |o--o{ Vehicles : "puja más alta"
    Vehicles ||--o{ VehiclePhotos : "galería (min. 5)"
    Vehicles ||--o{ Bids : "recibe"
    Makes ||--o{ VehicleModels : "tiene"
    Makes ||--o{ Vehicles : ""
    VehicleModels ||--o{ Vehicles : ""
    ItemTypes ||--o{ Vehicles : ""
    Transmissions ||--o{ Vehicles : ""
    FuelTypes ||--o{ Vehicles : ""
    DriveTrains ||--o{ Vehicles : ""
    DamageLevels ||--o{ Vehicles : ""

    Users {
        int id PK
        nvarchar firstName
        nvarchar lastName
        nvarchar email UK
        nvarchar phone
        nvarchar passwordHash "bcrypt"
        datetime2 createdAt
    }
    Vehicles {
        int id PK
        int ownerId FK
        int year
        int itemTypeId FK
        int makeId FK
        int modelId FK
        nvarchar engine
        int transmissionId FK
        int fuelTypeId FK
        int driveTrainId FK
        int cylinders
        int damageLevelId FK
        nvarchar vin
        int mileage
        nvarchar color
        nvarchar description
        decimal basePrice
        datetime2 startAt
        datetime2 endAt
        decimal currentBid
        int currentBidderId FK
        int bidCount
        nvarchar status "SCHEDULED | ACTIVE | SOLD | UNSOLD"
        datetime2 closedAt
    }
    VehiclePhotos {
        int id PK
        int vehicleId FK
        int sortOrder
        nvarchar url "foto externa (seed)"
        nvarchar mimeType
        varbinary data "foto subida"
    }
    Bids {
        int id PK
        int vehicleId FK
        int userId FK
        decimal amount
        datetime2 createdAt
    }
    Makes {
        int id PK
        nvarchar name UK
    }
    VehicleModels {
        int id PK
        int makeId FK
        nvarchar name
    }
    ItemTypes {
        int id PK
        nvarchar name UK
    }
    Transmissions {
        int id PK
        nvarchar name UK
    }
    FuelTypes {
        int id PK
        nvarchar name UK
    }
    DriveTrains {
        int id PK
        nvarchar code "AWD FWD RWD 4WD"
        nvarchar description
    }
    DamageLevels {
        int id PK
        nvarchar code "GREEN YELLOW RED"
        nvarchar name
        nvarchar description
        nvarchar color
    }
```

## Notas de diseño

- **Catálogos normalizados** (marcas, modelos, tipos, transmisiones, combustibles, trenes de manejo y niveles de daño) para que los filtros del inventario sean consultas por llave foránea indexada.
- `Vehicles.currentBid`, `currentBidderId` y `bidCount` son una desnormalización de la tabla `Bids` para leer el estado de la subasta en una sola fila; se actualizan dentro de la misma transacción que inserta la puja, con control optimista sobre `bidCount`.
- `currentBidderId` **nunca** se expone por la API pública: solo se usa en el servidor para calcular el indicador "¡Vas ganando!" / "Tu oferta ha sido superada" de cada usuario.
- Las fotos subidas se guardan como `VARBINARY(MAX)` para que el despliegue no dependa de un almacenamiento de archivos externo; las del seed son URLs.
