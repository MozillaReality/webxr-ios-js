/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */

import WebXRPolyfill from 'webxr-polyfill/src/WebXRPolyfill'
import {PRIVATE} from 'webxr-polyfill/src/api/XRFrame'

import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'

import API from './extensions/index';

import ARKitDevice from './arkit/ARKitDevice'
import ARKitWrapper from './arkit/ARKitWrapper'

import XRHitResult from './extensions/XRHitResult'

const _workingMatrix = mat4.create()
const _workingMatrix2 = mat4.create()

// Monkey patch the WebXR polyfill so that it only loads our special XRDevice
WebXRPolyfill.prototype._patchNavigatorXR = function() {
	this.xr = new XR(Promise.resolve(new ARKitDevice(this.global)))
	this.xr._mozillaXRViewer = true
	Object.defineProperty(this.global.navigator, 'xr', {
		value: this.xr,
		configurable: true,
	})
}

let mobileIndex =  navigator.userAgent.indexOf("Mobile/") 
let isWebXRViewer = navigator.userAgent.indexOf("WebXRViewer") !== -1 ||
			((navigator.userAgent.indexOf("iPhone") !== -1 ||  navigator.userAgent.indexOf("iPad") !== -1) 
				&& mobileIndex !== -1 && navigator.userAgent.indexOf("AppleWebKit") !== -1 
				&& navigator.userAgent.indexOf(" ", mobileIndex) === -1)

// Install the polyfill IF AND ONLY IF we're running in the WebXR Viewer
const xrPolyfill =  !isWebXRViewer ? null : new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
})

/*
Now install a few proposed AR extensions to the WebXR Device API:
- hit-testing: https://github.com/immersive-web/hit-test/
- anchors: https://github.com/immersive-web/anchors
*/

function _updateWorldSensingState (options) {
	return _arKitWrapper.updateWorldSensingState(options)
}

function _getWorldInformation () {
	 return  _arKitWrapper.getWorldInformation()
}

/**
 * Note: Following the spec in https://github.com/immersive-web/anchors/blob/master/explainer.md
 *       There seems being a newer spec https://github.com/immersive-web/hit-test/blob/master/hit-testing-explainer.md
 *       but it requires a big change and doesn't seemd to be fixed. So using the older spec for now.
 *
 * Note: In the spec, requestHitTest() takes two arguments - XRRay and XRCoordinateSystem.
 *       But _xrSessionRequestHitTest() takes three arguments - Float32Array, XRReferenceSpace, and XRFrame
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
// This will be XRSession.requestHitTest
async function _xrSessionRequestHitTest(direction, referenceSpace, frame) {
	// ARKit only handles hit testing from the screen, so only head model FoR is accepted
	// Note: XRReferenceSpace doesn't have exposed type attribute now
	//       so commenting out so far.
	/*
	if(referenceSpace.type !== 'head-model'){
		return Promise.reject('Only head-model hit testing is supported')
	}
	*/

	return new Promise((resolve, reject) => {
		const normalizedScreenCoordinates = _convertRayToARKitScreenCoordinates(direction, _arKitWrapper._projectionMatrix)

		//console.log('and back', ...normalizedScreenCoordinates)

		// Perform the hit test
		_arKitWrapper.hitTest(...normalizedScreenCoordinates, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY).then(hits => {
			if(hits.length === 0) resolve([])
			// Hit results are in the tracker (aka eye-level) coordinate system, so transform them back to head-model since the passed origin and results must be in the same coordinate system

			// uncomment if you want one hit, and get rid of map below
			// const hit = _arKitWrapper.pickBestHit(hits)

			this.requestReferenceSpace('local').then(localReferenceSpace => {
				mat4.copy(_workingMatrix, frame.getPose(referenceSpace, localReferenceSpace).transform.matrix);
				//console.log('eye to head', mat4.getTranslation(vec3.create(), csTransform), mat4.getRotation(new Float32Array(4), csTransform))
				resolve(hits.map(hit => {
					mat4.multiply(_workingMatrix2, _workingMatrix, hit.world_transform);
					//console.log('world transform', mat4.getTranslation(vec3.create(), hit.world_transform), mat4.getRotation(new Float32Array(4), hit.world_transform))
					//console.log('head transform', mat4.getTranslation(vec3.create(), hitInHeadMatrix), mat4.getRotation(new Float32Array(4), hitInHeadMatrix))
					return new XRHitResult(_workingMatrix2, hit, _arKitWrapper._timestamp)
				}))
			}).catch((...params) => {
				console.error('Error testing for hits', ...params)
				reject()
			});
		}).catch((...params) => {
			console.error('Error testing for hits', ...params)
			reject()
		})
	})
}

/**
 * Note: In the latest(09/24/2019) anchor spec
 *       https://github.com/immersive-web/anchors/blob/master/explainer.md
 *       XRSession.addAnchor() takes two arguments - pose and referenceSpace.
 *       It might be out of date because in the newest WebXR spec
 *       we use XRFrame.getPose() to get the pose of space relative to baseSpace.
 *       Then adding the third argument frame {XRFrame} here as temporal workaround.
 *       We should update to follow the spec if the anchor spec is updated.
 *
 * @param value {XRHitResult|Float32Arra}
 * @param referenceSpace {XRReferenceSpace}
 * @param frame {XRFrame}
 * @return {Promise<XRAnchor>}
 */
async function _addAnchor(value, referenceSpace, frame) {
	  if (value instanceof XRHitResult) {
			return _arKitWrapper.createAnchorFromHit(value._hit)
			// const hit = value._hit;
			// // if it's a plane
			// if (hit.anchor_transform) {
			// 	// Use the first hit to create an XRAnchorOffset, creating the ARKit XRAnchor as necessary

			// 	let anchor = this._getAnchor(hit.uuid)
			// 	if(anchor === null){
			// 		anchor = new XRAnchor(hit.anchor_transform, hit.uuid)
			// 		this._setAnchor(anchor)
			// 	}

			// 	const offsetPosition = [
			// 		hit.world_transform[12] - hit.anchor_transform[12],
			// 		hit.world_transform[13] - hit.anchor_transform[13],
			// 		hit.world_transform[14] - hit.anchor_transform[14]
			// 	]
			// 	const worldRotation = quat.fromMat3(quat.create(), mat3.fromMat4(mat3.create(), hit.world_transform))
			// 	const q = quat.create();
			// 	const inverseAnchorRotation = quat.invert(q, quat.fromMat3(q, mat3.fromMat4(mat3.create(), hit.anchor_transform)))
			// 	const offsetRotation = quat.multiply(q, worldRotation, inverseAnchorRotation)
			// 	const offset = mat4.fromRotationTranslation(mat4.create(), offsetRotation, offsetPosition)
			// 	const anchorOffset = new XRAnchorOffset(anchor, offset)
			// 	return anchorOffset
			// } else {
			// 	const anchor = new XRAnchor(hit.world_transform, hit.uuid)
			// 	this._setAnchor(anchor)
			// 	return anchor
			// }

		} else if (value instanceof Float32Array) {
			return new Promise((resolve, reject) => {
				// need to get the data in eye-level reference frame.  In this polyfill,
				// 
				this.requestReferenceSpace('local').then(localReferenceSpace => {
					mat4.copy(_workingMatrix, frame.getPose(localReferenceSpace, referenceSpace).transform.matrix);
					const anchorInWorldMatrix = mat4.multiply(mat4.create(), _workingMatrix, value)

					_arKitWrapper.createAnchor(anchorInWorldMatrix).then(resolve)
					// var anchor = new XRAnchor(anchorInWorldMatrix)
					// _arKitWrapper.addAnchor(anchor.uid, anchor.modelMatrix()).then(detail => { 
					// 	anchor.modelMatrix = detail.transform
					// 	this._setAnchor(anchor)
					// 	resolve(anchor)
					.catch((...params) => {
						console.error('could not create anchor', ...params)
						reject()
					})
				});
			}).catch((...params) => {
				console.error('could not create eye-level frame of reference', ...params)
				reject()
			});
		} else {
			return Promise.reject('invalid value passed to addAnchor', value)	
		}
}

async function /*Promise<XRAnchor>*/ _removeAnchor(anchor) {
	return new Promise((resolve, reject) => {
		_arKitWrapper.removeAnchor(anchor);
		resolve();
	})
}


/************************** 
 * iOS specific things, not sure where to put these yet
*/

function _setNumberOfTrackedImages (count) {
	return _arKitWrapper.setNumberOfTrackedImages(count)
}

function _createDetectionImage(uid, buffer, width, height, physicalWidthInMeters) {
	return _arKitWrapper.createDetectionImage(uid, buffer, width, height, physicalWidthInMeters)
}

function _destroyDetectionImage(uid) {
	return _arKitWrapper.createDetectionImage(uid)
}

function _activateDetectionImage(uid) {
	return  _arKitWrapper.activateDetectionImage(uid)
}

function _deactivateDetectionImage(uid) {
	return  _arKitWrapper.deactivateDetectionImage(uid)
}

function _getWorldMap() {
	return _arKitWrapper.getWorldMap()
}

function _setWorldMap(worldMap) {
	return _arKitWrapper.setWorldMap(worldMap)
}

function _getWorldMappingStatus() {
	return _arKitWrapper._worldMappingStatus;
}

// function _getAnchor(uid) {
// 	if (!this._anchors) { return null}
// 	return this._anchors.get(uid) || null
// }

// function _setAnchor(anchor) {
// 	if (!this._anchors) { this._anchors = new Map()	}
// 	this._anchors.set(anchor.uid, anchor)
// }

// function _deleteAnchor(anchor){
// 	if (!this._anchors) { return }
// 	this._anchors.delete(anchor.uid)
// }

/**
Take a vec3 direction vector through the screen and return normalized x,y screen coordinates
@param ray {vec3}
@param projectionMatrix {mat4}
@return [x,y] in range [0,1]
*/
function _convertRayToARKitScreenCoordinates(ray, projectionMatrix){
	var proj = vec3.transformMat4(vec3.create(), ray, projectionMatrix)
	//console.log('project', ...proj)

	let x = (proj[0] + 1)/2;
	let y = (-proj[1] + 1)/2;

	return [x, y]
}

var _arKitWrapper = null

function _installExtensions(){
	if(!navigator.xr) return

	// install our ARKitWrapper
	_arKitWrapper = ARKitWrapper.GetOrCreate()

	ARKitDevice.initStyles()

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

	if(window.XRSession){
		XRSession.prototype.requestHitTest = _xrSessionRequestHitTest
		XRSession.prototype.updateWorldSensingState = _updateWorldSensingState
		XRSession.prototype.addAnchor = _addAnchor
		// XRSession.prototype._setAnchor = _setAnchor
		// XRSession.prototype._getAnchor = _getAnchor
		// XRSession.prototype._deleteAnchor = _deleteAnchor
		XRSession.prototype.removeAnchor = _removeAnchor

		// use "nonStandard" to signify these are unlikely to be standardized 
		XRSession.prototype.nonStandard_createDetectionImage = _createDetectionImage
		XRSession.prototype.nonStandard_destroyDetectionImage = _destroyDetectionImage
		XRSession.prototype.nonStandard_activateDetectionImage = _activateDetectionImage
		XRSession.prototype.nonStandard_deactivateDetectionImage = _deactivateDetectionImage
		XRSession.prototype.nonStandard_setNumberOfTrackedImages = _setNumberOfTrackedImages
		XRSession.prototype.nonStandard_getWorldMap = _getWorldMap
		XRSession.prototype.nonStandard_setWorldMap = _setWorldMap
		XRSession.prototype.nonStandard_getWorldMappingStatus = _getWorldMappingStatus
	}
	
	if(window.XRFrame) {
		Object.defineProperty(XRFrame.prototype, 'worldInformation', { get: _getWorldInformation });

		// Note: The official WebXR polyfill doesn't support XRFrame.getPose() for
		//       non target-ray/grip space yet (09/24/2019).
		//       So supporting by ourselves here for now.
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

		// Add lighting-estimate API
		// Specification: https://github.com/immersive-web/lighting-estimation

		XRFrame.prototype.getGlobalLightEstimate = function () {
			return _arKitWrapper.getLightProbe();
		};

		XRFrame.prototype.getGlobalReflectionProbe = function () {
			throw new Error('Not implemented');
		};
	}

	// inject Polyfill globals {
	// Apply classes as globals
	for (const className of Object.keys(API)) {
		if (window[className] !== undefined) {
			console.warn(`${className} already defined on global.`);
		} else {
			window[className] = API[className];
		}
	}

}

if (xrPolyfill && xrPolyfill.injected) {
	_installExtensions()
}
