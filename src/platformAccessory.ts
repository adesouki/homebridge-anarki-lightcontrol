import { Service, PlatformAccessory, PlatformConfig } from 'homebridge';

import { PyluxRPILightSWPlatform } from './platform';
import fetch from 'node-fetch';
/* eslint-disable */
const pollingtoevent = require('polling-to-event');

export class PyluxRPILightSW {
  private service: Service;
  private token: string;
  private ip: string;
  private port: number;
  private polling_interval: number;
  private switchSerialNumber: string;
  private url: string;

  private states = {
    On: false,
  };

  constructor(
    private readonly platform: PyluxRPILightSWPlatform,
    private readonly accessory: PlatformAccessory,
    lightSwitchConfig: PlatformConfig,
  ) {
    this.ip = lightSwitchConfig.ip as string;
    this.port = lightSwitchConfig.port as number;
    this.switchSerialNumber = lightSwitchConfig.serial as string;
    this.token = lightSwitchConfig.rpi_token as string;
    this.url = 'http://' + this.ip + ':' + this.port + '/light';
    this.polling_interval = lightSwitchConfig.polling_interval as number;
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Pylux Solutions, LLC.',
      )
      .setCharacteristic(
        this.platform.Characteristic.Model,
        'Pylux Smart Light Switch',
      )
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.switchSerialNumber,
      );

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.name,
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.switchStatusPolling();
  }

  switchStatusPolling() {
    pollingtoevent(
      () => {
        this.getStatus(false);
      },
      {
        longpolling: true,
        interval: this.polling_interval,
        longpollEventName: 'statuspoll',
      },
    );
  }

  getStatus(exp: boolean) {
    try {
      fetch(this.url, {
        method: 'POST',
        body: JSON.stringify({ req: 'check-status', token: this.token }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.token === this.token) {
            if (res.status === 'on') {
              this.states.On = true;
            } else if (res.status === 'off') {
              this.states.On = false;
            }
          }
        })
        .catch((error) => {
          this.platform.log.info('ERROR:', error);
          if (exp) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        });
    } catch (error) {
      this.platform.log.info('ERROR:', error);
      if (exp) {
        throw new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
        );
      }
    }
  }

  handleOnSet(value) {
    let fRequestString: string;
    // 👇️ const response: Response
    if (value) {
      //ON
      fRequestString = 'turn-on';
    } else {
      //OFF
      fRequestString = 'turn-off';
    }
    try {
      fetch(this.url, {
        method: 'POST',
        body: JSON.stringify({ req: fRequestString, token: this.token }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.token === this.token) {
            this.states.On = res.status === 'on' ? true : false;
          }
        })
        .catch((error) => {
          this.platform.log.info('ERROR:', error);
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        });
    } catch (error) {
      this.platform.log.info('ERROR:', error);
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      this.states.On,
    );
  }

  handleOnGet() {
    this.getStatus(true);

    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      this.states.On,
    );

    return this.states.On;
  }
}
