/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4';

import XRDevice from 'webxr-polyfill/src/devices/XRDevice';

import {throttle} from '../lib/throttle.js';

import ARKitWrapper from './ARKitWrapper.js';
import ARKitWatcher from './ARKitWatcher.js';

export default class ARKitDevice extends XRDevice {
	constructor(global){
		super(global);
		this._throttledLogPose = throttle(this.logPose, 1000);

		this._sessions = new Map();
		this._activeSession = null;     // active ARKit session
		this._frameSession = null;		// session for the current frame

		// A div prepended to body children that will contain the session layer
		this._wrapperDiv = document.createElement('div');
		this._wrapperDiv.setAttribute('class', 'arkit-device-wrapper');

		const insertWrapperDiv = () => {
			document.body.insertBefore(this._wrapperDiv, document.body.firstChild || null);
		};

		if (document.body) {
			insertWrapperDiv();
		} else {
			document.addEventListener('DOMContentLoaded', insertWrapperDiv);
		}

		this._headModelMatrix = mat4.create(); // Model and view matrix are the same
		this._headModelMatrixInverse = mat4.create();

		this._projectionMatrix = mat4.create();
		this._deviceProjectionMatrix = mat4.create();
		this._eyeLevelMatrix = mat4.identity(mat4.create());
		this._stageMatrix = mat4.identity(mat4.create());
		this._stageMatrix[13] = -1.3;
		this._identityMatrix = mat4.identity(mat4.create());
		this._baseFrameSet = false;
		this._frameOfRefRequestsWaiting = [];

		this._depthNear = 0.1;
		this._depthFar = 1000;

		try {
			this._arKitWrapper = ARKitWrapper.GetOrCreate();
			this._arWatcher = new ARWatcher(this._arKitWrapper, this);
		} catch (e) {
			console.error('Error initializing the ARKit wrapper', e);
			this._arKitWrapper = null;
			this._arWatcher = null;
		}
	}

	// ARKitDevice specific methods

	static initStyles() {
		const init = () => {
			const styleEl = document.createElement('style');
			document.head.appendChild(styleEl);
			const styleSheet = styleEl.sheet;
			styleSheet.insertRule('.arkit-device-wrapper { z-index: -1; display: none; }', 0);
			styleSheet.insertRule('.arkit-device-wrapper, .xr-canvas { background-color: transparent; position: absolute; top: 0; left: 0; bottom: 0; right: 0; }', 0);
			styleSheet.insertRule('.arkit-device-wrapper, .arkit-device-wrapper canvas { width: 100%; height: 100%; padding: 0; margin: 0; -webkit-user-select: none; user-select: none; }', 0);
		};

		if (document.body) {
			init();
		} else {
			window.addEventListener('DOMContentLoaded', init);
		}
 
	}

	logPose() {
		console.log('pose', 
			mat4.getTranslation(new Float32Array(3), this._headModelMatrix),
			mat4.getRotation(new Float32Array(4), this._headModelMatrix)
		);
	}

	// set methods called by ARWatcher when the device data is sent from Apple ARKit

	setProjectionMatrix(matrix) {
		mat4.copy(this._deviceProjectionMatrix, matrix);
	}

	setBaseViewMatrix(matrix) {
		mat4.copy(this._headModelMatrixInverse, matrix);
        mat4.invert(this._headModelMatrix, this._headModelMatrixInverse);

		if (!this._baseFrameSet) {
			this._baseFrameSet = true;
			for (let i = 0; i < this._frameOfRefRequestsWaiting.length; i++) {
				const callback = this._frameOfRefRequestsWaiting[i];
				try {
					callback();
				} catch(e) {
					console.error("finalization of reference frame requests failed: ", e);
				}
			}
			this._frameOfRefRequestsWaiting.length = 0;
		}
	}
		
	// XRDevice methods

	get depthNear() { return this._depthNear; }
	set depthNear(val) { this._depthNear = val; }

	get depthFar() { return this._depthFar; }
	set depthFar(val) { this._depthFar = val; }

	isSessionSupported(mode) {
		// Note: We support only immersive-ar mode for now.
		//       See https://github.com/MozillaReality/webxr-ios-js/pull/34#discussion_r334910337
		return mode === 'immersive-ar' || mode === 'inline';
	}

	/**
	 * @param {string} featureDescriptor
	 * @return {boolean}
	 */
	isFeatureSupported(featureDescriptor) {
		switch(featureDescriptor) {
		case 'viewer': return true;
		case 'local': return true;

		// @TODO: need to support local-floor, bounded and unbounded
		case 'local-floor': return true;
		case 'bounded': return false;
		case 'unbounded': return false;
		
		case 'worldSensing': return true;
		case 'computerVision': return true;
		case 'alignEUS': return true;

		default: return false;
		}
	}

    /**
	 * @param {number} sessionId
	 * @param {XRReferenceSpaceType} type
	 * @return {boolean}
	 */
	doesSessionSupportReferenceSpace(sessionId, type) {
		const session = this._sessions.get(sessionId);
		if (session.ended) {
			return false;
		}

		if (!session.enabledFeatures.has(type)) {
			// if the feature isn't supported on this session, return false
			return false;
		}

		// now check it's a valid reference space
		switch(type) {
		case 'viewer': return true;
		case 'local': return true;

		// @TODO: need to support local-floor, bounded and unbounded
		case 'local-floor': return true;
		case 'bounded': return false;
		case 'unbounded': return false;

		default: return false;
		}
	}

	async requestSession(mode, enabledFeatures) {
		if (!this.isSessionSupported(mode)) {
			console.error('Invalid session mode', mode);
			return Promise.reject();
		}

		if (mode === 'inline') {
			const session = new Session(mode, enabledFeatures);

			this._sessions.set(session.id, session);
	
			return Promise.resolve(session.id);
		}

		if (!this._arKitWrapper) {
			console.error('Session requested without an ARKitWrapper');
			return Promise.reject();
		}
		if (this._activeSession !== null) {
			console.error('Tried to start a second active session');
			return Promise.reject();
		}

		const ARKitOptions = {};
		if (enabledFeatures.has("worldSensing")) {
			ARKitOptions.worldSensing = true;
		}
		if (enabledFeatures.has("computerVision")) {
			ARKitOptions.videoFrames = true;
		}
		if (enabledFeatures.has("alignEUS")) {
			ARKitOptions.alignEUS = true;
		}

		await this._arKitWrapper.waitForInit().then(() => {}).catch((...params) => {
			console.error("app failed to initialize: ", ...params);
			return Promise.reject();
		});

		const watchResult = await this._arKitWrapper.watch(ARKitOptions).then((results) => {
			const session = new Session(mode, enabledFeatures);

			this._sessions.set(session.id, session);
			this._activeSession = session;

			return Promise.resolve(session.id);
		}).catch((...params) => {
			console.error("session request failed: ", ...params);
			return Promise.reject();
		});

		return watchResult;
	}

	onBaseLayerSet(sessionId, layer) {
	    const session = this._sessions.get(sessionId);
    	const canvas = layer.context.canvas;
		const oldLayer = session.baseLayer;

		session.baseLayer = layer; // XRWebGLLayer

		if (!session.immersive) {
			return;
		}

		if (oldLayer !== null) {
			const oldCanvas = oldLayer.context.canvas;
			this._wrapperDiv.removeChild(oldCanvas);

			oldCanvas.style.width = session.canvasWidth
			oldCanvas.style.height = session.canvasHeight
			oldCanvas.style.display = session.canvasDisplay
			oldCanvas.style.backgroundColor = session.canvasBackground
		}

		session.bodyBackground = document.body.style.backgroundColor;
		document.body.style.backgroundColor = "transparent";

		var children = document.body.children;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child != this._wrapperDiv && child != canvas) {
				var display = child.style.display;
				child._displayChanged = true;
				child._displayWas = display
				child.style.display = "none"
			}
		}

		session.canvasParent = canvas.parentNode
		session.canvasNextSibling = canvas.nextSibling

		// if (canvas._displayChanged) {
		// 	session.canvasDisplay = canvas._displayWas
		// 	canvas._displayWas = ""
		// 	canvas._displayChanged = false;
		// } else {
			session.canvasDisplay = canvas.style.display
		// }
		canvas.style.display = "block"
		session.canvasBackground = canvas.style.backgroundColor
		canvas.style.backgroundColor = "transparent"

		session.canvasWidth = canvas.style.width
		session.canvasHeight = canvas.style.height
		canvas.style.width = "100%";
		canvas.style.height = "100%";

		this._wrapperDiv.appendChild(canvas);
		this._wrapperDiv.style.display = "block";


		// layer.width = layer.context.canvas.width = this._wrapperDiv.clientWidth * window.devicePixelRatio;
		// layer.height = layer.context.canvas.height = this._wrapperDiv.clientHeight * window.devicePixelRatio;
	}

	endSession(sessionId) {
		const session = this._sessions.get(sessionId);

		if (!session || session.ended) { return; }
		session.ended = true;

		var children = document.body.children;
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child != this._wrapperDiv) {
				if (child._displayChanged) {
					child.style.display = child._displayWas
					child._displayWas = ""
					child._displayChanged = false
				}
			}
		}
		if (this._activeSession === session) {

			if (session.baseLayer !== null) {
				const canvas = session.baseLayer.context.canvas;
				this._wrapperDiv.removeChild(canvas);

				if (!session.canvasNextSibling) {
					// was at the end
					session.canvasParent.appendChild(canvas)
				} else {
					session.canvasNextSibling.before(canvas)
				}
				session.canvasParent = null
				session.canvasNextSibling = null

				canvas.style.width = session.canvasWidth
				canvas.style.height = session.canvasHeight
				canvas.style.display = session.canvasDisplay
				canvas.style.backgroundColor = session.canvasBackground
			}

			this._wrapperDiv.style.display = "none";

			this._activeSession = null;
			mat4.identity(this._headModelMatrix);
			this._arKitWrapper.stop();
		}
		this._frameSession = null;

	}

	requestAnimationFrame(callback, ...params) {
		// if (this._activeSession) {
			return this._arKitWrapper.requestAnimationFrame(callback, params);
		// } else {
		// 	return window.requestAnimationFrame(callback, params);
		// }
	}

	cancelAnimationFrame(handle) {
		return this._arKitWrapper.cancelAnimationFrame(handle);
	}

	onFrameStart(sessionId, renderState) {
		const session = this._sessions.get(sessionId);

		this._frameSession = session;

		// If the session is inline make sure the projection matrix matches the 
		// aspect ratio of the underlying WebGL canvas.
		if (session.immersive) {
			mat4.copy(this._projectionMatrix, this._deviceProjectionMatrix);
		} else {
			if (session.baseLayer) {
				const canvas = session.baseLayer.context.canvas;
				// Update the projection matrix.
				mat4.perspective(this._projectionMatrix, 	
					renderState.inlineVerticalFieldOfView, 
					canvas.width/canvas.height, 
					renderState.depthNear, 
					renderState.depthFar);
			}
		}
	}

	onFrameEnd(sessionId) {
		this._frameSession = null;
	}

	requestFrameOfReferenceTransform(type, options) {
		return new Promise((resolve, reject) => {
			const enqueueOrExec = (callback) => {
				if (this._baseFrameSet) {
					callback();
				} else {
					this._frameOfRefRequestsWaiting.push(callback);
				}
			};

			switch (type) {
				case 'viewer':
					enqueueOrExec(() => { 
						resolve(this._headModelMatrix);
					});
					return;
				case 'local':
					enqueueOrExec(() => { 
						resolve(this._eyeLevelMatrix);
					});
					return;
				case 'local-floor':
				case 'bounded-floor':

				// @TODO: Support unbounded reference space.
				// @TODO: Support reset event.
				//        In ARKit, the native origin can change as the user moves around.
				//        In unbounded, the space origin can change. But in other space
				//        such as local and local-floor, if the origin changes, a reset event should
				//        be triggered on the coordinate system (per the spec).
				case 'unbounded':
					reject(new Error('not supported ' + type));
					return;
				default:
					reject(new Error('Unsupported frame of reference type ' + type));
					return;
			}
		});
	}

	getViewport(sessionId, eye, layer, target) {
		// A single viewport that covers the entire screen
		const { width, height } = layer.context.canvas;
		target.x = 0;
		target.y = 0;
		target.width = width;
		target.height = height;
		return true;
	}

	getProjectionMatrix(eye) {
		return this._projectionMatrix;
	}

	// The model and view matrices are the same head-model matrix
	getBasePoseMatrix() {
		if (this._frameSession.immersive) {
			return this._headModelMatrix;
		} else {
			return this._identityMatrix;
		}
	}

	getBaseViewMatrix(eye) {
		if (this._frameSession.immersive) {
			return this._headModelMatrix;
		} else {
			return this._identityMatrix;
		}
	}

	requestStageBounds() {
		return null;
	}

	getInputSources() {
		return [];
	}

	getInputPose(inputSource, coordinateSystem) {
		return null;
	}

	onWindowResize() {
		this._sessions.forEach((value, key) => {
			// var layer = value.baseLayer
			// layer.width = layer.context.canvas.width = this._wrapperDiv.clientWidth * window.devicePixelRatio;
			// layer.height = layer.context.canvas.height = this._wrapperDiv.clientHeight * window.devicePixelRatio;
		});
	}
}

let SESSION_ID = 100;
class Session {
	constructor(mode, enabledFeatures) {
		this.mode = mode;
		this.enabledFeatures = enabledFeatures;
		this.immersive = mode == 'immersive-ar';		
		this.ended = null; // boolean
		this.baseLayer = null; // XRWebGLLayer
		this.id = ++SESSION_ID;
	}
}

class ARWatcher extends ARKitWatcher {
	constructor(arKitWrapper, arKitDevice) {
		super(arKitWrapper);
		this._arKitDevice = arKitDevice;
	}

	handleARKitUpdate(event) {
		this._arKitDevice.setBaseViewMatrix(this._arKitWrapper._cameraTransform);
		this._arKitDevice.setProjectionMatrix(this._arKitWrapper._projectionMatrix);
	}

	handleOnError(...args) {
		console.error('ARKit error', ...args);
	}
}

