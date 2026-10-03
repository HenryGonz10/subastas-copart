// Prueba rápida de extremo a extremo contra un API en ejecución:
//   node scripts/smoke-test.js [http://localhost:4000]
// Verifica autenticación, reglas de puja en el servidor y difusión en tiempo real.
import { io } from 'socket.io-client';

const API = process.argv[2] || 'http://localhost:4000';
let failures = 0;

const check = (label, condition) => {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures += 1;
};

async function api(path, { token, ...options } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = res.status === 204 ? null : await res.json();
  return { status: res.status, body };
}

const login = async (email, password) =>
  (await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })).body.token;

function connect(token) {
  return new Promise((resolve) => {
    const socket = io(API, { auth: token ? { token } : {}, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
  });
}

const join = (socket, id) => new Promise((resolve) => socket.emit('auction:join', id, resolve));
const nextEvent = (socket, event) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), 5000);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });

async function main() {
  const anon = await api('/api/vehicles/1/bids', { method: 'POST', body: JSON.stringify({ amount: 1 }) });
  check('Anónimo no puede ofertar (401)', anon.status === 401);

  const ana = await login('ana@subastas.gt', 'Ana#2026');
  const carlos = await login('carlos@subastas.gt', 'Carlos#2026');
  check('Login de usuarios de prueba', Boolean(ana && carlos));

  const list = await api('/api/vehicles?status=ACTIVE&pageSize=48');
  const target = list.body.items.find((v) => !v.isOwner && v.bidCount === 0);
  check('Inventario público con subastas activas', Boolean(target));
  const id = target.id;
  const base = target.basePrice;

  const filtered = await api(`/api/vehicles?status=ALL&damageLevelId=${target.damageLevel.id}&makeId=${target.make.id}`);
  check(
    'Filtros por marca y daño',
    filtered.body.items.length > 0 &&
      filtered.body.items.every((v) => v.make.id === target.make.id && v.damageLevel.id === target.damageLevel.id),
  );

  const sAna = await connect(ana);
  const sCarlos = await connect(carlos);
  const sAnon = await connect(null);
  const joined = await join(sAna, id);
  await join(sCarlos, id);
  await join(sAnon, id);
  check('Unirse a la sala de la subasta', joined.ok && joined.state.currentBid === null);

  const below = await api(`/api/vehicles/${id}/bids`, { token: ana, method: 'POST', body: JSON.stringify({ amount: base - 1 }) });
  check('Rechaza oferta menor al monto base', below.status === 400);

  const anonUpdate = nextEvent(sAnon, 'auction:update');
  const carlosViewer = nextEvent(sCarlos, 'auction:viewer');
  const first = await api(`/api/vehicles/${id}/bids`, { token: ana, method: 'POST', body: JSON.stringify({ amount: base }) });
  check('Acepta oferta igual al monto base', first.status === 201);
  const upd = await anonUpdate;
  check('Anónimo recibe la oferta en tiempo real', upd.currentBid === base);
  check('El evento público no expone identidad del postor', !('currentBidderId' in upd) && !JSON.stringify(upd).includes('ana'));
  const cv = await carlosViewer;
  check('Carlos no aparece como ganador', cv.isLeader === false);

  const same = await api(`/api/vehicles/${id}/bids`, { token: carlos, method: 'POST', body: JSON.stringify({ amount: base }) });
  check('Rechaza oferta igual a la actual', same.status === 400);

  const small = await api(`/api/vehicles/${id}/bids`, { token: carlos, method: 'POST', body: JSON.stringify({ amount: base * 1.05 }) });
  check('Rechaza incremento menor al 10%', small.status === 400);

  const anaViewer = nextEvent(sAna, 'auction:viewer');
  const carlosViewer2 = nextEvent(sCarlos, 'auction:viewer');
  const outbid = await api(`/api/vehicles/${id}/bids`, { token: carlos, method: 'POST', body: JSON.stringify({ amount: Math.ceil(base * 1.1) }) });
  check('Acepta incremento de 10%', outbid.status === 201);
  const av = await anaViewer;
  const cv2 = await carlosViewer2;
  check('Ana recibe "superada" en vivo', av.isLeader === false && av.hasBid === true);
  check('Carlos recibe "vas ganando" en vivo', cv2.isLeader === true);

  const mine = await api('/api/vehicles/mine', { token: ana });
  const anaVehicle = mine.body.items[0];
  if (anaVehicle) {
    const self = await api(`/api/vehicles/${anaVehicle.id}/bids`, { token: ana, method: 'POST', body: JSON.stringify({ amount: 9_999_999 }) });
    check('Rechaza oferta en vehículo propio', self.status === 403);
  }

  const closed = await api('/api/vehicles?status=CLOSED');
  if (closed.body.items[0]) {
    const late = await api(`/api/vehicles/${closed.body.items[0].id}/bids`, { token: carlos, method: 'POST', body: JSON.stringify({ amount: 9_999_999 }) });
    check('Rechaza oferta en subasta cerrada', late.status === 409);
  }

  sAna.close();
  sCarlos.close();
  sAnon.close();
  console.log(failures ? `\n${failures} verificación(es) fallaron` : '\nTodas las verificaciones pasaron');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
