/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

export const PRIVATE = Symbol('@@webxr-polyfill/XRLightProbe');

export default class XRLightProbe {
	constructor(options = {}){
		this[PRIVATE] = {
			indirectIrradiance: options.indirectIrradiance
		};
	}

	get indirectIrradiance() {
		return this[PRIVATE].indirectIrradiance;
	}

	get primaryLightDirection() {
		throw new Error('Not implemented');
	}

	get primaryLightIntensity() {
		throw new Error('Not implemented');
	}

	get sphericalHarmonicsCoefficients() {
		throw new Error('Not implemented');
	}

	get sphericalHarmonicsOrientation() {
		throw new Error('Not implemented');
	}
}