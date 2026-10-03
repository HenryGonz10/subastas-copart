import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ITEM_TYPES = ['Automóvil', 'SUV', 'Pickup', 'Van / Minivan', 'Deportivo', 'Camión', 'Motocicleta'];
const TRANSMISSIONS = ['Automática', 'Manual', 'CVT', 'Doble embrague (DCT)'];
const FUEL_TYPES = ['Gasolina', 'Diésel', 'Híbrido', 'Híbrido enchufable', 'Eléctrico'];
const DRIVE_TRAINS = [
  { code: 'AWD', description: 'Tracción integral' },
  { code: 'FWD', description: 'Tracción delantera' },
  { code: 'RWD', description: 'Tracción trasera' },
  { code: '4WD', description: 'Doble tracción 4x4' },
];
const DAMAGE_LEVELS = [
  { code: 'GREEN', name: 'Verde', description: 'Daño menor / Limpio', color: '#16a34a' },
  { code: 'YELLOW', name: 'Amarillo', description: 'Daño medio / Reparable', color: '#eab308' },
  { code: 'RED', name: 'Rojo', description: 'Daño severo / Salvamento', color: '#dc2626' },
];
const MAKES = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Tacoma', 'Hilux', '4Runner', 'Highlander', 'Prius'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Pilot', 'HR-V'],
  Nissan: ['Sentra', 'Altima', 'Rogue', 'Frontier', 'Pathfinder', 'Kicks'],
  Ford: ['F-150', 'Mustang', 'Explorer', 'Escape', 'Ranger', 'Bronco'],
  Chevrolet: ['Silverado', 'Camaro', 'Equinox', 'Tahoe', 'Malibu', 'Colorado'],
  Hyundai: ['Elantra', 'Tucson', 'Santa Fe', 'Sonata', 'Kona'],
  Kia: ['Sportage', 'Sorento', 'Rio', 'Forte', 'Telluride'],
  Mazda: ['Mazda3', 'CX-5', 'CX-30', 'MX-5 Miata'],
  Jeep: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Gladiator'],
  BMW: ['Serie 3', 'Serie 5', 'X3', 'X5'],
  'Mercedes-Benz': ['Clase C', 'Clase E', 'GLC', 'GLE'],
  Audi: ['A4', 'Q5', 'Q7'],
  Volkswagen: ['Jetta', 'Tiguan', 'Golf', 'Atlas'],
  Tesla: ['Model 3', 'Model Y', 'Model S'],
  Dodge: ['Charger', 'Challenger', 'Durango'],
  RAM: ['1500', '2500'],
  Subaru: ['Outback', 'Forester', 'WRX', 'Crosstrek'],
  Mitsubishi: ['L200', 'Outlander', 'Montero Sport'],
  Lexus: ['RX 350', 'IS 300', 'NX 300'],
  Porsche: ['911', 'Cayenne', 'Macan'],
};

// Fotos ilustrativas (Unsplash). En producción cada publicador sube las suyas.
const PHOTO_POOL = [
  '1494976388531-d1058494cdd8', '1503376780353-7e6692767b70', '1492144534655-ae79c964c9d7',
  '1502877338535-766e1452684a', '1552519507-da3b142c6e3d', '1544636331-e26879cd4d9b',
  '1533473359331-0135ef1b58bf', '1542362567-b07e54358753', '1583121274602-3e2820c69888',
  '1525609004556-c46c7d6cf023', '1511919884226-fd3cad34687c', '1549317661-bd32c8ce0db2',
  '1550355291-bbee04a92027', '1606664515524-ed2f786a0bd6', '1617531653332-bd46c24f2068',
  '1580273916550-e323be2ae537', '1568605117036-5fe5e7bab0b7', '1555215695-3004980ad54e',
  '1541899481282-d53bffe3c35d', '1514316454349-750a7fd3da3a', '1493238792000-8113da705763',
  '1485291571150-772bcfc10da5', '1532581140115-3e355d1ed1de', '1590362891991-f776e747a588',
  '1609521263047-f8f205293f24', '1619767886558-efdc259cde1a', '1605559424843-9e4c228bf1c2',
  '1600712242805-5f78671b24da', '1618843479313-40f8afb4b4d8', '1621007947382-bb3c3994e3fb',
  '1616422285623-13ff0162193c', '1612825173281-9a193378527e', '1603584173870-7f23fdae1b7a',
  '1559416523-140ddc3d238c', '1570733577524-3a047079e80d', '1597007066704-67bf2068d5b2',
  '1588127333419-b9d7de223dcf', '1504215680853-026ed2a45def', '1536700503339-1e4b06520771',
  '1489824904134-891ab64532f1', '1511407397940-d57f68e81203', '1517524008697-84bbe3c3fd98',
  '1546614042-7df3c24c9e5d', '1519641471654-76ce0107ad1b', '1606016159991-dfe4f2746ad5',
  '1631295868223-63265b40d9e4', '1543465077-db45d34b88a5', '1580414057403-c5f451f30e1c',
];
const photoUrl = (id) => `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

const USERS = [
  { firstName: 'Ana', lastName: 'López', email: 'ana@subastas.gt', phone: '+502 5555-1001', password: 'Ana#2026' },
  { firstName: 'Carlos', lastName: 'Méndez', email: 'carlos@subastas.gt', phone: '+502 5555-1002', password: 'Carlos#2026' },
  { firstName: 'María', lastName: 'García', email: 'maria@subastas.gt', phone: '+502 5555-1003', password: 'Maria#2026' },
  { firstName: 'Importadora', lastName: 'Demo', email: 'demo@subastas.gt', phone: '+502 5555-1000', password: 'Demo#2026' },
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// owner: índice en USERS; start/end relativos a "ahora"; bids: [índiceUsuario, monto]
const VEHICLES = [
  { owner: 3, year: 2021, type: 'SUV', make: 'Toyota', model: 'RAV4', engine: '2.5L I4', trans: 'Automática', fuel: 'Híbrido', drive: 'AWD', cyl: 4, damage: 'GREEN', mileage: 48200, color: 'Blanco perla', base: 95000, start: -2 * HOUR, end: 12 * DAY, bids: [[0, 95000], [1, 104500]], desc: 'Daño menor en defensa trasera. Título limpio, enciende y camina.' },
  { owner: 3, year: 2019, type: 'Pickup', make: 'Ford', model: 'F-150', engine: '3.5L V6 EcoBoost', trans: 'Automática', fuel: 'Gasolina', drive: '4WD', cyl: 6, damage: 'YELLOW', mileage: 86500, color: 'Gris', base: 120000, start: -1 * DAY, end: 15 * DAY, bids: [[2, 120000]], desc: 'Golpe lateral izquierdo, puertas y estribo. Motor en perfecto estado.' },
  { owner: 3, year: 2020, type: 'Automóvil', make: 'Honda', model: 'Civic', engine: '2.0L I4', trans: 'CVT', fuel: 'Gasolina', drive: 'FWD', cyl: 4, damage: 'GREEN', mileage: 39800, color: 'Azul', base: 62000, start: -3 * HOUR, end: 9 * DAY, bids: [], desc: 'Rayones superficiales. Ideal para uso diario.' },
  { owner: 3, year: 2018, type: 'Deportivo', make: 'Ford', model: 'Mustang', engine: '5.0L V8 Coyote', trans: 'Manual', fuel: 'Gasolina', drive: 'RWD', cyl: 8, damage: 'RED', mileage: 61000, color: 'Rojo', base: 85000, start: -5 * HOUR, end: 20 * DAY, bids: [[0, 85000], [2, 93500], [0, 102850]], desc: 'Impacto frontal fuerte, bolsas de aire activadas. Venta como salvamento.' },
  { owner: 3, year: 2022, type: 'SUV', make: 'Jeep', model: 'Wrangler', engine: '3.6L V6 Pentastar', trans: 'Automática', fuel: 'Gasolina', drive: '4WD', cyl: 6, damage: 'YELLOW', mileage: 22300, color: 'Verde', base: 150000, start: -6 * HOUR, end: 18 * DAY, bids: [], desc: 'Daño por inundación leve, interior requiere limpieza.' },
  { owner: 3, year: 2023, type: 'Automóvil', make: 'Tesla', model: 'Model 3', engine: 'Motor eléctrico dual', trans: 'Automática', fuel: 'Eléctrico', drive: 'AWD', cyl: 0, damage: 'GREEN', mileage: 15400, color: 'Negro', base: 175000, start: -1 * HOUR, end: 25 * DAY, bids: [[1, 175000]], desc: 'Long Range. Rayón en puerta trasera derecha.' },
  { owner: 3, year: 2017, type: 'Automóvil', make: 'BMW', model: 'Serie 3', engine: '2.0L I4 Turbo', trans: 'Automática', fuel: 'Gasolina', drive: 'RWD', cyl: 4, damage: 'RED', mileage: 98000, color: 'Blanco', base: 40000, start: -8 * HOUR, end: 10 * DAY, bids: [], desc: 'Volcadura, techo y pilares dañados. Partes recuperables.' },
  { owner: 3, year: 2021, type: 'Pickup', make: 'Toyota', model: 'Tacoma', engine: '3.5L V6', trans: 'Automática', fuel: 'Gasolina', drive: '4WD', cyl: 6, damage: 'GREEN', mileage: 41200, color: 'Plata', base: 140000, start: -4 * HOUR, end: 30 * DAY, bids: [[2, 140000], [1, 154000]], desc: 'TRD Off-Road. Granizo leve en capó.' },
  { owner: 3, year: 2020, type: 'SUV', make: 'Mazda', model: 'CX-5', engine: '2.5L I4 Skyactiv', trans: 'Automática', fuel: 'Gasolina', drive: 'AWD', cyl: 4, damage: 'YELLOW', mileage: 55600, color: 'Rojo Soul', base: 70000, start: -2 * DAY, end: 7 * DAY, bids: [], desc: 'Golpe trasero, compuerta y calavera derecha.' },
  { owner: 3, year: 2019, type: 'Automóvil', make: 'Chevrolet', model: 'Camaro', engine: '6.2L V8', trans: 'Automática', fuel: 'Gasolina', drive: 'RWD', cyl: 8, damage: 'YELLOW', mileage: 47000, color: 'Amarillo', base: 98000, start: 1 * DAY, end: 21 * DAY, bids: [], desc: 'SS. Daño en suspensión delantera. Subasta próxima.' },
  { owner: 3, year: 2022, type: 'SUV', make: 'Hyundai', model: 'Tucson', engine: '2.5L I4', trans: 'Automática', fuel: 'Híbrido', drive: 'AWD', cyl: 4, damage: 'GREEN', mileage: 18900, color: 'Gris', base: 105000, start: 2 * DAY, end: 28 * DAY, bids: [], desc: 'Prácticamente nuevo, daño cosmético en espejo.' },
  { owner: 0, year: 2016, type: 'Automóvil', make: 'Nissan', model: 'Sentra', engine: '1.8L I4', trans: 'CVT', fuel: 'Gasolina', drive: 'FWD', cyl: 4, damage: 'RED', mileage: 120500, color: 'Blanco', base: 20000, start: -1 * DAY, end: 14 * DAY, bids: [], desc: 'Publicado por Ana. Choque frontal, ideal para repuestos.' },
  { owner: 1, year: 2020, type: 'SUV', make: 'Subaru', model: 'Outback', engine: '2.5L H4 Boxer', trans: 'CVT', fuel: 'Gasolina', drive: 'AWD', cyl: 4, damage: 'GREEN', mileage: 52000, color: 'Azul', base: 88000, start: -2 * HOUR, end: 16 * DAY, bids: [], desc: 'Publicado por Carlos. Mantenimientos al día.' },
  { owner: 2, year: 2021, type: 'Pickup', make: 'RAM', model: '1500', engine: '5.7L V8 HEMI', trans: 'Automática', fuel: 'Gasolina', drive: '4WD', cyl: 8, damage: 'YELLOW', mileage: 44000, color: 'Negro', base: 160000, start: -3 * HOUR, end: 22 * DAY, bids: [], desc: 'Publicado por María. Daño en batea por carga.' },
  { owner: 3, year: 2015, type: 'Automóvil', make: 'Volkswagen', model: 'Jetta', engine: '2.0L I4', trans: 'Manual', fuel: 'Gasolina', drive: 'FWD', cyl: 4, damage: 'RED', mileage: 140000, color: 'Gris', base: 25000, start: -5 * DAY, end: -1 * DAY, bids: [], desc: 'Subasta finalizada sin ofertas (desierta).' },
];

async function seedCatalogs() {
  for (const name of ITEM_TYPES) await prisma.itemType.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of TRANSMISSIONS) await prisma.transmission.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of FUEL_TYPES) await prisma.fuelType.upsert({ where: { name }, update: {}, create: { name } });
  for (const d of DRIVE_TRAINS) await prisma.driveTrain.upsert({ where: { code: d.code }, update: d, create: d });
  for (const d of DAMAGE_LEVELS) await prisma.damageLevel.upsert({ where: { code: d.code }, update: d, create: d });
  for (const [makeName, models] of Object.entries(MAKES)) {
    const make = await prisma.make.upsert({ where: { name: makeName }, update: {}, create: { name: makeName } });
    for (const name of models) {
      await prisma.vehicleModel.upsert({
        where: { makeId_name: { makeId: make.id, name } },
        update: {},
        create: { makeId: make.id, name },
      });
    }
  }
}

async function seedUsers() {
  const users = [];
  for (const u of USERS) {
    const { password, ...data } = u;
    users.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...data, passwordHash: await bcrypt.hash(password, 10) },
      }),
    );
  }
  return users;
}

async function seedVehicles(users) {
  const force = process.argv.includes('--force');
  const existing = await prisma.vehicle.count();
  if (existing > 0 && !force) {
    console.log(`Ya existen ${existing} vehículos, se omite el inventario (usa --force para recrearlo).`);
    return;
  }
  if (force) {
    await prisma.bid.deleteMany();
    await prisma.vehiclePhoto.deleteMany();
    await prisma.vehicle.deleteMany();
  }

  const lookup = async (model, where) => (await prisma[model].findFirstOrThrow({ where })).id;
  const now = Date.now();

  for (const [i, v] of VEHICLES.entries()) {
    const makeId = await lookup('make', { name: v.make });
    const startAt = new Date(now + v.start);
    const endAt = new Date(now + v.end);
    const last = v.bids.at(-1);
    const closed = endAt.getTime() <= now;

    const photos = Array.from({ length: 6 }, (_, k) => ({
      sortOrder: k,
      url: photoUrl(PHOTO_POOL[(i * 3 + k) % PHOTO_POOL.length]),
    }));

    const vehicle = await prisma.vehicle.create({
      data: {
        ownerId: users[v.owner].id,
        year: v.year,
        itemTypeId: await lookup('itemType', { name: v.type }),
        makeId,
        modelId: await lookup('vehicleModel', { makeId, name: v.model }),
        engine: v.engine,
        transmissionId: await lookup('transmission', { name: v.trans }),
        fuelTypeId: await lookup('fuelType', { name: v.fuel }),
        driveTrainId: await lookup('driveTrain', { code: v.drive }),
        cylinders: v.cyl,
        damageLevelId: await lookup('damageLevel', { code: v.damage }),
        vin: `1HGCM${String(82633 + i).padStart(5, '0')}A${String(4352 + i * 7).padStart(6, '0')}`,
        mileage: v.mileage,
        color: v.color,
        description: v.desc,
        basePrice: v.base,
        startAt,
        endAt,
        currentBid: last ? last[1] : null,
        currentBidderId: last ? users[last[0]].id : null,
        bidCount: v.bids.length,
        status: closed ? (v.bids.length ? 'SOLD' : 'UNSOLD') : startAt.getTime() > now ? 'SCHEDULED' : 'ACTIVE',
        closedAt: closed ? endAt : null,
        photos: { create: photos },
      },
    });

    for (const [k, [userIndex, amount]] of v.bids.entries()) {
      await prisma.bid.create({
        data: {
          vehicleId: vehicle.id,
          userId: users[userIndex].id,
          amount,
          createdAt: new Date(startAt.getTime() + (k + 1) * 10 * 60_000),
        },
      });
    }
  }
  console.log(`Inventario creado: ${VEHICLES.length} vehículos.`);
}

async function main() {
  await seedCatalogs();
  const users = await seedUsers();
  await seedVehicles(users);
  console.log('Seed completado. Usuarios de prueba:');
  for (const u of USERS) console.log(`  ${u.email} / ${u.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
