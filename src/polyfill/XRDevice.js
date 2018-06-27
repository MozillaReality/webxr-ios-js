import MatrixMath from '../math/MatrixMath.js'
import EventHandlerBase from '../event/EventHandlerBase.js'

import XRFrameOfReference from './XRFrameOfReference.js'

/*
Each XRDevice represents a method of using a specific type of hardware to render AR or VR realities and layers.

This doesn't yet support a geospatial coordinate system
*/
export default class XRDevice extends EventHandlerBase {
	constructor(xr, deviceName, isExternal){
		super()
		this._xr = xr
		this._deviceName = deviceName
		this._isExternal = isExternal

		this._headModelCoordinateSystem = new XRCoordinateSystem(this, XRFrameOfReference.HEAD_MODEL)
		this._eyeLevelCoordinateSystem = new XRCoordinateSystem(this, XRFrameOfReference.EYE_LEVEL)
		this._stageCoordinateSystem = new XRCoordinateSystem(this, XRFrameOfReference.STAGE)

		this._headPose = new XRDevicePose([0, XRDevicePose.SITTING_EYE_HEIGHT, 0])
		this._eyeLevelPose = new XRDevicePose([0, XRDevicePose.SITTING_EYE_HEIGHT, 0])
		this._stagePoseModelMatrix = MatrixMath.mat4_generateIdentity()

		this._fovy = 70;
		var fov = this._fovy/2;
		this._fov = new XRFieldOfView(fov, fov, fov, fov)
		this._depthNear = 0.1
		this._depthFar = 1000

		this._views = []
	}

	get _external(){ return this._isExternal }

	supportsSession(parameters){
		// parameters: XRSessionCreateOptions 
		// returns Promise<void>
		return new Promise((resolve, reject) => {
			if(this._supportedCreationParameters(parameters)){
				resolve(null)
			} else {
				reject(null)
			}
		})
	}

	requestSession(parameters){
		return new Promise((resolve, reject) => {
			if(this._supportedCreationParameters(parameters) === false){
				reject()
				return
			}
			resolve(this._createSession(parameters))
		})
	}

	// no-op unless display supports it
	_requestVideoFrame() {}
	
	_requestAnimationFrame(callback){
		return window.requestAnimationFrame(callback)
	}

	_cancelAnimationFrame(handle){
		return window.cancelAnimationFrame(handle)		
	}

	_createSession(parameters){
		return new XRSession(this._xr, this, parameters)
	}

	_supportedCreationParameters(parameters){
		// returns true if the parameters are supported by this device
		throw 'Should be implemented by extending class'
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(frame){}

	/*
	Called by a session after it has handed the XRPresentationFrame to the app
	Use this for any device submission calls that need to happen after the render has occurred.
	*/
	_handleAfterFrame(frame){}


	/*
	Called by XRSession after the session.baseLayer is assigned a value
	*/
	_handleNewBaseLayer(baseLayer){}

}
