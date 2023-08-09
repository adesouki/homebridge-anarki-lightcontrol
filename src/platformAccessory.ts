import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { PylyxRPILightSWPlatform } from './platform';
import fetch from 'node-fetch';

export class PylyxRPILightSW {
  private service: Service;
  private token: string;
  private ip: string;
  private port: number;
  private switchSerialNumber: string;
  private url: string;
 
  private states = {
    On: false,
  };

  constructor(
    private readonly platform: PylyxRPILightSWPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
	this.ip = this.platform.config.ip;
	this.port = this.platform.config.port;
	this.switchSerialNumber = this.platform.config.serial;
	this.token = this.platform.config.rpi_token
	this.url = "http://" + this.ip + ":" + this.port + "/light";
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
	
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

	this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

  }
  
  handleOnSet(value) {
	const that = this;
	let fRequestString: string = "";
    // 👇️ const response: Response
	if (value){ //ON
		fRequestString = "turn-on"
	} else { //OFF
	    fRequestString = "turn-off"
	}
	try {
		const fetchReq = fetch(
		  this.url, {
		      method: 'POST',
			  body: JSON.stringify({req: fRequestString,token: this.token,}),
			  headers: {
				  'Content-Type': 'application/json',
			      'Accept': 'application/json, text/plain, */*',
			  },
		  }
			).then(res=>res.json()).then(function(res) {
			if(res.token == that.token){				
				that.states.On = res.status == "on" ? true : false;
			}
		}).catch(function(error) {
			throw new that.platform.api.hap.HapStatusError(that.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
		});		
	  } catch (error) {
		  throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
	  }	
	  that.service.updateCharacteristic(that.platform.Characteristic.On, this.states.On);
   }

  handleOnGet() {
	const that = this;
	try {
		const fetchReq = fetch(
		  this.url, {
		      method: 'POST',
			  body: JSON.stringify({req: 'check-status',token: this.token,}),
			  headers: {
				  'Content-Type': 'application/json',
			      'Accept': 'application/json, text/plain, */*',
			  },
		  }).then(res=>res.json()).then(function(res) {
			if(res.token == that.token){
				if (res.status == "on"){
					that.states.On = true;
				} else if (res.status == "off"){//					
					that.states.On = false;					
				}
			}
		}).catch(function(error) {
			throw new that.platform.api.hap.HapStatusError(that.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
		});		
	  } catch (error) {
		  throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
	  }	
	  that.service.updateCharacteristic(that.platform.Characteristic.On, this.states.On);
	  return this.states.On;  
  }   
}
