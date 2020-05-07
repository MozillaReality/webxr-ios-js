/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill';

import XRSystem from 'webxr-polyfill/src/api/XRSystem';
import XRSession, {PRIVATE as XRSESSION_PRIVATE} from 'webxr-polyfill/src/api/XRSession';

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4';
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3';

import API from './extensions/index';

import ARKitDevice from './arkit/ARKitDevice';
import ARKitWrapper from './arkit/ARKitWrapper';

import XRAnchor from './extensions/XRAnchor';
import XRHitTestResult from './extensions/XRHitTestResult';
import XRHitTestSource from './extensions/XRHitTestSource';

const _workingMatrix = mat4.create();
const _workingMatrix2 = mat4.create();

// Monkey patch the WebXR polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchNavigatorXR = function() {
	this.xr = new XRSystem(Promise.resolve(new ARKitDevice(this.global)));
	this.xr._mozillaXRViewer = true;
	Object.defineProperty(this.global.navigator, 'xr', {
		value: this.xr,
		configurable: true,
	});
};

const mobileIndex =  navigator.userAgent.indexOf("Mobile/");
const isWebXRViewer = navigator.userAgent.indexOf("WebXRViewer") !== -1 ||
			((navigator.userAgent.indexOf("iPhone") !== -1 || navigator.userAgent.indexOf("iPad") !== -1)
				&& mobileIndex !== -1 && navigator.userAgent.indexOf("AppleWebKit") !== -1
				&& navigator.userAgent.indexOf(" ", mobileIndex) === -1);

// Install the polyfill IF AND ONLY IF we're running in the WebXR Viewer
const xrPolyfill =  !isWebXRViewer ? null : new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
});

/**
 * Take a vec3 direction vector through the screen and return normalized x,y screen coordinates
 * @param ray {vec3}
 * @param projectionMatrix {mat4}
 * @return [x,y] in range [0,1]
 */
const _convertRayToARKitScreenCoordinates = (ray, projectionMatrix) => {
	const proj = vec3.transformMat4(vec3.create(), ray, projectionMatrix);
//	console.log('project', ...proj);

	const x = (proj[0] + 1) / 2;
	const y = (-proj[1] + 1) / 2;

//	console.log('result', x, y);
	return [x, y];
};

let _arKitWrapper = null;

// Install a few proposed AR extensions to the WebXR Device API
// by adding the methods to XR*.prototype.
// ARKitWrapper talks to Apple ARKit and instanciates XR resources
// so that the extended WebXR API for AR basically just calls ARKitWrapper methods.

// Anchors
// Specification: https://github.com/immersive-web/anchors

const installAnchorsExtension = () => {
	if (window.XRFrame === undefined) { return; }

	/**
	 * @param value {XRHitResult|Float32Array}
	 * @param referenceSpace {XRReferenceSpace}
	 * @return {Promise<XRAnchor>}
	 */
	XRFrame.prototype.addAnchor = async function addAnchor(value, referenceSpace) {
		if (!this.session[XRSESSION_PRIVATE].immersive) {
			return Promise.reject(); 
		}

		const workingMatrix1 = mat4.create();

		// @TODO: Replace XRHitResult with XRHitTestResult if needed
		/*
		if (value instanceof XRHitResult) {
			// let tempAnchor = await _arKitWrapper.createAnchorFromHit(value._hit);
			// value = tempAnchor.modelMatrix

			mat4.multiply(workingMatrix1, value._hit.anchor_transform, value._hit.local_transform)
			value = workingMatrix1
		} 
		*/
		if (value instanceof Float32Array) {
			return new Promise((resolve, reject) => {
				// we assume that the eye-level reference frame (local reference space)
				// was obtained during requestSession below in this polyfill. 
				// needs to be done so that this method doesn't actually need to 
				// be async and wait

				let localReferenceSpace = this.session[XRSESSION_PRIVATE]._localSpace;
				mat4.copy(_workingMatrix, this.getPose(localReferenceSpace, referenceSpace).transform.matrix);
				const anchorInWorldMatrix = mat4.multiply(mat4.create(), _workingMatrix, value);
				_arKitWrapper.createAnchor(anchorInWorldMatrix)
					.then(resolve)
					.catch((...params) => {
						console.error('could not create anchor', ...params);
						reject();
					});
			});
		} else {
			return Promise.reject('invalid value passed to addAnchor ' + value);
		}
	};

	/**
	 * Note: Defining detach() method here, not in XRAnchor.js, so far because
	 *       I'm not sure if XRAnchor.js should have a dependency with _arKitWrapper.
	 *
	 * Note: Currently (10/29/2019) the explainer doesn't describe the return type
	 *       from detach(). So returning Promise<void> so far.
	 * @return {Promise<void>}
	 */
	XRAnchor.prototype.detach = async function removeAnchor() {
		return new Promise((resolve, reject) => {
			_arKitWrapper.removeAnchor(this);
			resolve();
		});
	};

	// @TODO: Support update event
};

// Hit-Testing
// Specification: https://github.com/immersive-web/hit-test/

const installHitTestingExtension = () => {
	if (window.XRSession === undefined) { return };

	// Hit test API

	XRSession.prototype.requestHitTestSource = function requestHitTestSource(options = {}) {
		const source = new XRHitTestSource(this, options);
		const device = this[XRSESSION_PRIVATE].device;
		device.addHitTestSource(source);
		return Promise.resolve(source);
	};

	XRSession.prototype.requestHitTestSourceForTransientInput = function requestHitTestSourceForTransientInput() {
		throw new Error('requestHitTestSourceForTransientInput() is not supported yet.');
	};

	XRFrame.prototype.getHitTestResults = function getHitTestResults(hitTestSource) {
		const device = this.session[XRSESSION_PRIVATE].device;
		const transforms = device.getHitTestResults(hitTestSource);
		const results = [];
		for (const transform of transforms) {
			results.push(new XRHitTestResult(this, transform));
		}
		return results;
	};

	XRFrame.prototype.geetTransientInputHitTestResult = function geetTransientInputHitTestResult() {
		throw new Error('geetTransientInputHitTestResult() is not supported yet.');
	};
};

// Real World Geometry
// Specification: https://github.com/immersive-web/real-world-geometry

const installRealWorldGeometryExtension = () => {
	if (window.XRFrame === undefined || window.XRSession === undefined) { return; }

	/**
	 *
	 */
	Object.defineProperty(XRFrame.prototype, 'worldInformation', {
		get: function getWorldInformation() {
			if (!this.session[XRSESSION_PRIVATE].immersive) {
				throw new Error('Not implemented');
			}	
	
			return  _arKitWrapper.getWorldInformation();
		}
	});

	/**
	 * Note: The name in the newest explainer(10/18/2019) seems updateWorldTrackingState.
	 * @TODO: Rename if needed.
	 *
	 * @param options {Object}
	 * @return
	 */
	XRSession.prototype.updateWorldSensingState = function UpdateWorldSensingState(options) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}	

		return _arKitWrapper.updateWorldSensingState(options);
	};
};

// Lighting Estimation
// Specification: https://github.com/immersive-web/lighting-estimation

const installLightingEstimationExtension = () => {
	if (window.XRFrame === undefined) { return; }

	/*
	 * @return {XRLightProbe}
	 */
	XRFrame.prototype.getGlobalLightEstimate = function () {
		if (!this.session[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}	

		return _arKitWrapper.getLightProbe();
	};

	// @TODO: Implement
	XRFrame.prototype.getGlobalReflectionProbe = function () {
		throw new Error('Not implemented');
	};
};

// iOS specific things. No WebXR API extension proposal yet
// so adding as XRSession.prototype.nonstandard_* for now.

const installNonstandardExtension = () => {
	if (window.XRSession === undefined) { return; }

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_setNumberOfTrackedImages = function setNumberOfTrackedImages(count) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}

		return _arKitWrapper.setNumberOfTrackedImages(count);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_createDetectionImage = function createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.createDetectionImage(uid, buffer, width, height, physicalWidthInMeters);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_destroyDetectionImage = function destroyDetectionImage(uid) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.createDetectionImage(uid);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_activateDetectionImage = function activateDetectionImage(uid) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return  _arKitWrapper.activateDetectionImage(uid);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_deactivateDetectionImage = function deactivateDetectionImage(uid) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return  _arKitWrapper.deactivateDetectionImage(uid);
	};

	/**
	 * @return
	 */
	XRSession.prototype.nonStandard_getWorldMap = function getWorldMap() {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.getWorldMap();
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_setWorldMap = function setWorldMap(worldMap) {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper.setWorldMap(worldMap);
	};

	/**
	 * @return
	 */
	XRSession.prototype.nonStandard_getWorldMappingStatus = function getWorldMappingStatus() {
		if (!this[XRSESSION_PRIVATE].immersive) {
			throw new Error('Not implemented');
		}
		return _arKitWrapper._worldMappingStatus;
	};
};

if (xrPolyfill && xrPolyfill.injected && navigator.xr) {
	// install our ARKitWrapper
	_arKitWrapper = ARKitWrapper.GetOrCreate();

	ARKitDevice.initStyles();

	// Some workarounds to let the official WebXR polyfill work with our polyfill

	if(window.XRSystem) {
		// Note: The polyfill supports only immersive-ar mode for now.
		//       See https://github.com/MozillaReality/webxr-ios-js/pull/34#discussion_r334910337
		//       The official WebXR polyfill always accepts inline mode
		//       so overriding XRSystem.isSessionSupported and XRSystem.requestSession to refuse inline mode.
		// @TODO: Support inline mode. WebXR API specification defines that any XR Device must
		//        support inline mode 
		XRSystem.prototype._isSessionSupported = XRSystem.prototype.isSessionSupported;
		XRSystem.prototype._requestSession = XRSystem.prototype.requestSession;
		XRSystem.prototype.isSessionSupported = function (mode) {
			if (!(mode === 'immersive-ar' || mode === 'inline')) return Promise.resolve(false);
			return this._isSessionSupported(mode);
		};
		XRSystem.prototype.requestSession = async function (mode, xrSessionInit) {
			if (!(mode === 'immersive-ar' || mode === 'inline')) {
				throw new DOMException('Polyfill Error: only immersive-ar or inline mode is supported.'); 
			}

			let session = await this._requestSession(mode, xrSessionInit)
			if (mode === 'immersive-ar') {
				session[XRSESSION_PRIVATE]._localSpace = await session.requestReferenceSpace('local')
			}

			// DOM overlay API
			if (xrSessionInit && xrSessionInit.domOverlay && xrSessionInit.domOverlay.root) {
				session.domOverlayState = {type: 'screen'};
				const device = session[XRSESSION_PRIVATE].device;
				device.setDomOverlayRoot(xrSessionInit.domOverlay.root);
				device.setActiveXRSession(session);
			}
			return session
		};
	}

	// if(window.XRFrame) {
		// // Note: The official WebXR polyfill doesn't support XRFrame.getPose() for
		// //       non target-ray/grip space yet (09/24/2019).
		// //       We need working .getPose() so supporting by ourselves here for now.
		// XRFrame.prototype._getPose = window.XRFrame.prototype.getPose;
		// XRFrame.prototype.getPose = function (space, baseSpace) {
		// 	if (space._specialType === 'target-ray' || space._specialType === 'grip') {
		// 		return this._getPose(space, baseSpace);
		// 	}

		// 	// @TODO: More proper handling
		// 	//   - Error handling
		// 	//   - Support XRSpace. Assuming the both spaces are XRReferenceSpace for now
		// 	//   - Check whether poses must be limited. Assuming it's false for now
		// 	//   - Support emulatedPosition true case. Assuming it's false for now
		// 	// See https://immersive-web.github.io/webxr/#populate-the-pose

		// 	const baseSpaceViewerPose = this.getViewerPose(baseSpace);

		// 	if (!baseSpaceViewerPose) {
		// 		return null;
		// 	}

		// 	// Note: Currently (10/10/2019) the official WebXR polyfill
		// 	//       always returns the same XRViewerPose instance from
		// 	//       .getViewerPose() of a XRFrame instance.
		// 	//       So we need to copy the matrix before calling the next
		// 	//       .getViewerPose().
		// 	//       See https://github.com/immersive-web/webxr-polyfill/issues/97

		// 	mat4.copy(_workingMatrix, baseSpaceViewerPose.transform.matrix);

		// 	const spaceViewerPose = this.getViewerPose(space);

		// 	if (!spaceViewerPose) {
		// 		return null;
		// 	}

		// 	mat4.invert(_workingMatrix2, spaceViewerPose.transform.matrix);

		// 	const resultMatrix = mat4.multiply(mat4.create(), _workingMatrix, _workingMatrix2);

		// 	return new XRPose(
		// 		new XRRigidTransform(resultMatrix),
		// 		false
		// 	);
		// }
	// }

	// Now install a few proposed AR extensions to WebXR Device API.

	installAnchorsExtension();
	installHitTestingExtension();
	installRealWorldGeometryExtension();
	installLightingEstimationExtension();
	installNonstandardExtension();

	// Inject Polyfill globals. Apply classes as globals.
	for (const className of Object.keys(API)) {
		if (window[className] !== undefined) {
			console.warn(`${className} already defined on global.`);
		} else {
			window[className] = API[className];
		}
	}
}
