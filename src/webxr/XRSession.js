import MatrixMath from '../math/MatrixMath.js'

import ARKitWrapper from '../arkit/ARKitWrapper.js'

import EventHandlerBase from '../event/EventHandlerBase.js'

import XRDevice from './XRDevice.js'

/*
A script that wishes to make use of an XRDevice can request an XRSession.
*/
export default class XRSession extends EventHandlerBase {
	constructor(xr, device, createParameters){
		super(xr)
		this._xr = xr
		this._device = device
		this._createParameters = createParameters
		this._ended = false

		this._baseLayer = new XRWebGLLayer(this, createParameters.outputContext.canvas.getContext('webgl'))
		this._device._handleNewBaseLayer(this._baseLayer)
	}

	get device(){ return this._device }

	get immersive(){ return this._createParameters.immersive }

	get outputContext(){ return this._createParameters.outputContext }

	get environmentBlendMode(){
		console.log('TODO')
	}

	get depthNear(){ this._device._depthNear }
	set depthNear(value){ this._device._depthNear = value }

	get depthFar(){ this._device._depthFar }
	set depthFar(value){ this._device._depthFar = value }

	get baseLayer(){ return this._baseLayer }

	requestFrameOfReference(type, options){
		// Promise<XRFrameOfReference> requestFrameOfReference(VRFrameOfReferenceType type, optional VRFrameOfReferenceOptions options);
		return new Promise((resolve, reject) => {
			switch(type){
				case XRFrameOfReference.HEAD_MODEL:
					resolve(this._device._headModelCoordinateSystem)
				case XRFrameOfReference.EYE_LEVEL:
					resolve(this._device._eyeLevelCoordinateSystem)
				case XRFrameOfReference.STAGE:
					resolve(this._device._stageCoordinateSystem)
				default:
					reject()
			}
		})
	}

	getInputSources(){
		//  FrozenArray<XRInputSource> getInputSources();
		console.error('TODO')
	}

	requestAnimationFrame(callback){
		if(this._ended) return null
		if(typeof callback !== 'function'){
			throw 'Invalid callback'
		}
		return this._device._requestAnimationFrame(() => {
			const frame = this._createPresentationFrame()
			this._device._handleNewFrame(frame)
			callback(frame)
			this._device._handleAfterFrame(frame)
		})
	}

	cancelAnimationFrame(handle){
		return this._device._cancelAnimationFrame(handle)
	}

	end(){
		if(this._ended) return
		for (var i = 0; i< this._frameAnchors.length; i++) {
			this._display._reality._removeAnchor(this._frameAnchors[i].uid)			
		}
		this._frameAnchors = [];
		this._ended = true
		this._device._stop()
		return new Promise((resolve, reject) => {
			resolve()
		})
	}

	_updateCameraAnchor(frame) {
		// new anchor each minute
		if (this._frameAnchors.length == 0 || (this._frameAnchors[0].timestamp + 60000) < frame.timestamp) {
			const headCoordinateSystem = frame.getCoordinateSystem(XRCoordinateSystem.EYE_LEVEL)
			const anchorUID = frame.addAnchor(headCoordinateSystem, [0,-1,0])
			const anchor = frame.getAnchor(anchorUID)
			anchor.timestamp = frame.timestamp;
			this._frameAnchors.unshift(anchor)

			if (this._frameAnchors.length > 10) {
				var oldAnchor = this._frameAnchors.pop()
				this._display._reality._removeAnchor(oldAnchor.uid)
			}
			return anchor;
		} else {
			return this._frameAnchors[0]
		}		
	}

	_transformToCameraAnchor(camera) {
		if (this._frameAnchors.length == 0) return camera.viewMatrix
		
		var matrix = camera.viewMatrix
		camera._anchorUid = this._frameAnchors[0].uid

		const anchorCoords = this._frameAnchors[0].coordinateSystem

		// should only have to invert anchor coords, but we're sending in the inverse
		// of the camera pose ...

		// get world to anchor by inverting anchor to world
		MatrixMath.mat4_invert(this._tempMatrix, anchorCoords._poseModelMatrix)

		// get camera to world by inverting world to camera
		// MatrixMath.mat4_invert(this._tempMatrix2, matrix)
		// MatrixMath.mat4_multiply(camera.viewMatrix, this._tempMatrix, this._tempMatrix2)
		MatrixMath.mat4_multiply(camera.viewMatrix, this._tempMatrix, matrix)
	}

	// normalized screen x and y are in range 0..1, with 0,0 at top left and 1,1 at bottom right
	hitTest(normalizedScreenX, normalizedScreenY, options=null){
		// Promise<XRAnchorOffset?> findAnchor(float32, float32); // cast a ray to find or create an anchor at the first intersection in the Reality
		return this.reality._findAnchor(normalizedScreenX, normalizedScreenY, this.display, options)
	}
	
	_createPresentationFrame(timestamp){
		return new XRPresentationFrame(this, timestamp)
	}

	/*
	attribute EventHandler onblur;
	attribute EventHandler onfocus;
	attribute EventHandler onresetpose;
	attribute EventHandler onend;
	attribute EventHandler onselect;
	attribute EventHandler onselectstart;
	attribute EventHandler onselectend;
  	*/
}