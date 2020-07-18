import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { SchmidtScoreboardPlatform } from './platform';

import axios from 'axios';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SchmidtScoreboardAccessory {
  private service: Service;
  private url: string;

  constructor(
    private readonly platform: SchmidtScoreboardPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.url = 'http://' + this.accessory.displayName + ':5005/';

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'MarkSchmidt')
      .setCharacteristic(this.platform.Characteristic.Model, 'SS-001');

    this.service = this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television);

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the mode Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

    this.service.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);

    // handle input source changes
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .on('set', async (newValue, callback) => {
        this.platform.log.info('set Active Identifier => setNewValue: ' + newValue);
        try {
          await this.sendScoreboardRequest('setSport', { 'sport': newValue });
          callback(null);
        } catch {
          callback(Error('Failed to connect'));
        }
      })
      .on('get', async (callback) => {
        try {
          const response = await this.sendScoreboardRequest('');
          callback(null, response['screen_on']);
        } catch {
          callback('Connection error');
        }
      });

    const hockeyService = this.accessory.getService('Hockey') ||
      this.accessory.addService(this.platform.Service.InputSource, 'hockey', 'Hockey');

    hockeyService
      .setCharacteristic(this.platform.Characteristic.Identifier, 0)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Hockey')
      .setCharacteristic(this.platform.Characteristic.CurrentVisibilityState, this.platform.Characteristic.CurrentVisibilityState.SHOWN)
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.service.addLinkedService(hockeyService); // link to tv service

    const baseballService = this.accessory.getService('Baseball') ||
      this.accessory.addService(this.platform.Service.InputSource, 'baseball', 'Baseball');
    baseballService
      .setCharacteristic(this.platform.Characteristic.Identifier, 1)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Baseball')
      .setCharacteristic(this.platform.Characteristic.CurrentVisibilityState, this.platform.Characteristic.CurrentVisibilityState.SHOWN)
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.service.addLinkedService(baseballService); // link to tv service

    const clockService = this.accessory.getService('Clock') ||
      this.accessory.addService(this.platform.Service.InputSource, 'clock', 'Clock');
    clockService
      .setCharacteristic(this.platform.Characteristic.Identifier, 50)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Clock')
      .setCharacteristic(this.platform.Characteristic.CurrentVisibilityState, this.platform.Characteristic.CurrentVisibilityState.SHOWN)
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.service.addLinkedService(clockService); // link to tv service


    this.service.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);


  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to turn your device on/off
    try {
      await this.sendScoreboardRequest('setPower', { 'screen_on': value });
      callback(null);
    } catch {
      callback(Error('Failed to connect'));
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
  
   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(callback: CharacteristicGetCallback) {
    try {
      const response = await this.sendScoreboardRequest('');
      callback(null, response['screen_on']);
    } catch {
      callback(Error('Failed to connect'));
    }
  }

  async sendScoreboardRequest(endpoint: string, body?): Promise<JSON> {
    try {
      const response = body === undefined ? await axios.get(this.url + endpoint) : await axios.post(this.url + endpoint, body);
      this.platform.log.info('Done calling get input');
      if (response.status !== 200) {
        this.platform.log.info('Error response');
        return Promise.reject();
      } else {
        return response.data;
      }
    } catch (error) {
      this.platform.log.info(error);
      return Promise.reject();
    }
  }
}
