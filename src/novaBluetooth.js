import SparkMD5 from 'spark-md5';

const SERVICE_UUID = '02f00000-0000-0000-0000-00000000fe00';
const WRITE_UUID = '02f0ff01-0000-0000-0000-00000000fe00';
const NOTIFY_UUID = '02f0ff02-0000-0000-0000-00000000fe00';
const SALT = 'Mjgx1jAwXDBaMFcxCz3JBgNVBAYT4kJF7Rkw';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bytes = (...values) => new Uint8Array(values.flat());
const hex = values => [...values].map(value => value.toString(16).padStart(2, '0')).join(' ');

export class NovaBluetooth {
  constructor(callback = () => {}) {
    this.callback = callback;
    this.waiters = [];
    this.authenticated = false;
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.onNotification = this.onNotification.bind(this);
    this.onDisconnected = this.onDisconnected.bind(this);
  }

  emit(type, message) {
    this.callback({ type, message, time: new Date().toISOString() });
  }

  supported() {
    return Boolean(navigator.bluetooth && window.isSecureContext);
  }

  wait(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve: data => {
          clearTimeout(timer);
          resolve(data);
        },
        reject
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter(entry => entry !== waiter);
        reject(new Error('Robot notification timeout'));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  onNotification(event) {
    const data = new Uint8Array(event.target.value.buffer);
    this.emit('rx', hex(data));
    this.waiters.shift()?.resolve(data);
  }

  onDisconnected() {
    this.authenticated = false;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.emit('disconnected', 'Robot disconnected');
  }

  async write(data) {
    this.emit('tx', hex(data));
    if (!this.writeCharacteristic) throw new Error('Robot not connected');
    await this.writeCharacteristic.writeValue(data);
  }

  async step(data) {
    const responsePromise = this.wait();
    await this.write(data);
    return responsePromise;
  }

  async connect() {
    if (!this.supported()) {
      throw new Error('Web Bluetooth requires Chrome or Edge on a secure HTTPS site.');
    }

    await this.reset();
    this.emit('info', 'Opening the Bluetooth device chooser');

    // Match the proven discovery method used by the working Nova Drill Control
    // application. The robot advertises the standard 16-bit service 0xFEFF;
    // its private Nova GATT service (SERVICE_UUID) is discovered after connect.
    // This keeps unrelated Bluetooth devices out of the chooser.
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [0xfeff] }],
      optionalServices: [SERVICE_UUID]
    });

    this.emit('info', `Selected ${this.device.name || 'unnamed Bluetooth device'}`);
    this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

    try {
      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(SERVICE_UUID);
      this.writeCharacteristic = await service.getCharacteristic(WRITE_UUID);
      this.notifyCharacteristic = await service.getCharacteristic(NOTIFY_UUID);
      await this.notifyCharacteristic.startNotifications();
      this.notifyCharacteristic.addEventListener('characteristicvaluechanged', this.onNotification);

      const first = await this.step(bytes(7, 0, 0, 0));
      if (first.length < 19) throw new Error('Nova authentication response is too short');
      const serial = decoder.decode(first.slice(6, 18)).replace(/\0/g, '');
      const code = decoder.decode(first.slice(18)).replace(/\0/g, '');
      const salted = [...serial].map(character => SALT[character.charCodeAt(0) % 36]).join('');
      const digest = SparkMD5.hash(serial + salted + code);

      await this.step(bytes(8, 32, 0, ...encoder.encode(digest)));
      await this.step(bytes(1, 0, 0));
      await this.step(bytes(2, 0, 0));
      await this.write(bytes(128, 1, 0, 0));

      this.authenticated = true;
      this.emit('connected', this.device.name || 'Nova S Pro');
      return { name: this.device.name || 'Nova S Pro' };
    } catch (error) {
      const selectedName = this.device?.name || 'selected device';
      await this.reset();
      if (error?.name === 'NotFoundError') {
        throw new Error(`The selected device (${selectedName}) does not expose the expected Nova GATT service. Discovery is filtered by the Pongbot advertising service 0xFEFF; please power-cycle the robot and try again.`);
      }
      throw new Error(`Could not connect to ${selectedName}: ${error.message}`);
    }
  }

  rpm(ball) {
    const spin = (ball.type === 'back' ? -1 : 1) * Math.abs(+ball.spin);
    return [
      Math.max(400, Math.min(7500, Math.round(970 + 630.5 * ball.speed + 342 * spin))),
      Math.max(400, Math.min(7500, Math.round(970 + 630.5 * ball.speed - 342 * spin)))
    ];
  }

  pack(ball) {
    const buffer = new ArrayBuffer(24);
    const view = new DataView(buffer);
    const [top, bottom] = this.rpm(ball);
    view.setUint32(0, top, true);
    view.setUint32(4, bottom, true);
    view.setFloat32(8, (+ball.height + 50) / 150 * 50 - 20, true);
    view.setFloat32(12, (+ball.drop + 10) / 20 * 44 - 22, true);
    view.setFloat32(16, +ball.bpm / 100 + 0.5, true);
    view.setUint32(20, +ball.reps || 1, true);
    return new Uint8Array(buffer);
  }

  packet(drill, options) {
    let balls = drill.balls.map(ball => ({ ...ball }));
    let mode = 0;
    let value = Math.max(1, Math.min(10, +options.minutes || 1));
    if (options.mode === 'balls') {
      const target = Math.max(1, Math.min(999, +options.ballCount || 1));
      value = Math.max(1, Math.ceil(target / balls.length));
      mode = 1;
      balls = balls.map(ball => ({ ...ball, reps: 1 }));
    }
    const payload = balls.flatMap(ball => [...this.pack(ball)]);
    return bytes(129, 4 + payload.length, mode, value & 255, (value >> 8) & 255, 0, payload);
  }

  async start(drill, options) {
    if (!this.authenticated) throw new Error('Connect robot first');
    await this.write(this.packet(drill, options));
    this.emit('started', drill.name);
  }

  pause() { return this.write(bytes(128, 1, 0, 2)); }
  resume() { return this.write(bytes(128, 1, 0, 3)); }
  stop() { return this.write(bytes(128, 1, 0, 1)); }

  async reset() {
    this.authenticated = false;
    for (const waiter of this.waiters.splice(0)) waiter.reject?.(new Error('Bluetooth connection reset'));
    try {
      this.notifyCharacteristic?.removeEventListener('characteristicvaluechanged', this.onNotification);
      this.device?.removeEventListener('gattserverdisconnected', this.onDisconnected);
      if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    } catch {}
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
  }
}
