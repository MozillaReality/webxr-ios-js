import XRFrameOfReference from './XRFrameOfReference.js'

/*
XRFrame provides all of the values needed to render a single frame of an XR scene to the XRDevice.
*/
export default class XRFrame {
	constructor(session, timestamp){
		this._session = session
		this._timestamp = this._session.reality._getTimeStamp(timestamp);
	}

	get session() { return this._session }

	get views(){
		//readonly attribute FrozenArray<XRView> views;
		return this._session._device._views
	}

	getDevicePose(coordinateSystem){
		// XRDevicePose? getDevicePose(XRCoordinateSystem coordinateSystem);
		switch(coordinateSystem._type){
			case XRFrameOfReference.HEAD_MODEL:
				return this._session._device._headPose
			case XRFrameOfReference.EYE_LEVEL:
				return this._session._device._eyeLevelPose
			default:
				return null
		}
	}

	getInputPose(inputSource, coordinateSystem){
		//  XRInputPose? getInputPose(XRInputSource inputSource, XRCoordinateSystem coordinateSystem)
		console.error('TODO')
	}
}