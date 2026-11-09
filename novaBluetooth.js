import SparkMD5 from 'spark-md5';

// UUIDs copied from the working Olanga Nova S Pro client.
const SERVICE = '02f00000-0000-0000-0000-00000000fe00';
const WRITE = '02f00000-0000-0000-0000-00000000ff01';
const NOTIFY = '02f00000-0000-0000-0000-00000000ff02';
const ADVERTISED_SERVICE = 0xfeff;
const SALT = 'Mjgx1jAwXDBaMFcxCz3JBgNVBAYT4kJF7Rkw';

const enc = new TextEncoder();
const dec = new TextDecoder();
const bytes = (...values) => new Uint8Array(values.flat());
const hex = data => [...data].map(v => v.toString(16).padStart(2, '0')).join(' ');

export class NovaBluetooth {
  constructor(callback = () => {}) {
    this.cb = callback;
    this.waiters = [];
    this.authenticated = false;
    this.mock = false;
  }

  supported() {
    return !!navigator.bluetooth && window.isSecureContext;
  }

  emit(type, message) {
    this.cb({ time: new Date().toISOString(), type, message });
  }

  async connect({ mock = false } = {}) {
    if (mock) {
      this.mock = this.authenticated = true;
      this.emit('connected', 'Mock Nova connected');
      return { name: 'Mock Nova S Pro', mock: true };
    }

    if (!this.supported()) {
      throw new Error('Web Bluetooth requires Chrome/Edge on HTTPS.');
    }

    // Olanga discovers the robot via advertised service 0xFEFF,
    // then explicitly requests the full custom GATT service.
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [ADVERTISED_SERVICE] }],
      optionalServices: [SERVICE]
    });

    this.device.addEventListener('gattserverdisconnected', () => this.disconnected());

    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE);
    const chars = await service.getCharacteristics();

    this.w = chars.find(c => c.uuid.toLowerCase() === WRITE);
    this.n = chars.find(c => c.uuid.toLowerCase() === NOTIFY);

    if (!this.w || !this.n) {
      throw new Error('Nova GATT characteristics not found (write/notify UUID mismatch).');
    }

    await this.n.startNotifications();
    this.n.addEventListener('characteristicvaluechanged', event => {
      const value = event.target.value;
      const data = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      this.notification(new Uint8Array(data));
    });

    await this.auth();

    this.keep = setInterval(() => {
      if (this.authenticated && !this.mock) {
        this.write(bytes(0x83, 6, 0)).catch(() => {});
      }
    }, 10000);

    this.emit('connected', `Authenticated with ${this.device.name || 'Nova S Pro'}`);
    return { name: this.device.name || 'Nova S Pro', mock: false };
  }

  notification(data) {
    this.emit('rx', hex(data));
    // Nova reports completion of the current drill batch with this exact message.
    // The app uses it to resend the selected drill while the session timer is active.
    if (hex(data).toLowerCase().replaceAll(' ', '').includes('00020300050100')) {
      this.emit('drillDone', 'Robot completed the current drill batch');
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(data);
    }
  }

  // Register the notification waiter BEFORE transmitting. This avoids
  // losing fast Nova responses between writeValue() and wait().
  wait(ms = 8000) {
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter(w => w !== waiter);
          reject(new Error('Robot notification timeout'));
        }, ms)
      };
      this.waiters.push(waiter);
    });
  }

  async write(data) {
    this.emit('tx', hex(data));
    if (this.mock) return;
    if (!this.w) throw new Error('Robot is not connected');
    await this.w.writeValue(data);
  }

  async step(data) {
    const response = this.wait();
    try {
      await this.write(data);
    } catch (error) {
      this.waiters = [];
      throw error;
    }
    return response;
  }

  async auth() {
    // Match Olanga's handshake sequence exactly.
    const response = await this.step(bytes(0x07, 0, 0, 0));

    if (response.length <= 18) {
      throw new Error(`Authentication response too short (${response.length} bytes)`);
    }

    const serial = dec.decode(response.slice(6, 18)).replace(/\0/g, '');
    const code = dec.decode(response.slice(18)).replace(/\0/g, '');
    let hashInput = serial;

    for (const character of serial) {
      hashInput += SALT[character.charCodeAt(0) % 0x24];
    }
    hashInput += code;

    const digest = SparkMD5.hash(hashInput);
    const authPacket = new Uint8Array(3 + digest.length);
    authPacket.set([0x08, 0x20, 0, 0]);
    authPacket.set(enc.encode(digest), 3);

    await this.step(authPacket);
    await this.step(bytes(0x01, 0, 0));
    await this.step(bytes(0x02, 0, 0));

    // Olanga sends this final enable command without waiting for another reply.
    await this.write(bytes(0x80, 1, 0, 0));
    this.authenticated = true;
  }

  rpm(ball) {
    const spin = (ball.type === 'back' ? -1 : 1) * Math.abs(+ball.spin);
    return [
      Math.max(400, Math.min(7500, Math.round(970 + 630.5 * +ball.speed + 342 * spin))),
      Math.max(400, Math.min(7500, Math.round(970 + 630.5 * +ball.speed - 342 * spin)))
    ];
  }

  pack(ball) {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);
    const [topRpm, bottomRpm] = this.rpm(ball);
    view.setUint32(0, topRpm, true);
    view.setUint32(4, bottomRpm, true);
    view.setFloat32(8, (+ball.height + 50) / 150 * 50 - 20, true);
    view.setFloat32(12, (+ball.drop + 10) / 20 * 44 - 22, true);
    view.setFloat32(16, +ball.bpm / 100 + 0.5, true);
    view.setUint32(20, +ball.reps || 1, true);
    return new Uint8Array(buffer);
  }

  packet(drill) {
    if (!drill?.balls?.length) throw new Error('No balls');
    if (drill.balls.length > 20) throw new Error('Maximum 20 balls');

    // Match Olanga's verified Nova packet structure exactly:
    // 0x81 | uint16(payload length + 4, LE) | 0x01 | uint16(1, LE) | 0x00
    // followed by one 24-byte record per ball.
    const payloadLength = drill.balls.length * 24;
    const packet = new Uint8Array(7 + payloadLength);
    const view = new DataView(packet.buffer);
    view.setUint8(0, 0x81);
    view.setUint16(1, 4 + payloadLength, true);
    view.setUint8(3, 1);
    view.setUint16(4, 1, true);
    view.setUint8(6, 0);

    let offset = 7;
    for (const ball of drill.balls) {
      packet.set(this.pack(ball), offset);
      offset += 24;
    }
    return packet;
  }

  async start(drill) {
    if (!this.authenticated) throw new Error('Connect robot first');
    await this.write(this.packet(drill));
    this.emit('started', `Started ${drill.name}`);
  }

  control(command, eventName) {
    return this.write(bytes(0x80, 1, 0, command))
      .then(() => this.emit(eventName, eventName));
  }

  pause() { return this.control(2, 'paused'); }
  resume() { return this.control(3, 'resumed'); }
  stop() { return this.control(1, 'stopped'); }

  disconnected() {
    clearInterval(this.keep);
    this.authenticated = this.mock = false;
    this.w = this.n = null;
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Robot disconnected'));
    }
    this.waiters = [];
    this.emit('disconnected', 'Robot disconnected');
  }

  async reset() {
    clearInterval(this.keep);
    this.authenticated = this.mock = false;
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Connection reset'));
    }
    this.waiters = [];
    try {
      if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    } catch {}
    this.device = this.w = this.n = null;
  }
}
