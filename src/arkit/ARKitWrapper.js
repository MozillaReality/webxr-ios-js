import * as mat4 from "gl-matrix/src/gl-matrix/mat4";
import * as mat3 from "gl-matrix/src/gl-matrix/mat3";
import * as quat from "gl-matrix/src/gl-matrix/quat";
import * as vec3 from "gl-matrix/src/gl-matrix/vec3";
import * as glMatrix from "gl-matrix/src/gl-matrix/common";

import * as hitTestUtils from './HitTestUtils.js';

import EventTarget from 'webxr-polyfill/src/lib/EventTarget';
import XRAnchor from '../extensions/XRAnchor';
import XRAnchorOffset from '../extensions/XRAnchorOffset';

import base64 from "../lib/base64-binary.js";

/*	
ARKitWrapper talks to Apple ARKit, as exposed by Mozilla's test ARDemo app.
It won't function inside a browser like Firefox.

ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the instance, then add event listeners like so:

	if(ARKitWrapper.HasARKit()){
		let arKitWrapper = ARKitWrapper.GetOrCreate()
		arKitWrapper.addEventListener(ARKitWrapper.INIT_EVENT, ev => { console.log('ARKit initialized', ev) })
		arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, ev => { console.log('ARKit update', ev) })
		arKitWrapper.watch({
			location: boolean,
			camera: boolean,
			objects: boolean,
			light_intensity: boolean
		})
	}

*/

const PI_OVER_180 = Math.PI / 180.0

export default class ARKitWrapper extends EventTarget {
	constructor(){
		super()
		if(ARKitWrapper.HasARKit() === false){
			throw new Error('ARKitWrapper will only work in Mozilla\'s ARDemo test app')
		}
		if(typeof ARKitWrapper.GLOBAL_INSTANCE !== 'undefined'){
			throw new Error('ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the global instance.')
		}

		this._timestamp = 0;
		this._lightIntensity = 1000;

		this._deviceId = null
		this._isWatching = false
		this._isInitialized = false
		this._rawARData = null

		/**
		 * The current projection matrix of the device.
		 * @type {Float32Array}
		 * @private
		 */
		this._projectionMatrix = new Float32Array(16);
		/**
		 * The current view matrix of the device.
		 * @type {Float32Array}
		 * @private
		 */
		this._viewMatrix = new Float32Array(16);
		this._cameraTransform = new Float32Array(16)
		/**
		 * The list of planes coming from ARKit.
		 * @type {Map<number, ARPlane}
		 * @private
		 */
		this._planes = new Map();

		/* other anchors from ARKit.  Faces, images, results of hit testing. */
		this._anchors = new Map();

		/* synthetic anchors, currently created from hit tests relative to other anchors */
		this._anchorOffsets = new Map();

		this._timeOffsets = []
		this._timeOffset = 0;
		this._timeOffsetComputed = false;

		/**
		 * For managing the state of ARKit worldmapping
		 */
		this._worldMappingStatus = ARKitWrapper.WEB_AR_WORLDMAPPING_NOT_AVAILABLE;

		this._globalCallbacksMap = {} // Used to map a window.arkitCallback method name to an ARKitWrapper.on* method name
		// Set up the window.arkitCallback methods that the ARKit bridge depends on
		let callbackNames = ['onInit', 'onWatch']
		for(let i=0; i < callbackNames.length; i++){
			this._generateGlobalCallback(callbackNames[i], i)
		}
			
		// default options for initializing ARKit
		this._defaultOptions = {
			location: true,
			camera: true,
			objects: true,
			light_intensity: true,
			computer_vision_data: false
		}
		this._m90 = mat4.fromZRotation(mat4.create(), 90*PI_OVER_180);
		this._m90neg = mat4.fromZRotation(mat4.create(), -90*PI_OVER_180);
		this._m180 = mat4.fromZRotation(mat4.create(), 180*PI_OVER_180);
		this._mTemp = mat4.create();

		// temp storage for CV arraybuffers
		//this._ab = []

		// Set up some named global methods that the ARKit to JS bridge uses and send out custom events when they are called
		let eventCallbacks = [
			['arkitStartRecording', ARKitWrapper.RECORD_START_EVENT],
			['arkitStopRecording', ARKitWrapper.RECORD_STOP_EVENT],
			['arkitDidMoveBackground', ARKitWrapper.DID_MOVE_BACKGROUND_EVENT],
			['arkitWillEnterForeground', ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT],
			['arkitInterrupted', ARKitWrapper.INTERRUPTED_EVENT],
			['arkitInterruptionEnded', ARKitWrapper.INTERRUPTION_ENDED_EVENT], 
			['arkitShowDebug', ARKitWrapper.SHOW_DEBUG_EVENT],
			['arkitWindowResize', ARKitWrapper.WINDOW_RESIZE_EVENT],
			['onError', ARKitWrapper.ON_ERROR],
			['arTrackingChanged', ARKitWrapper.AR_TRACKING_CHANGED],
			['userGrantedComputerVisionData', ARKitWrapper.USER_GRANTED_COMPUTER_VISION_DATA],
			['userGrantedWorldSensingData', ARKitWrapper.USER_GRANTED_WORLD_SENSING_DATA]
            //,['onComputerVisionData', ARKitWrapper.COMPUTER_VISION_DATA]
		]
		for(let i=0; i < eventCallbacks.length; i++){
			window[eventCallbacks[i][0]] = (detail) => {
				detail = detail || null
				try {
					this.dispatchEvent(
						eventCallbacks[i][1],
						new CustomEvent(
							eventCallbacks[i][1],
							{
								source: this,
								detail: detail
							}
						)
					)	
				} catch(e) {
					console.error(eventCallbacks[i][0] + ' callback error', e)
				}
			}
		}
		/*
		 * Computer vision needs massaging
		 */
		window['onComputerVisionData'] = (detail) => {
			this._onComputerVisionData(detail);
		}

		window['setNativeTime'] = (detail) => {
			this._timeOffsets.push (( performance || Date ).now() - detail.nativeTime)
			this._timeOffsetComputed = true;
			this._timeOffset = 0;
			for (var i = 0; i < this._timeOffsets.length; i++) {
				this._timeOffset += this._timeOffsets[i];
			}
			this._timeOffset = this._timeOffset / this._timeOffsets.length;
			//console.log("Native time: " + detail.nativeTime + ", new timeOffset: " + this._timeOffset)
		}
	}

	static GetOrCreate(options=null){
		if(typeof ARKitWrapper.GLOBAL_INSTANCE === 'undefined'){
			ARKitWrapper.GLOBAL_INSTANCE = new ARKitWrapper()
			options = (options && typeof(options) == 'object') ? options : {}
			let defaultUIOptions = {
				browser: true,
				points: true,
				focus: false,
				rec: true,
				rec_time: true,
				mic: false,
				build: false,
				plane: true,
				warnings: true,
				anchors: false,
				debug: true,
				statistics: false
			}
			let uiOptions = (typeof(options.ui) == 'object') ? options.ui : {}
			options.ui = Object.assign(defaultUIOptions, uiOptions)
			ARKitWrapper.GLOBAL_INSTANCE._sendInit(options)
		} 
		return ARKitWrapper.GLOBAL_INSTANCE
	}

	static HasARKit(){
		return typeof window.webkit !== 'undefined'
	}

	get deviceId(){ return this._deviceId } // The ARKit provided device ID
	get isWatching(){ return this._isWatching } // True if ARKit is sending frame data
	get isInitialized(){ return this._isInitialized } // True if this instance has received the onInit callback from ARKit
	get hasData(){ return this._rawARData !== null } // True if this instance has received data via onWatch

	/*
	Useful for waiting for or immediately receiving notice of ARKit initialization
	*/
	waitForInit(){
		return new Promise((resolve, reject) => {
			if(this._isInitialized){
				resolve()
				return
			}
			const callback = () => {
				this.removeEventListener(ARKitWrapper.INIT_EVENT, callback, false)
				resolve()
			}
			this.addEventListener(ARKitWrapper.INIT_EVENT, callback, false)
		})
	}

	/**
	* Get an iterable of plane objects representing ARKit's current understanding of the world.
	* @return {iterator<Object>} The iterable of plane objects.
	*/
	getPlanes() {
		return Array.from(this._planes.values())
	}

	/*
	getData looks into the most recent ARKit data (as received by onWatch) for a key
	returns the key's value or null if it doesn't exist or if a key is not specified it returns all data
	*/
	getData(key=null){
		if (!key){
			return this._rawARData
		}
		if(this._rawARData && typeof this._rawARData[key] !== 'undefined'){
			return this._rawARData[key]
		}
		return null
	}	

	/*
	returns
		{
			uuid: DOMString,
			transform: [4x4 column major affine transform]
		}

	return null if object with `uuid` is not found
	*/
	getObject(uuid){
		if (!this._isInitialized){
			return null
		}
		const objects = this.getKey('objects')
		if(!objects) return null
		for(const object of objects){
			if(object.uuid === uuid){
				return object
			}
		}
		return null
	}

	/*
	Sends a hitTest message to ARKit to get hit testing results
	x, y - screen coordinates normalized to 0..1 (0,0 is at top left and 1,1 is at bottom right)
	types - bit mask of hit testing types
	
	Returns a Promise that resolves to a (possibly empty) array of hit test data:
	[
		{
			type: 1,							// A packed mask of types ARKitWrapper.HIT_TEST_TYPE_*
			distance: 1.0216870307922363,		// The distance in meters from the camera to the detected anchor or feature point.
			world_transform:  [float x 16],		// The pose of the hit test result relative to the world coordinate system. 
			local_transform:  [float x 16],		// The pose of the hit test result relative to the nearest anchor or feature point

			// If the `type` is `HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE`, `HIT_TEST_TYPE_EXISTING_PLANE`, or `HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT` (2, 8, or 16) it will also have anchor data:
			anchor_center: { x:float, y:float, z:float },
			anchor_extent: { x:float, y:float },
			uuid: string,

			// If the `type` is `HIT_TEST_TYPE_EXISTING_PLANE` or `HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT` (8 or 16) it will also have an anchor transform:
			anchor_transform: [float x 16]
		},
		...
	]
	@see https://developer.apple.com/documentation/arkit/arframe/2875718-hittest
	*/
	hitTest(x, y, types=ARKitWrapper.HIT_TEST_TYPE_ALL){
		return new Promise((resolve, reject) => {
			if (!this._isInitialized){
				reject(new Error('ARKit is not initialized'));
				return;
			}
			window.webkit.messageHandlers.hitTest.postMessage({
				x: x,
				y: y,
				type: types,
				callback: this._createPromiseCallback('hitTest', resolve)
			})
		})
	}

	hitTestNoAnchor(x, y){
		return hitTestUtils.hitTestNoAnchor(x, y, this.getPlanes(), this._projectionMatrix, this._viewMatrix)
	}

	pickBestHit(hits){
		if(hits.length === 0) return null

		let planeResults = hits.filter(
			hitTestResult => hitTestResult.type != ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT
		)
		let planeExistingUsingExtentResults = planeResults.filter(
			hitTestResult => hitTestResult.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT
		)
		let planeExistingResults = planeResults.filter(
			hitTestResult => hitTestResult.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE
		)

		if (planeExistingUsingExtentResults.length) {
			// existing planes using extent first
			planeExistingUsingExtentResults = planeExistingUsingExtentResults.sort((a, b) => a.distance - b.distance)
			return planeExistingUsingExtentResults[0]
		} else if (planeExistingResults.length) {
			// then other existing planes
			planeExistingResults = planeExistingResults.sort((a, b) => a.distance - b.distance)
			return planeExistingResults[0]
		} else if (planeResults.length) {
			// other types except feature points
			planeResults = planeResults.sort((a, b) => a.distance - b.distance)
			return planeResults[0]
		} else {
			// feature points if any
			return hits[0]
		}
		return null
	}


	/*
		Sends an addAnchor message to ARKit
		Returns a promise that returns:
		{
			uuid - the anchor's uuid,
			transform - anchor transformation matrix
		}
	*/
  addAnchor(uid, transform){
		return new Promise((resolve, reject) => {
			if (!this._isInitialized){
				reject(new Error('ARKit is not initialized'));
				return;
			}
			window.webkit.messageHandlers.addAnchor.postMessage({
				uuid: uid,
				transform: transform,
				callback: this._createPromiseCallback('addAnchor', resolve)
			})
		})
	}

	createAnchor(anchorInWorldMatrix) {
		return new Promise((resolve, reject) => {
			var anchor = new XRAnchor(anchorInWorldMatrix)
			this.addAnchor(anchor.uid, anchorInWorldMatrix).then(detail => { 
				var _anchor = this._anchors.get(detail.uuid);
				if(!_anchor){
					// need to get the data in eye-level reference frame
					this._anchors.set(detail.uuid, {
						id: detail.uuid,
						object: anchor
					});
				}else{
					anchor = _anchor
					anchor.modelMatrix = detail.transform;
				}

				resolve(anchor)
			}).catch((...params) => {
				console.error('could not create anchor', ...params)
				reject()
			})
		});
	}

	addAnchorFromHit(hit) {
		return new Promise((resolve, reject) => {
			if (hit.anchor_transform) {
				// Use the first hit to create an XRAnchorOffset, creating the ARKit XRAnchor as necessary
				let anchor = this._anchors.get(hit.uuid)
				if(!anchor){
					anchor = this._planes.get(hit.uuid)

					if (!anchor) {
						anchor = new XRAnchor(hit.anchor_transform, hit.uuid)
						console.log('created dummy anchor (for plane) from hit test')
						// mark this as possibly needing replacement
						anchor.placeholder = true;
						this._anchors.set(hit.uuid, anchor)
					}
				}

				// const offsetPosition = [
				// 	hit.world_transform[12] - hit.anchor_transform[12],
				// 	hit.world_transform[13] - hit.anchor_transform[13],
				// 	hit.world_transform[14] - hit.anchor_transform[14]
				// ]
				// const worldRotation = quat.fromMat3(quat.create(), mat3.fromMat4(mat3.create(), hit.world_transform))
				// const q = quat.create();
				// const inverseAnchorRotation = quat.invert(q, quat.fromMat3(q, mat3.fromMat4(mat3.create(), hit.anchor_transform)))
				// const offsetRotation = quat.multiply(q, worldRotation, inverseAnchorRotation)
				// const offset = mat4.fromRotationTranslation(mat4.create(), offsetRotation, offsetPosition)
				const wt = mat4.multiply(mat4.create(), hit.anchor_transform, hit.local_transform)
				const anchorOffset = new XRAnchorOffset(anchor, hit.local_transform)
				resolve(anchorOffset)
			} else {
				let anchor = this._anchors.get(hit.uuid)
				// it is unclear WHY there would already be an anchor for this, since any hit
				// on an existing anchor is likely a plane (or other object eventually) which should result
				// in an offset from that existing anchor, the case above.  This case should happen if we
				// say we could hit feature points, and that is what is returned, so there would just be 
				// a world location that isn't an anchor.  
				if(!anchor){
					anchor = new XRAnchor(hit.world_transform, hit.uuid)
					console.log('created dummy anchor (not a plane) from hit test')
					// mark this as possibly needing replacement
					anchor.placeholder = true;
					this._anchors.set(hit.uuid, anchor)
				} else {
					console.log('hit test resulted in a hit on an existing anchor, without an offset')
				}
				resolve(anchor)
			}
		})
	}

	removeAnchor(uid) {
		window.webkit.messageHandlers.removeAnchors.postMessage([uid])
	}


	/*
	 * ask for an image anchor.
	 * 
	 * Provide a uid for the anchor that will be created.
	 * Supply the image in an ArrayBuffer, typedArray or ImageData
	 * width and height are in meters 
	 */
  createImageAnchor(uid, buffer, width, height, physicalWidthInMeters) {
		return new Promise((resolve, reject) => {
            if (!this._isInitialized){
                reject(new Error('ARKit is not initialized'));
                return;
            }

            let b64 = base64.encode(buffer);

            window.webkit.messageHandlers.createImageAnchor.postMessage({
                uid: uid,
                buffer: b64,
                imageWidth: width,
                imageHeight: height,
                physicalWidth: physicalWidthInMeters,
								callback: this._createPromiseCallback('createImageAnchor', resolve)
            })
		})
	}

    /***
	 * activateDetectionImage activates an image and waits for the detection
     * @param uid The UID of the image to activate, previously created via "createImageAnchor"
     * @returns {Promise<any>} a promise that will be resolved when ARKit detects the image, or an error otherwise
     */
	activateDetectionImage(uid) {
        return new Promise((resolve, reject) => {
            if (!this._isInitialized){
                reject(new Error('ARKit is not initialized'));
                return;
            }

            window.webkit.messageHandlers.activateDetectionImage.postMessage({
                uid: uid,
                callback: this._createPromiseCallback('activateDetectionImage', resolve)
            })
        })
	}

	    /***
     * getWorldMap requests a worldmap from the platform
     * @returns {Promise<any>} a promise that will be resolved when the worldMap has been retrieved, or an error otherwise
     */
		getWorldMap() {
			return new Promise((resolve, reject) => {
					 if (!this._isInitialized){
							 reject(new Error('ARKit is not initialized'));
							 return;
					 }

					 window.webkit.messageHandlers.getWorldMap.postMessage({
							 callback: this._createPromiseCallback('getWorldMap', resolve)
					 })
			})
		}

	 /***
		* setWorldMap requests a worldmap for the platform be set
		* @returns {Promise<any>} a promise that will be resolved when the worldMap has been set, or an error otherwise
		*/
		setWorldMap(worldMap) {
			return new Promise((resolve, reject) => {
					 if (!this._isInitialized){
							 reject(new Error('ARKit is not initialized'));
							 return;
					 }

					 window.webkit.messageHandlers.setWorldMap.postMessage({
						 worldMap: worldMap.worldMap,
							 callback: this._createPromiseCallback('setWorldMap', resolve)
					 })
			})
		}
		

	/* 
	RACE CONDITION:  call stop, then watch:  stop does not set isWatching false until it gets a message back from the app,
	so watch will return and not issue a watch command.   May want to set isWatching false immediately?
	*/

	/*
	If this instance is currently watching, send the stopAR message to ARKit to request that it stop sending data on onWatch
	*/
	stop(){
		return new Promise((resolve, reject) => {
			if (!this._isWatching){
				resolve();
				return;
			}
			console.log('----STOP');
			window.webkit.messageHandlers.stopAR.postMessage({
				callback: this._createPromiseCallback('stop', resolve)
			})
		})
	}
	
	/*
	If not already watching, send a watchAR message to ARKit to request that it start sending per-frame data to onWatch
	options: the options map for ARKit
		{
			location: boolean,
			camera: boolean,
			objects: boolean,
			light_intensity: boolean,
			computer_vision_data: boolean
		}
	*/

	watch(options=null){
		if (!this._isInitialized){
			return false
		}
		if(this._isWatching){
			return true
		}
		this._isWatching = true

		var newO = Object.assign({}, this._defaultOptions);

		if(options != null) {
			newO = Object.assign(newO, options)
		}

		// option to WebXRView is different than the WebXR option
		if (newO.videoFrames) {
			delete newO.videoFrames
			newO.computer_vision_data = true;
		}

		const data = {
			options: newO,
			callback: this._globalCallbacksMap.onWatch
		}
		console.log('----WATCH');
		window.webkit.messageHandlers.watchAR.postMessage(data)
		return true
	}

	/*
	Sends a setUIOptions message to ARKit to set ui options (show or hide ui elements)
	options: {
		browser: boolean,
		points: boolean,
		focus: boolean,
		rec: boolean,
		rec_time: boolean,
		mic: boolean,
		build: boolean,
		plane: boolean,
		warnings: boolean,
		anchors: boolean,
		debug: boolean,
		statistics: boolean
	}
	*/
	setUIOptions(options){
		window.webkit.messageHandlers.setUIOptions.postMessage(options)
	}

	/*
	Called during instance creation to send a message to ARKit to initialize and create a device ID
	Usually results in ARKit calling back to _onInit with a deviceId
	options: {
		ui: {
			browser: boolean,
			points: boolean,
			focus: boolean,
			rec: boolean,
			rec_time: boolean,
			mic: boolean,
			build: boolean,
			plane: boolean,
			warnings: boolean,
			anchors: boolean,
			debug: boolean,
			statistics: boolean
		}
	}
	*/
	_sendInit(options){
		// get device id
		console.log('----INIT');
		window.webkit.messageHandlers.initAR.postMessage({
			options: options,
			callback: this._globalCallbacksMap.onInit
		})
	}

	/*
	Callback for when ARKit is initialized
	deviceId: DOMString with the AR device ID
	*/
	_onInit(deviceId){
		this._deviceId = deviceId
		this._isInitialized = true
		try {
			this.dispatchEvent(
				ARKitWrapper.INIT_EVENT,
				new CustomEvent(ARKitWrapper.INIT_EVENT, {
					source: this
				})
			)
        } catch(e) {
            console.error('INIT_EVENT event error', e)
        }
	}

	/*
	_onWatch is called from native ARKit on each frame:
		data:
		{
			"timestamp": time value
			"light_intensity": value
			"camera_view":[4x4 column major affine transform matrix],
			"projection_camera":[4x4 projection matrix],
			"newObjects": [
				{
					uuid: DOMString (unique UID),
					transform: [4x4 column major affine transform],
					plane_center: {x, y, z},  // only on planes
					plane_center: {x, y, z}	// only on planes, where x/z are used,
				}, ...
			],
			"removeObjects": [
				uuid: DOMString (unique UID), ...
			]
			"objects":[
				{
					uuid: DOMString (unique UID),
					transform: [4x4 column major affine transform]
					plane_center: {x, y, z},  // only on planes
					plane_center: {x, y, z}	// only on planes, where x/z are used,
				}, ...
			]
		}

	*/
	_createOrUpdateAnchorObject(element) {
		if(element.plane_center){
			var plane = this._planes.get(element.uuid);
			var anchor = this._anchors.get(element.uuid);

			if(!plane){
				var planeObject = new XRPlaneAnchor(element.transform,
					element.uuid,
					element.plane_center,
					[element.plane_extent.x, element.plane_extent.z],
					element.plane_alignment,
					element.geometry)

				// check if we created a fake anchor for this as a result of hit testing
				if (anchor) {
					try {
						anchor.dispatchEvent("replaceAnchor",
							new CustomEvent("replaceAnchor", {
								source: anchor,
								detail: plane
							})
						)
					} catch(e) {
							console.error('replaceAnchor event error', e)
					}
					console.log('replaced dummy anchor created from hit test with plane')
					this._anchors.delete(element.uuid)
				} 

				this._planes.set(element.uuid, {
					id: element.uuid,
					// center: element.plane_center,
					// extent: [element.plane_extent.x, element.plane_extent.z],
					// modelMatrix: element.transform,
					// alignment: element.plane_alignment,
					object: planeObject
				});
				element.object = planeObject
			} else {
				// plane.center = element.plane_center
				// plane.extent[0] = element.plane_extent.x
				// plane.extent[1] = element.plane_extent.y
				// plane.modelMatrix = element.transform
				// plane.alignment = element.plane_alignment
				// plane.geometry = element.geometry
				plane.object.updatePlaneData(element.plane_center, [element.plane_extent.x,element.plane_extent.y], element.plane_alignment, element.geometry)
				plane.object.modelMatrix = element.transform
				plane.object.notifyOfUpdate();
				element.object = plane.object
			}
		}else{
			anchor = this._anchors.get(element.uuid);

			if(!anchor || anchor.placeholder){
				let anchorObject
				switch (element.type) {
					case ARKitWrapper.ANCHOR_TYPE_FACE:
						anchorObject = new XRFaceAnchor(element.transform, element.uuid, element.geometry, element.blendShapes)
						break
					case ARKitWrapper.ANCHOR_TYPE_ANCHOR:
						anchorObject = new XRAnchor(element.transform, element.uuid)
						break
					case ARKitWrapper.ANCHOR_TYPE_IMAGE:
						anchorObject = new XRImageAnchor(element.transform, element.uuid)
						break
				}

				// if there is an old anchor, that was a placeholder, replace it
				if (anchor) {
					try {
						anchor.dispatchEvent("replaceAnchor",
							new CustomEvent("replaceAnchor", {
								source: anchor,
								detail: anchorObject
							})
						)
					} catch(e) {
							console.error('replaceAnchor event error', e)
					}
					console.log('replaced dummy anchor created from hit test with new anchor')
				}
				this._anchors.set(element.uuid, {
					id: element.uuid,
					object: anchorObject
					// modelMatrix: element.transform
				});
				element.object = anchorObject
			} else {
				switch (element.type) {
					case ARKitWrapper.ANCHOR_TYPE_FACE:
						anchor.object.updateFaceData(element.transform, element.geometry, element.blendShapes)
						break
				}
				anchor.object.modelMatrix = element.transform
				anchor.object.notifyOfUpdate();
				element.object = anchor.object
			}
		}
	}

	_onWatch(data){
		this._rawARData = data
		var plane, anchor

		this._timestamp = this._adjustARKitTime(data.timestamp)
		this._lightIntensity = data.light_intensity;
		mat4.copy(this._cameraTransform, data.camera_transform);
		mat4.copy(this._viewMatrix, data.camera_view);
		mat4.copy(this._projectionMatrix, data.projection_camera);
		this._worldMappingStatus = data.worldMappingStatus;

		if(data.newObjects.length){
			for (let i = 0; i < data.newObjects.length; i++) {
				const element = data.newObjects[i];
				this._createOrUpdateAnchorObject(element)
			}
		}

		if(data.removedObjects.length){
			for (let i = 0; i < data.removedObjects.length; i++) {
				const element = data.removedObjects[i];
				const plane = this._planes.get(element)
				if(plane){
					plane.notifyOfRemoval();
					this._planes.delete(element);
				}else{
					const anchor = this._anchors.get(element)
					if (anchor) {
						anchor.notifyOfRemoval();
						this._anchors.delete(element);
					} else {
						console.error("app signalled removal of non-existant anchor/plane")
					}
				}
			}
		}

		if(data.objects.length){
			for (let i = 0; i < data.objects.length; i++) {
				const element = data.objects[i];
				this._createOrUpdateAnchorObject(element)
			}
		}

		try {
			this.dispatchEvent(
				ARKitWrapper.WATCH_EVENT, 
				new CustomEvent(ARKitWrapper.WATCH_EVENT, {
					source: this,
					detail: this
				})
			)
		} catch(e) {
				console.error('WATCH_EVENT event error', e)
		}

	}

	/*
	Callback from ARKit for when sending per-frame data to onWatch is stopped
	*/
	_onStop(){
		this._isWatching = false
	}

	_adjustARKitTime(time) {
		if (this._timeOffsetComputed) {
			return time + this._timeOffset; 
		} else {
			return ( performance || Date ).now()
		}
	}

	_createPromiseCallback(action, resolve){
		const callbackName = this._generateCallbackUID(action);
		window[callbackName] = (data) => {
			delete window[callbackName]
			const wrapperCallbackName = '_on' + action[0].toUpperCase() +
				action.slice(1);
			if (typeof(this[wrapperCallbackName]) == 'function'){
				this[wrapperCallbackName](data);
			}
			resolve(data)
		}
		return callbackName;
	}

	_generateCallbackUID(prefix){
		return 'arkitCallback_' + prefix + '_' + new Date().getTime() + 
			'_' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}

	/*
	The ARKit iOS app depends on several callbacks on `window`. This method sets them up.
	They end up as window.arkitCallback? where ? is an integer.
	You can map window.arkitCallback? to ARKitWrapper instance methods using _globalCallbacksMap
	*/
	_generateGlobalCallback(callbackName, num){
		const name = 'arkitCallback' + num
		this._globalCallbacksMap[callbackName] = name
		const self = this
		window[name] = function(deviceData){
			self['_' + callbackName](deviceData)
		}
	}

	/*
	ev.detail contains:
		{
		  "frame": {
			"buffers": [ // Array of base64 encoded string buffers
			  {
				"size": {
				  "width": 320,
				  "height": 180,
				  "bytesPerRow": 320,
				  "bytesPerPixel": 1
				},
				"buffer": "e3x...d7d"   /// convert to Uint8 buffer in code below
			  },
			  {
				"size": {
				  "width": 160,
				  "height": 90,
				  "bytesPerRow": 320,
				  "bytesPerPixel": 2
				},
				"buffer": "ZZF.../fIJ7"  /// convert to Uint8 buffer in code below
			  }
			],
			"pixelFormatType": "kCVPixelFormatType_420YpCbCr8BiPlanarFullRange",
			"pixelFormat": "YUV420P",  /// Added in the code below, clients should ignore pixelFormatType
			"timestamp": 337791
		  },
		  "camera": {
			"cameraIntrinsics": [3x3 matrix],
				fx 0   px
				0  fy  py
				0  0   1
				fx and fy are the focal length in pixels.
				px and py are the coordinates of the principal point in pixels.
				The origin is at the center of the upper-left pixel.

			"cameraImageResolution": {
			  "width": 1280,
			  "height": 720
			},
			"viewMatrix": [4x4 camera view matrix],
			"arCamera": true;
		    "cameraOrientation": 0,  // orientation in degrees of image relative to display
                            // normally 0, but on video mixed displays that keep the camera in a fixed 
                            // orientation, but rotate the UI, like on some phones, this will change
                            // as the display orientation changes
			"interfaceOrientation": 3,
				// 0 UIDeviceOrientationUnknown
				// 1 UIDeviceOrientationPortrait
				// 2 UIDeviceOrientationPortraitUpsideDown
				// 3 UIDeviceOrientationLandscapeRight
				// 4 UIDeviceOrientationLandscapeLeft
			"projectionMatrix": [4x4 camera projection matrix]
		  }
		}
	 */
	_onComputerVisionData(detail) {
		// convert the arrays
		if (!detail) {
			console.error("detail passed to _onComputerVisionData is null")
			this._requestComputerVisionData() 
			return;
		}
		// convert the arrays
		if (!detail.frame || !detail.frame.buffers || detail.frame.buffers.length <= 0) {
			console.error("detail passed to _onComputerVisionData is bad, no buffers")
			this._requestComputerVisionData() 
			return;
		}

		// the orientation matrix we get is relative to the current view orientation.  
		// We need to add an orientation around z, so that we have the orientation that goes from 
		// camera frame to the current view orientation, since the camera is fixed and the view
		// changes as we rotate the device. 
		//
		// We also set a cameraOrientation value for the orientation of the camera relative to the
		// display.  This will be particular to video-mixed-AR where the camera is the video on the
		// screen, since any other setup would need to use the full orientation (and probably 
		// wouldn't be rotating the content / UI)
		detail.camera.arCamera = true;
		var orientation = detail.camera.interfaceOrientation;
		detail.camera.viewMatrix = detail.camera.inverse_viewMatrix;
		// mat4.copy(this._mTemp, detail.camera.viewMatrix)
        switch (orientation) {
			case 1: 
				// rotate by -90;
				detail.camera.cameraOrientation = -90;
				// mat4.multiply(detail.camera.viewMatrix, this._mTemp, this._m90neg)
				break;

			case 2: 
				// rotate by 90;
				detail.camera.cameraOrientation = 90;
				// mat4.multiply(detail.camera.viewMatrix, this._mTemp, this._m90)
				break;
			case 3: 
				detail.camera.cameraOrientation = 0;
			// rotate by nothing
				break;
			case 4: 
				// rotate by 180;
				detail.camera.cameraOrientation = 180;
				// mat4.multiply(detail.camera.viewMatrix, this._mTemp, this._m180)
				break;
		}


		switch(detail.frame.pixelFormatType) {
			case "kCVPixelFormatType_420YpCbCr8BiPlanarFullRange":
				detail.frame.pixelFormat = "YUV420P";
				break;
			default:
				detail.frame.pixelFormat = detail.frame.pixelFormatType; 
				break;
		}

		var xrVideoFrame = new XRVideoFrame(detail.frame.buffers, detail.frame.pixelFormat, this._adjustARKitTime(detail.frame.timestamp), detail.camera )
		try {
			this.dispatchEvent(
				ARKitWrapper.COMPUTER_VISION_DATA,
				new CustomEvent(
					ARKitWrapper.COMPUTER_VISION_DATA,
					{
						source: this,
						detail: xrVideoFrame
					}
				)
			)
		} catch(e) {
			console.error('COMPUTER_VISION_DATA event error', e)
		}
	}

	/*
	Requests ARKit a new set of buffers for computer vision processing
	 */
    _requestComputerVisionData() {
        window.webkit.messageHandlers.requestComputerVisionData.postMessage({})
	}

	/*
	Requests ARKit to start sending CV data (data is send automatically when requested and approved)
	 */
    _startSendingComputerVisionData() {
        window.webkit.messageHandlers.startSendingComputerVisionData.postMessage({})
	}

	/*
	Requests ARKit to stop sending CV data
	 */
    _stopSendingComputerVisionData() {
        window.webkit.messageHandlers.stopSendingComputerVisionData.postMessage({})
	}
	
}

// ARKitWrapper event names:
ARKitWrapper.INIT_EVENT = 'arkit-init'
ARKitWrapper.WATCH_EVENT = 'arkit-watch'
ARKitWrapper.RECORD_START_EVENT = 'arkit-record-start'
ARKitWrapper.RECORD_STOP_EVENT = 'arkit-record-stop'
ARKitWrapper.DID_MOVE_BACKGROUND_EVENT = 'arkit-did-move-background'
ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT = 'arkit-will-enter-foreground'
ARKitWrapper.INTERRUPTED_EVENT = 'arkit-interrupted'
ARKitWrapper.INTERRUPTION_ENDED_EVENT = 'arkit-interruption-ended'
ARKitWrapper.SHOW_DEBUG_EVENT = 'arkit-show-debug'
ARKitWrapper.WINDOW_RESIZE_EVENT = 'arkit-window-resize'
ARKitWrapper.ON_ERROR = 'on-error'
ARKitWrapper.AR_TRACKING_CHANGED = 'ar_tracking_changed'
ARKitWrapper.COMPUTER_VISION_DATA = 'cv_data'
ARKitWrapper.USER_GRANTED_COMPUTER_VISION_DATA = 'user-granted-cv-data'
ARKitWrapper.USER_GRANTED_WORLD_SENSING_DATA = 'user-granted-world-sensing-data'

// ARKit Detection Image Orientations
ARKitWrapper.ORIENTATION_UP = 1        			// 0th row at top,    0th column on left   - default orientation
ARKitWrapper.ORIENTATION_UP_MIRRORED = 2    	// 0th row at top,    0th column on right  - horizontal flip
ARKitWrapper.ORIENTATION_DOWN = 3          		// 0th row at bottom, 0th column on right  - 180 deg rotation
ARKitWrapper.ORIENTATION_DOWN_MIRRORED = 4  	// 0th row at bottom, 0th column on left   - vertical flip
ARKitWrapper.ORIENTATION_LEFT_MIRRORED = 5  	// 0th row on left,   0th column at top
ARKitWrapper.ORIENTATION_RIGHT = 6         		// 0th row on right,  0th column at top    - 90 deg CW
ARKitWrapper.ORIENTATION_RIGHT_MIRRORED = 7 	// 0th row on right,  0th column on bottom
ARKitWrapper.ORIENTATION_LEFT = 8				// 0th row on left,   0th column at bottom - 90 deg CCW

// world mapping status
ARKitWrapper.WEB_AR_WORLDMAPPING_NOT_AVAILABLE = "ar_worldmapping_not_available"
ARKitWrapper.WEB_AR_WORLDMAPPING_LIMITED       = "ar_worldmapping_limited"
ARKitWrapper.WEB_AR_WORLDMAPPING_EXTENDING     = "ar_worldmapping_extending"
ARKitWrapper.WEB_AR_WORLDMAPPING_MAPPED        = "ar_worldmapping_mapped"

// hit test types
ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT = 1
ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE = 2
ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_VERTICAL_PLANE = 4
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE = 8
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT = 16
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_GEOMETRY = 32

ARKitWrapper.HIT_TEST_TYPE_ALL = ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT

ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANES = ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT

ARKitWrapper.ANCHOR_TYPE_PLANE = 'plane'
ARKitWrapper.ANCHOR_TYPE_FACE = 'face'
ARKitWrapper.ANCHOR_TYPE_ANCHOR = 'anchor'
ARKitWrapper.ANCHOR_TYPE_IMAGE = 'image'