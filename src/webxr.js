/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill';

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4';
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3';

import API from './extensions/index';

import ARKitDevice from './arkit/ARKitDevice';
import ARKitWrapper from './arkit/ARKitWrapper';

import XRHitResult from './extensions/XRHitResult';

const _workingMatrix = mat4.create();
const _workingMatrix2 = mat4.create();

// Monkey patch the WebXR polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchNavigatorXR = function() {
	this.xr = new XR(Promise.resolve(new ARKitDevice(this.global)));
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
	//console.log('project', ...proj);

	const x = (proj[0] + 1) / 2;
	const y = (-proj[1] + 1) / 2;

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
	if (window.XRSession === undefined) { return; }

	/**
	 * Note: In the latest(09/24/2019) anchor spec
	 *       https://github.com/immersive-web/anchors/blob/master/explainer.md
	 *       XRSession.addAnchor() takes two arguments - pose and referenceSpace.
	 *       It might be out of date because in the newest WebXR spec
	 *       we use XRFrame.getPose() to get the pose of space relative to baseSpace.
	 *       Then adding the third argument frame {XRFrame} here as temporal workaround.
	 *       We should update to follow the spec if the anchor spec is updated.
	 *
	 * @param value {XRHitResult|Float32Array}
	 * @param referenceSpace {XRReferenceSpace}
	 * @param frame {XRFrame}
	 * @return {Promise<XRAnchor>}
	 */
	XRSession.prototype.addAnchor = async function addAnchor(value, referenceSpace, frame) {
		if (value instanceof XRHitResult) {
			return _arKitWrapper.createAnchorFromHit(value._hit);
		} else if (value instanceof Float32Array) {
			return new Promise((resolve, reject) => {
				// need to get the data in eye-level reference frame (local reference space)
				// in this polyfill. 
				this.requestReferenceSpace('local').then(localReferenceSpace => {
					mat4.copy(_workingMatrix, frame.getPose(localReferenceSpace, referenceSpace).transform.matrix);
					const anchorInWorldMatrix = mat4.multiply(mat4.create(), _workingMatrix, value);
					_arKitWrapper.createAnchor(anchorInWorldMatrix)
						.then(resolve)
						.catch((...params) => {
							console.error('could not create anchor', ...params);
							reject();
						});
				}).catch((...params) => {
					console.error('could not create local reference space', ...params);
					reject();
				});
			});
		} else {
			return Promise.reject('invalid value passed to addAnchor ' + value);
		}
	};

	/**
	 * Note: In the explainer XRAnchor has detach() method for anchor removal
	 *       but it doesn't seems to be fixed yet.
	 *       We have XRSession.removeAnchor() for now.
	 *       We should update to follow the spec if it's fixed.
	 *
	 * @param anchor {XRAnchor}
	 * @return {Promise<void>}
	 */
	XRSession.prototype.removeAnchor = async function removeAnchor(anchor) {
		return new Promise((resolve, reject) => {
			_arKitWrapper.removeAnchor(anchor);
			resolve();
		});
	};
};

// Hit-Testing
// Specification: https://github.com/immersive-web/hit-test/

const installHitTestingExtension = () => {
	if (window.XRSession === undefined) { return };

	/**
	* Note: Following the spec in https://github.com/immersive-web/anchors/blob/master/explainer.md
	*       There seems being a newer spec https://github.com/immersive-web/hit-test/blob/master/hit-testing-explainer.md
	*       but it requires a big change and doesn't seemd to be fixed so using the older spec for now.
	*
	* Note: In the spec, requestHitTest() takes two arguments - XRRay and XRCoordinateSystem.
	*       But this requestHitTest() takes three arguments - Float32Array, XRReferenceSpace, and XRFrame
	*       Because 1. old implementation takes Float32Array instead of XRRay so just following that
	*       2. No XRCoordinateSyatem in the newest WebXR API and we should use XRReferenceSpace instead
	*       3. in the newest WebXR API we use XRFrame.getPose() to get the pose of space relative to baseSpace.
	*       Then adding the third argument frame {XRFrame} here as temporal workaround.
	*       We should update to follow the spec if the hit test spec is updated.
	*
	* @param direction {Float32Array} @TODO: shoud be XRRay? 
	* @param referenceSpace {XRReferenceSpace}
	* @param frame {XRFrame}
	* @return {Promise<FrozenArray<XRHitResult>>}
	*/
	XRSession.prototype.requestHitTest = function requestHitTest(direction, referenceSpace, frame) {
		// ARKit only handles hit testing from the screen,
		// so only head model FoR (viewer reference space) is accepted.
		// Note: XRReferenceSpace doesn't have exposed type attribute now
		//       so commenting out so far.
		/*
		if(referenceSpace.type !== 'head-model'){
			return Promise.reject('Only head-model hit testing is supported')
		}
		*/

		return new Promise((resolve, reject) => {
			const normalizedScreenCoordinates = _convertRayToARKitScreenCoordinates(direction, _arKitWrapper._projectionMatrix);

			// Perform the hit test
			_arKitWrapper.hitTest(...normalizedScreenCoordinates, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY).then(hits => {
				if (hits.length === 0) { resolve([]); }
				// Hit results are in the tracker (aka eye-level) coordinate system (local reference space),
				// so transform them back to head-model (viewer) since the passed origin and results must be in the same coordinate system

				// uncomment if you want one hit, and get rid of map below
				// const hit = _arKitWrapper.pickBestHit(hits);

				this.requestReferenceSpace('local').then(localReferenceSpace => {
					mat4.copy(_workingMatrix, frame.getPose(referenceSpace, localReferenceSpace).transform.matrix);
					resolve(hits.map(hit => {
						mat4.multiply(_workingMatrix2, _workingMatrix, hit.world_transform);
						return new XRHitResult(_workingMatrix2, hit, _arKitWrapper._timestamp);
					}));
				}).catch((...params) => {
					console.error('could not create local reference space', ...params);
					reject();
				});
			}).catch((...params) => {
				console.error('Error testing for hits', ...params);
				reject();
			});
		});
	}
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
		return _arKitWrapper.setNumberOfTrackedImages(count);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_createDetectionImage = function createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
		return _arKitWrapper.createDetectionImage(uid, buffer, width, height, physicalWidthInMeters);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_destroyDetectionImage = function destroyDetectionImage(uid) {
		return _arKitWrapper.createDetectionImage(uid);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_activateDetectionImage = function activateDetectionImage(uid) {
		return  _arKitWrapper.activateDetectionImage(uid);
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_deactivateDetectionImage = function deactivateDetectionImage(uid) {
		return  _arKitWrapper.deactivateDetectionImage(uid);
	};

	/**
	 * @return
	 */
	XRSession.prototype.nonStandard_getWorldMap = function getWorldMap() {
		return _arKitWrapper.getWorldMap();
	};

	/**
	 * @param
	 * @return
	 */
	XRSession.prototype.nonStandard_setWorldMap = function setWorldMap(worldMap) {
		return _arKitWrapper.setWorldMap(worldMap);
	};

	/**
	 * @return
	 */
	XRSession.prototype.nonStandard_getWorldMappingStatus = function getWorldMappingStatus() {
		return _arKitWrapper._worldMappingStatus;
	};
};

if (xrPolyfill && xrPolyfill.injected && navigator.xr) {
	// install our ARKitWrapper
	_arKitWrapper = ARKitWrapper.GetOrCreate();

	ARKitDevice.initStyles();

	// Some workarounds to let the official WebXR polyfill work with our polyfill

	if(window.XR) {
		// Note: The polyfill supports only immersive-ar mode for now.
		//       See https://github.com/MozillaReality/webxr-ios-js/pull/34#discussion_r334910337
		//       The official WebXR polyfill always accepts inline mode
		//       so overriding XR.isSessionSupported and XR.requestSession to refuse inline mode.
		// @TODO: Support inline mode. WebXR API specification defines that any XR Device must
		//        support inline mode 
		XR.prototype._isSessionSupported = XR.prototype.isSessionSupported;
		XR.prototype._requestSession = XR.prototype.requestSession;
		XR.prototype.isSessionSupported = function (mode) {
			if (mode !== 'immersive-ar') return Promise.resolve(false);
			return this._isSessionSupported(mode);
		};
		XR.prototype.requestSession = function (mode, xrSessionInit) {
			if (mode !== 'immersive-ar') Promise.reject(new DOMException('Polyfill Error: only immersive-ar mode is supported.'));
			return this._requestSession(mode, xrSessionInit);
		};
	}

	if(window.XRFrame) {
		// Note: The official WebXR polyfill doesn't support XRFrame.getPose() for
		//       non target-ray/grip space yet (09/24/2019).
		//       We need working .getPose() so supporting by ourselves here for now.
		XRFrame.prototype._getPose = window.XRFrame.prototype.getPose;
		XRFrame.prototype.getPose = function (space, baseSpace) {
			if (space._specialType === 'target-ray' || space._specialType === 'grip') {
				return this._getPose(space, baseSpace);
			}

			// @TODO: More proper handling
			//   - Error handling
			//   - Support XRSpace. Assuming the both spaces are XRReferenceSpace for now
			//   - Check whether poses must be limited. Assuming it's false for now
			//   - Support emulatedPosition true case. Assuming it's false for now
			// See https://immersive-web.github.io/webxr/#populate-the-pose

			const baseSpaceViewerPose = this.getViewerPose(baseSpace);

			if (!baseSpaceViewerPose) {
				return null;
			}

			// Note: Currently (10/10/2019) the official WebXR polyfill
			//       always returns the same XRViewerPose instance from
			//       .getViewerPose() of a XRFrame instance.
			//       So we need to copy the matrix before calling the next
			//       .getViewerPose().
			//       See https://github.com/immersive-web/webxr-polyfill/issues/97

			mat4.copy(_workingMatrix, baseSpaceViewerPose.transform.matrix);

			const spaceViewerPose = this.getViewerPose(space);

			if (!spaceViewerPose) {
				return null;
			}

			mat4.invert(_workingMatrix2, spaceViewerPose.transform.matrix);

			const resultMatrix = mat4.multiply(mat4.create(), _workingMatrix, _workingMatrix2);

			return new XRPose(
				new XRRigidTransform(resultMatrix),
				false
			);
		}
	}

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
