import XRView from './webxr/XRView.js'
import XRLayer from './webxr/XRLayer.js'
import XRFrame from './webxr/XRFrame.js'
import XRDevice from './webxr/XRDevice.js'
import XRSession from './webxr/XRSession.js'
import XRViewport from './webxr/XRViewport.js'
import XRInputPose from './webxr/XRInputPose.js'
import XRDevicePose from './webxr/XRDevicePose.js'
import XRWebGLLayer from './webxr/XRWebGLLayer.js'
import XRInputSource from './webxr/XRInputSource.js'
import XRStageBounds from './webxr/XRStageBounds.js'
import XRCoordinateSystem from './webxr/XRCoordinateSystem.js'
import XRFrameOfReference from './webxr/XRFrameOfReference.js'
import XRStageBoundsPoint from './webxr/XRStageBoundsPoint.js'
import XRPresentationContext from './webxr/XRPresentationContext.js'

import EventHandlerBase from './event/EventHandlerBase.js'

/*
XRPolyfill implements the navigator.xr functionality as a polyfill

Code below will check for navigator.xr and if it doesn't exist will install this polyfill,
so you can safely include this script in any page.
*/
class XRPolyfill extends EventHandlerBase {
	constructor(){
		super()
		window.XRView = XRView
		window.XRLayer = XRLayer
		window.XRFrame = XRFrame
		window.XRDevice = XRDevice
		window.XRSession = XRSession
		window.XRViewport = XRViewport
		window.XRInputPose = XRInputPose
		window.XRWebGLLayer = XRWebGLLayer
		window.XRDevicePose = XRDevicePose
		window.XRInputSource = XRInputSource
		window.XRStageBounds = XRStageBounds
		window.XRStageBoundsPoint = XRStageBoundsPoint
		window.XRFrameOfReference = XRFrameOfReference
		window.XRCoordinateSystem = XRCoordinateSystem
		window.XRPresentationContext = XRPresentationContext

		this._devices = []
	}

	requestDevice(){
		return new Promise((resolve, reject) => {
			// TODO
			console.log('TODO requestDevice')
		})
	}

	//attribute EventHandler ondevicechange;
}

/* Install XRPolyfill if navigator.xr does not exist */
if(typeof navigator.xr === 'undefined') navigator.xr = new XRPolyfill()
