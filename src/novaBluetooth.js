import SparkMD5 from 'spark-md5';

const ADVERTISING_SERVICE_UUID = 0xfeff;
const SERVICE_UUID = '02f00000-0000-0000-0000-00000000fe00';
const WRITE_UUID = '02f00000-0000-0000-0000-00000000ff01';
const NOTIFY_UUID = '02f00000-0000-0000-0000-00000000ff02';
const SALT = 'Mjgx1jAwXDBaMFcxCz3JBgNVBAYT4kJF7Rkw';
const MSG_DONE = '00020300050100';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bytes = (...values) => new Uint8Array(values.flat());
const hex = values => [...values].map(value => value.toString(16).padStart(2, '0')).join(' ');

export class NovaBluetooth {
  constructor(callback = () => {}) {
    this.callback = callback;
    this.authenticated = false;
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.handshakeState = 'disconnected';
    this.writeLock = Promise.resolve();
    this.connectPromise = null;
    this.resolveConnect = null;
    this.rejectConnect = null;
    this.connectTimer = null;
    this.onNotification = this.onNotification.bind(this);
    this.onDisconnected = this.onDisconnected.bind(this);
  }

  emit(type, message) {
    this.callback({ type, message, time: new Date().toISOString() });
  }

  supported() {
    return Boolean(navigator.bluetooth && window.isSecureContext);
  }

  async write(data) {
    if (!this.writeCharacteristic || !this.device?.gatt?.connected) {
      throw new Error('Robot GATT connection is not active');
    }
    const payload = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.emit('tx', hex(payload));
    // Match the reference application's serialized GATT writes.
    this.writeLock = this.writeLock.then(() => {
      if (!this.writeCharacteristic || !this.device?.gatt?.connected) {
        throw new Error('Robot disconnected before Bluetooth write');
      }
      return this.writeCharacteristic.writeValue(payload);
    });
    return this.writeLock;
  }

  onNotification(event) {
    const view = event.target.value;
    const data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const packetHex = [...data].map(value => value.toString(16).padStart(2, '0')).join('');
    this.emit('rx', hex(data));

    // This is deliberately the same continuous notification-driven handshake
    // used by the working Nova Drill Control application. Do not consume one
    // notification per awaited promise: devices may emit more than one packet.
    try {
      if (this.handshakeState === 'handshake') {
        const responseText = decoder.decode(data);
        if (responseText.length > 18) {
          const serial = responseText.slice(6, 18);
          const code = responseText.slice(18);
          let hashInput = serial;
          for (let i = 0; i < serial.length; i++) {
            hashInput += SALT[serial.charCodeAt(i) % 0x24];
          }
          hashInput += code;
          const digest = SparkMD5.hash(hashInput);

          // Match the reference app's response buffer and offset exactly.
          const response = new Uint8Array(3 + digest.length);
          response.set([0x08, 0x20, 0, 0]);
          response.set(encoder.encode(digest), 3);
          this.handshakeState = 'auth_1';
          this.write(response).catch(error => this.failConnection(error));
        }
      } else if (this.handshakeState === 'auth_1') {
        this.handshakeState = 'auth_2';
        this.write(bytes(1, 0, 0)).catch(error => this.failConnection(error));
      } else if (this.handshakeState === 'auth_2') {
        this.handshakeState = 'auth_3';
        this.write(bytes(2, 0, 0)).catch(error => this.failConnection(error));
      } else if (this.handshakeState === 'auth_3') {
        this.handshakeState = 'ready';
        this.write(bytes(0x80, 1, 0, 0)).then(() => {
          if (this.handshakeState !== 'ready' || !this.device?.gatt?.connected) return;
          this.authenticated = true;
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
          this.emit('connected', this.device?.name || 'Nova S Pro');
          this.resolveConnect?.({ name: this.device?.name || 'Nova S Pro' });
          this.resolveConnect = null;
          this.rejectConnect = null;
          this.connectPromise = null;
        }).catch(error => this.failConnection(error));
      }
    } catch (error) {
      this.failConnection(error);
    }

    if (packetHex.includes(MSG_DONE)) {
      this.emit('done', 'Drill step completed');
    }
  }

  failConnection(error) {
    if (this.authenticated) {
      this.emit('error', error?.message || String(error));
      return;
    }
    clearTimeout(this.connectTimer);
    this.connectTimer = null;
    const reject = this.rejectConnect;
    this.resolveConnect = null;
    this.rejectConnect = null;
    this.connectPromise = null;
    reject?.(error instanceof Error ? error : new Error(String(error)));
  }

  onDisconnected() {
    const wasConnecting = Boolean(this.rejectConnect);
    this.authenticated = false;
    this.handshakeState = 'disconnected';
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    clearTimeout(this.connectTimer);
    this.connectTimer = null;
    const reject = this.rejectConnect;
    this.resolveConnect = null;
    this.rejectConnect = null;
    this.connectPromise = null;
    if (wasConnecting) reject?.(new Error('Pongbot disconnected during Bluetooth authentication.'));
    this.emit('disconnected', 'Robot disconnected');
  }

  async connect() {
    if (!this.supported()) {
      throw new Error('Web Bluetooth requires Chrome or Edge on a secure HTTPS site.');
    }

    await this.reset();
    this.emit('info', 'Opening the Bluetooth device chooser');

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [ADVERTISING_SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID]
    });

    this.emit('info', `Selected ${this.device.name || 'unnamed Bluetooth device'}`);
    this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

    try {
      this.emit('info', 'Connecting to Pongbot GATT server');
      this.server = await this.device.gatt.connect();

      this.emit('info', 'Discovering Nova service');
      const service = await this.server.getPrimaryService(SERVICE_UUID);

      this.emit('info', 'Discovering Nova characteristics');
      const characteristics = await service.getCharacteristics();
      this.writeCharacteristic = characteristics.find(c => c.uuid === WRITE_UUID) || null;
      this.notifyCharacteristic = characteristics.find(c => c.uuid === NOTIFY_UUID) || null;

      if (!this.writeCharacteristic) throw new Error(`Write characteristic ${WRITE_UUID} is missing`);
      if (!this.notifyCharacteristic) throw new Error(`Notification characteristic ${NOTIFY_UUID} is missing`);

      await this.notifyCharacteristic.startNotifications();
      this.notifyCharacteristic.addEventListener('characteristicvaluechanged', this.onNotification);

      this.handshakeState = 'handshake';
      this.authenticated = false;
      this.emit('info', 'Starting Nova authentication handshake');

      this.connectPromise = new Promise((resolve, reject) => {
        this.resolveConnect = resolve;
        this.rejectConnect = reject;
        this.connectTimer = setTimeout(() => {
          this.failConnection(new Error(`Nova authentication timed out (last handshake stage: ${this.handshakeState}).`));
        }, 15000);
      });

      // Reference app's first handshake command.
      await this.write(bytes(0x07, 0, 0, 0));
      return await this.connectPromise;
    } catch (error) {
      const selectedName = this.device?.name || 'selected device';
      await this.reset();
      throw new Error(`Could not complete Nova connection with ${selectedName}: ${error.message}`);
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

  packet(drill, options = {}) {
    let balls = (drill.balls || []).map(ball => ({ ...ball }));
    if (!balls.length) throw new Error('The selected drill contains no balls.');

    let mode = 0;
    let value = Math.max(1, Math.min(10, +options.minutes || 1));
    if (options.mode === 'balls') {
      const target = Math.max(1, Math.min(999, +options.ballCount || 1));
      value = Math.max(1, Math.ceil(target / balls.length));
      mode = 1;
      balls = balls.map(ball => ({ ...ball, reps: 1 }));
    }

    const payload = balls.flatMap(ball => [...this.pack(ball)]);
    // Important: spread payload bytes into the packet. Passing the typed array
    // as one nested value silently converted the complete payload to a zero byte.
    return bytes(129, 4 + payload.length, mode, value & 255, (value >> 8) & 255, 0, ...payload);
  }

  async start(drill, options) {
    if (!this.authenticated || !this.device?.gatt?.connected) {
      throw new Error('Connect robot first; Bluetooth GATT is not active.');
    }
    await this.write(this.packet(drill, options));
    this.emit('started', drill.name);
  }

  pause() { return this.write(bytes(128, 1, 0, 2)); }
  resume() { return this.write(bytes(128, 1, 0, 3)); }
  stop() { return this.write(bytes(128, 1, 0, 1)); }

  async reset() {
    this.authenticated = false;
    this.handshakeState = 'disconnected';
    clearTimeout(this.connectTimer);
    this.connectTimer = null;
    const reject = this.rejectConnect;
    this.resolveConnect = null;
    this.rejectConnect = null;
    this.connectPromise = null;
    reject?.(new Error('Bluetooth connection reset'));
    try {
      this.notifyCharacteristic?.removeEventListener('characteristicvaluechanged', this.onNotification);
      this.device?.removeEventListener('gattserverdisconnected', this.onDisconnected);
      if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    } catch {}
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.writeLock = Promise.resolve();
  }
}
