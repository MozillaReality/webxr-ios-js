/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
/*
XRLightEstimate represents the attributes of environmental light as supplied by the device's sensors.
*/
export default class XRLightEstimate {
	constructor(){
		this._ambientLightIntensity = 1
	}

	set ambientIntensity(value){
		// A value of 1000 represents "neutral" lighting. (https://developer.apple.com/documentation/arkit/arlightestimate/2878308-ambientintensity)
		this._ambientLightIntensity = value / 1000
	}

	get ambientIntensity(){
		//readonly attribute double ambientIntensity;
		return this._ambientLightIntensity
	}

	getAmbientColorTemperature(){
		//readonly attribute double ambientColorTemperature;
		throw new Error('Not implemented')
	}
}