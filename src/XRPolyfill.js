import XRView from './polyfill/XRView.js'
import XRLayer from './polyfill/XRLayer.js'
import XRFrame from './polyfill/XRFrame.js'
import XRDevice from './polyfill/XRDevice.js'
import XRSession from './polyfill/XRSession.js'
import XRViewport from './polyfill/XRViewport.js'
import XRInputPose from './polyfill/XRInputPose.js'
import XRDevicePose from './polyfill/XRDevicePose.js'
import XRWebGLLayer from './polyfill/XRWebGLLayer.js'
import XRInputSource from './polyfill/XRInputSource.js'
import XRStageBounds from './polyfill/XRStageBounds.js'
import XRCoordinateSystem from './polyfill/XRCoordinateSystem.js'
import XRFrameOfReference from './polyfill/XRFrameOfReference.js'
import XRStageBoundsPoint from './polyfill/XRStageBoundsPoint.js'
import XRPresentationContext from './polyfill/XRPresentationContext.js'

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
