import EventEmitter from 'events';
import crypto from 'crypto';

const SERVICE_UUID = 'c3b5d8a4-90f6-4a6e-8c6a-4f6ad3e5b1c0';
const INBOX_UUID = '28c745d5-07e8-49f3-9f70-96d84b4f16b1';
const OUTBOX_UUID = '836c4120-1aa6-4cae-a4c8-834807c0d64b';

function shortUuid(uuid) {
  return uuid.replace(/-/g, '');
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8');
}

function decodePayload(buffer) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    return null;
  }
}

export function computeBluetoothIdentifier(username) {
  return crypto.createHash('sha256').update(username).digest('hex').slice(0, 20);
}

class OutboxCharacteristic {
  constructor(bleno) {
    const { Characteristic } = bleno;
    const self = this;
    this._characteristic = new Characteristic({
      uuid: OUTBOX_UUID,
      properties: ['notify'],
      onSubscribe(maxValueSize, updateValueCallback) {
        self._updateValueCallback = updateValueCallback;
      },
      onUnsubscribe() {
        self._updateValueCallback = null;
      },
    });
    this._updateValueCallback = null;
  }

  get characteristic() {
    return this._characteristic;
  }

  push(payload) {
    if (this._updateValueCallback) {
      try {
        this._updateValueCallback(encodePayload(payload));
      } catch (error) {
        console.warn('Bluetooth outbox notify failed', error.message);
      }
    }
  }
}

export class BluetoothRelay extends EventEmitter {
  constructor() {
    super();
    this.available = false;
    this.enabled = false;
    this.activeContext = null;
    this.peers = new Map();
    this.ready = this.#initialise();
  }

  async #initialise() {
    try {
      const nobleModule = await import('@abandonware/noble');
      const blenoModule = await import('@abandonware/bleno');
      this.noble = nobleModule.default || nobleModule;
      this.bleno = blenoModule.default || blenoModule;
      this.available = true;
      this.#setupNoble();
      this.#setupBleno();
    } catch (error) {
      this.available = false;
      console.warn('Bluetooth transport unavailable:', error.message);
    }
  }

  async enableForUser({ userId, username, identifier }) {
    await this.ready;
    if (!this.available) throw new Error('Bluetooth stack not available');
    this.activeContext = { userId, username, identifier };
    this.enabled = true;
    if (this.bleno?.state === 'poweredOn') {
      this.#startAdvertising();
    }
  }

  async disableForUser(userId) {
    await this.ready;
    if (!this.activeContext || this.activeContext.userId !== userId) return;
    this.activeContext = null;
    this.enabled = false;
    if (this.bleno) {
      try {
        this.bleno.stopAdvertising();
      } catch (error) {
        console.warn('Failed to stop Bluetooth advertising', error.message);
      }
    }
  }

  async sendMessage({ fromIdentifier, toIdentifier, payload }) {
    await this.ready;
    if (!this.available) throw new Error('Bluetooth stack not available');
    const entry = this.peers.get(toIdentifier);
    const peripheral = entry?.peripheral;
    if (!peripheral) {
      throw new Error('Bluetooth peer not in range');
    }
    const message = {
      ...payload,
      transport: 'bluetooth',
      from: fromIdentifier,
      to: toIdentifier,
      timestamp: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      peripheral.connect((connectError) => {
        if (connectError) {
          reject(connectError);
          return;
        }
        peripheral.discoverServices([shortUuid(SERVICE_UUID)], (serviceErr, services) => {
          if (serviceErr || !services?.length) {
            peripheral.disconnect();
            reject(serviceErr || new Error('Bluetooth service unavailable'));
            return;
          }
          const [service] = services;
          service.discoverCharacteristics([shortUuid(INBOX_UUID)], (charErr, characteristics) => {
            if (charErr || !characteristics?.length) {
              peripheral.disconnect();
              reject(charErr || new Error('Bluetooth inbox missing'));
              return;
            }
            const [characteristic] = characteristics;
            characteristic.write(encodePayload(message), false, (writeErr) => {
              peripheral.disconnect();
              if (writeErr) reject(writeErr);
              else resolve(true);
            });
          });
        });
      });
    });
  }

  pushOutbound(payload) {
    if (this.outboxCharacteristic) {
      this.outboxCharacteristic.push(payload);
    }
  }

  #setupNoble() {
    if (!this.noble) return;
    this.noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        try {
          this.noble.startScanning([shortUuid(SERVICE_UUID)], true);
        } catch (error) {
          console.warn('Unable to start Bluetooth scanning', error.message);
        }
      } else {
        try {
          this.noble.stopScanning();
        } catch (error) {
          // ignore
        }
      }
    });

    this.noble.on('discover', (peripheral) => {
      const advertisement = peripheral?.advertisement || {};
      const hasService = (advertisement.serviceUuids || []).includes(shortUuid(SERVICE_UUID));
      if (!hasService) return;
      const identifier = this.#extractIdentifier(advertisement.localName);
      if (!identifier) return;
      this.peers.set(identifier, {
        peripheral,
        lastSeen: Date.now(),
        rssi: peripheral?.rssi ?? null,
      });
    });
  }

  #setupBleno() {
    if (!this.bleno) return;
    const { Characteristic, PrimaryService } = this.bleno;
    const self = this;

    const inbox = new Characteristic({
      uuid: INBOX_UUID,
      properties: ['write'],
      onWriteRequest(data, offset, withoutResponse, callback) {
        if (offset) {
          callback(Characteristic.RESULT_ATTR_NOT_LONG);
          return;
        }
        const payload = decodePayload(data);
        if (!payload) {
          callback(Characteristic.RESULT_UNLIKELY_ERROR);
          return;
        }
        self.#handleInbound(payload);
        callback(Characteristic.RESULT_SUCCESS);
      },
    });

    this.outboxCharacteristic = new OutboxCharacteristic(this.bleno);

    this.service = new PrimaryService({
      uuid: SERVICE_UUID,
      characteristics: [inbox, this.outboxCharacteristic.characteristic],
    });

    this.bleno.on('stateChange', (state) => {
      if (state === 'poweredOn' && this.enabled && this.activeContext) {
        this.#startAdvertising();
      } else if (state !== 'poweredOn') {
        try {
          this.bleno.stopAdvertising();
        } catch (error) {
          // ignore
        }
      }
    });
  }

  #startAdvertising() {
    if (!this.bleno || !this.service || !this.activeContext) return;
    const name = `Enc-${this.activeContext.identifier}`;
    try {
      this.bleno.stopAdvertising(() => {
        this.bleno.setServices([this.service], (err) => {
          if (err) {
            console.warn('Failed to set Bluetooth services', err.message);
            return;
          }
          this.bleno.startAdvertising(name, [SERVICE_UUID], (startErr) => {
            if (startErr) {
              console.warn('Bluetooth advertising error', startErr.message);
            }
          });
        });
      });
    } catch (error) {
      console.warn('Bluetooth advertising setup failed', error.message);
    }
  }

  #extractIdentifier(localName = '') {
    if (!localName.startsWith('Enc-')) return null;
    return localName.slice(4);
  }

  #handleInbound(payload) {
    if (!payload?.to || !this.activeContext) return;
    if (payload.to !== this.activeContext.identifier) return;
    this.emit('message', payload);
  }

  listPeers() {
    const now = Date.now();
    const peers = [];
    for (const [identifier, entry] of this.peers.entries()) {
      if (now - entry.lastSeen > 60_000) {
        this.peers.delete(identifier);
        continue;
      }
      peers.push({
        identifier,
        lastSeen: entry.lastSeen,
        rssi: entry.rssi ?? null,
      });
    }
    return peers.sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
  }
}
