/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as mat3 from 'gl-matrix/src/gl-matrix/mat3'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'
import MapzenTerrariumTerrainProvider from '../lib/MapzenTerrariumTerrainProvider.js'
// import XRAnchor from './XRAnchor.js'
// import XRDevice from 'webxr-polyfill/src/api/XRDevice'
import GLOBALS from 'webxr-polyfill/src/lib/global.js'

var XRAnchor = null
var XRDevice = null

if (GLOBALS["XRAnchor"] !== undefined) var XRAnchor = GLOBALS.XRAnchor
if (GLOBALS["XRDevice"] !== undefined) var XRDevice = GLOBALS.XRDevice

/* ** path the XRSession
*/ 
function _patchXRDevice() {
    XRDevice = GLOBALS.XRDevice

    var __XRDevice_requestSession = XRDevice.prototype.requestSession
    XRDevice.prototype.requestSession = async function (options) {
        let bindrequest = __XRDevice_requestSession.bind(this)
        let session = await bindrequest(options)

        // must have Cesium loaded by the time you request a session or Geo won't work
        if (window.hasOwnProperty("Cesium") && options.alignEUS && options.geolocation) {
            const onSessionEnd = () => {
                _XRsession = null
                if (_watchID) {
                    navigator.geolocation.clearWatch(_watchID);
                    _watchID = 0
                }
                resetState()
                session.removeEventListener('end', onSessionEnd);        
            }
            session._useGeolocation = true
            
            session.addEventListener('end', onSessionEnd);
            await useSession(session)
        }
        return session
    }

    var __XRDevice_endSession = XRDevice.prototype.endSession
    XRDevice.prototype.endSession = function(sessionId) {
        let bindrequest = __XRDevice_endSession.bind(this)
        let ret = bindrequest(sessionId)
        if (session._useGeolocation) {
            XRGeospatialAnchor.closeSession()
        }
        return ret
    }

    var __XRDevice_supportsSession = XRDevice.prototype.supportsSession
    XRDevice.prototype.supportsSession = async function (options={}) {
        let bindrequest = __XRDevice_supportsSession.bind(this)
        let newOptions = Object.assign({}, options)
        var _wantsGeo = false
        if (options.hasOwnProperty("geolocation")) {
            _wantsGeo = true
            delete newOptions.geolocation
        }
        let ret = await bindrequest(options)  // if not supported, will throw
        
        if (!_wantsGeo || options.hasOwnProperty("alignEUS")) {
            return true
        } else {
            throw(null)
        }
    }
}

async function useSession(session) { 
    _XRsession = session

    if (!_eastUpSouthToFixedFrame) {
        _eastUpSouthToFixedFrame = Cesium.Transforms.localFrameToFixedFrameGenerator('east','up');
    }
    if (!defaultTerrainProvider) {
        defaultTerrainProvider = new MapzenTerrariumTerrainProvider({
            url : 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/',
            requestWaterMask : true,
            requestVertexNormals : true
        })
    }
    // Cesium.Cartesian methods will create and we can store the result here
    // if (!_scratchCartesian) {
    //     _scratchCartesian = new Cesium.Cartesian3()
    // }
    
    try {
        let _headLevelFrameOfReference = await session.requestFrameOfReference('head-model')
        _eyeLevelFrameOfReference = await session.requestFrameOfReference('eye-level')

        if (!("geolocation" in navigator)) {
            return false
        }

        _watchID = navigator.geolocation.watchPosition(updatePositionCallback, geoErrorCallback, _geo_options)
        
        return true;
    } catch (err) {
        console.error("Can't start geolocation to XR mapping", err)
        return false;
    }
}

/* *******
 * constants
 */
const _geo_options = {
    enableHighAccuracy: true, 
    maximumAge        : 30000
};
const _identity = mat4.create()

var _scratchVec3 = vec3.create()
var _scratch2Vec3 = vec3.create()
var _scratchMat4 = mat4.create()
var _scratchMat3 = mat3.create()

var _scratchCartesian = null

/****
 * state variables
 * - 
 */
var _XRsession = null

// the device geolocation and corresponding data value
var _geoOrigin = null  // this will be the Position object from navigator.geolocation.watchPosition

var _geoOriginAnchor = null
var _geoCartesian = null

// anchors waiting for a valid geolocation 
var _geoAnchorsWaiting = []

// our current transforms to and from geospatial coordinates
var _eastUpSouthToFixedFrame = null
var _fixedToLocal = mat4.create()
var _localToFixed = mat4.create()

// need these for various computations
var _eyeLevelFrameOfReference = null

// are we overriding the geoposition?
var _overrideGeolocation = false
var _overrideCartesian = null
var _overrideLocationAnchor = null

// are we overriding the geoorientation
var _overrideGeoOrientation = false
var _overrideOrientationAnchor = null

// for the geolocation watcher
var _watchID = 0

function currentGeoOriginAnchor() {
    return _overrideGeolocation ? _overrideLocationAnchor : _geoOriginAnchor
}

function currentGeoOriginCartesian() {
    let cartesian = _overrideGeolocation ? _overrideCartesian : _geoCartesian
    
}
// reset the core variables that are used to signal state
function resetState() {
    _geoOrigin = null  // this will be the Position object from navigator.geolocation.watchPosition
    _geoOriginAnchor = null
    _overrideGeolocation = false
    _overrideGeoOrientation = false

    _geoAnchorsWaiting = []    
}

/***
 * get altitude for LL's with no A
 */
async function getAltitude(cart) {
    var _altScratchCart = Cesium.Cartographic.clone(cart, _altScratchCart)
    await updateHeightFromTerrain(_altScratchCart)
    return _altScratchCart.height

//     let elevation = 0
//     try {
//         let key = "AIzaSyBrirea7OVV4aKJ9Y0UAp6Nbr6-fXtr-50"
//         let url = "https://maps.googleapis.com/maps/api/elevation/json?locations="+latitude+","+longitude+"&key="+key
//         let response = await fetch(url)
//         let json = await response.json()
//         console.log("altitude query was")
//         console.log(json)
//         if(json && json.results) elevation = json.results.elevation
//     } catch(e) {
//         throw e
//     }
//     return elevation
}

var defaultTerrainProvider = null

function updateHeightFromTerrain(cartographic) {
    return Promise.resolve(Cesium.sampleTerrain(defaultTerrainProvider, 15, [cartographic]).then(results => {
        return results[0]
    }))
}

/*** 
 * ensure our cartesian's have altitude
 */
async function cartographicToFixed(longitude, latitude, altitude=null) {
    if (!altitude) {
        let cart = Cesium.Cartographic.fromDegrees(longitude,latitude)
        altitude = await getAltitude(cart)
    }
    return Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
}

/**
 * set the local transformation matrices, to and from the local coordinate system
 * anchor at the given point on the earth
 */
function updateECEFToLocal(cartesian) {
    _eastUpSouthToFixedFrame(cartesian, undefined, _localToFixed)
    Cesium.Matrix4.inverseTransformation(_localToFixed, _fixedToLocal) 
}

/**
 * Handle updates from the geolocation API.  If we get a report with better accuracy
 * then use that.  
 * 
 * TODO:
 * - smarter update, such as checking if the reported geolocation is outside of
 *   the computed geolocation based on last anchor, for more than a few reports.  
 * - occasionally move the anchor if we've moved a long distance ... not sure ARKit
 *   can handle moving the distances required for this to matter, though
 * - deal with ARKit changing it's coordinate system as we move through the world, 
 *   and re-anchor if the Geolocation anchor is "as good", but has moved a long 
 *   way from the updated origin
 * - handle the geoAnchor being deleted (e.g., if ARKit can't track it anymore).  This
 *   should actually be straightforward
 *  
 * Create a new XRAnchor, and the associated relationships, and update
 * all the existing XRGeospatialAnchors 
 */

 function sendNewGeoAnchorEvent (oldAnchor, newAnchor) {
    try {
        oldAnchor.dispatchEvent( "newGeoAnchor", { 
            oldAnchor: oldAnchor,
            newAnchor: newAnchor
         })
    } catch(e) {
        console.error('newGeoAnchor event error', e)
    }
 }

 function updateGeoCartesian(cartesian, anchor) {
    updateECEFToLocal(cartesian) 
            
    for (let i = 0; i < _geoAnchorsWaiting.length; i++) {
        const callback = _geoAnchorsWaiting[i];
        try {
            callback()
        } catch(e) {
            console.error("lazy finalization of geoanchor failed: ", e)
        }
    }
    _geoAnchorsWaiting = []

    try {
        anchor.dispatchEvent( "updateCartesian")
    } catch(e) {
        console.error('updateCartesian event error', e)
    }
 }

var _useEstimatedElevationForViewer = false
var _savedViewHeight = 0
var _savedHeightOffset = 0

async function _useEstimatedElevation(setting, offsetFromGround) {
    let sleep = function (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    if (_useEstimatedElevationForViewer != setting) {
        // if we are changing the setting, we'll just create a new anchor
        _useEstimatedElevationForViewer = setting

        _savedHeightOffset = offsetFromGround

        // if we have a geoOrigin, update it.  Otherwise, the right thing will happen
        if (_geoOrigin) {
            if (_useEstimatedElevationForViewer) {
                _geoOrigin.coords.altitude = _savedViewHeight
            }
            while (_updateOrigin) {
                await sleep(1)

                await updatePositionCallback(_geoOrigin, true)
            }
        }
    } else if (_useEstimatedElevation) {
        // if we are already using estimated elevation, then we want to reset
        // the elevation of the anchor so that the estimated elevation is correct 
        // where we are
        _updateOffsetFromGround(offsetFromGround)
    }
}

// the idea here is that as we move around the world, if we're using the estimated elevation
// our elevation may change (e.g, going from up on a structure to the ground) such that 
// the _other_ stuff in the world is now wrong.  
async function _updateOffsetFromGround (offsetFromGround) {
    if (_useEstimatedElevationForViewer) {
        var offsetDiff = offsetFromGround - _savedHeightOffset;

        _savedHeightOffset += offsetDiff

        if (_geoOrigin) {
            _geoOrigin.coords.altitude += offsetDiff

            // need to determine my altitude where I am right now, computed 
            // from elevation estimate
            let _headLevelFrameOfReference = await _XRsession.requestFrameOfReference('head-model')
            _headLevelFrameOfReference.getTransformTo(_eyeLevelFrameOfReference, _scratchMat4)
            // position of device in ARKit coords
            mat4.getTranslation(_scratchVec3, _scratchMat4)

            // position of anchor
            mat4.getTranslation(_scratch2Vec3, currentGeoOriginAnchor().modelMatrix)

            // device relative to anchor
            vec3.subtract(_scratchVec3, _scratchVec3, _scratch2Vec3)

            // the Y at the device, in WebXR coordinates
            var yAtDevice = _scratchVec3[1]
            
            // convert to FIXED relative to the geoAnchor, then cartesian
            // then get the estimated altitude of the location
            // where the device currently is
            vec3.transformMat4(_scratch2Vec3, _scratchVec3, _geoOrigin._localToFixed)
            _scratchCartesian = Cesium.Cartesian3.unpack(_scratch2Vec3, 0, _scratchCartesian)
            
            // cartographic of device, relative to anchor
            let cart = Cesium.Cartographic.fromCartesian(_scratchCartesian)
            // console.log("carto height at my pos: ", cart.height)

            // default elevation of device, relative to anchor
            let defaultHeight = await getAltitude(cart) + offsetFromGround
            
            // then determine the altitude in XR coordinates of the _geoOrigin/etc
            //mat4.getTranslation(_scratch2Vec3, currentGeoOriginAnchor().modelMatrix)

            // different in Y of XR coordinates between the _geoOrigin and device, currently
            let diffXR = yAtDevice //_scratch2Vec3[1] - yAtDevice

            // different between the default height I'm at now, and the default height of device at the origin
            let diffGeo = defaultHeight - _geoOrigin.coords.altitude

            // then adjust the _geoOrigin such that my computed altitude from it
            // matches my altitude if I recreated the anchor where I am

            // need to move the local cartesian up or down by the offset
            //let cartesian = Cesium.Cartesian3.fromDegrees(_geoOrigin.coords.longitude, _geoOrigin.coords.latitude, _geoOrigin.coords.altitude)

            // this should be 0,0,0
            // vec3.set(_scratchVec3, _geoOrigin.cartesian.x, _geoOrigin.cartesian.y, _geoOrigin.cartesian.z)
            // vec3.transformMat4(_scratchVec3, _scratchVec3, _geoOrigin._fixedToLocal)
            _scratchVec3[0] = _scratchVec3[2] = 0
            _scratchVec3[1] = offsetDiff
            _scratchVec3[1] += (diffGeo - diffXR)

            //_geoOrigin.coords.altitude -= (diffGeo - diffXR)

            // console.log("estimated height: ", defaultHeight)
            // console.log("current XR height: ", yAtDevice)
            // console.log("XR height diff between device and geoAnchor: ", diffXR)
            // console.log("geo height diff between device and geoAnchor: ", diffGeo)
            // console.log("new geoAnchor altitude: ", _scratchVec3[1])

            vec3.transformMat4(_geoCartesian, _scratchVec3, _geoOrigin._localToFixed)

            // now that we've updated, if we're not 
            if (!_overrideGeolocation) {
                updateGeoCartesian(_geoCartesian, _geoOriginAnchor)
                // console.log("_localToFixed: ", _localToFixed[12], _localToFixed[13], _localToFixed[14])
                // _headLevelFrameOfReference.getTransformTo(_eyeLevelFrameOfReference, _scratchMat4)
                // mat4.getTranslation(_scratchVec3, _scratchMat4)
                // mat4.getTranslation(_scratch2Vec3, currentGeoOriginAnchor().modelMatrix)
                // vec3.subtract(_scratchVec3, _scratchVec3, _scratch2Vec3)
                // vec3.transformMat4(_scratchVec3, _scratchVec3, _localToFixed)

                // _scratchCartesian = Cesium.Cartesian3.unpack(_scratchVec3, 0, _scratchCartesian)
                // let carto = Cesium.Cartographic.fromCartesian(_scratchCartesian)
                // console.log("computed device height after reset: ", carto.height)
            }
        }
    }
}

var _updatingOrigin = false
var _geoAnchorDeleted = false

async function updatePositionCallback (position, force=false)
{
    if (!_updatingOrigin && 
        (!_geoOrigin || _geoAnchorDeleted || force || 
            _geoOrigin.coords.accuracy > position.coords.accuracy || 
            (_geoOrigin.coords.accuracy == position.coords.accuracy && 
                _geoOrigin.coords.altitudeAccuracy > position.coords.altitudeAccuracy))) {
        // better geolocation!  create new anchor, re-do the alignment, notify all anchors of the change
        _updatingOrigin = true

        // lets make a deep copy so we can change it
        position = {
            timestamp: position.timestamp,
            coords: {
                altitude: position.coords.altitude,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed
            }
        }

        try {
            if (_useEstimatedElevationForViewer) {
                _savedViewHeight = position.coords.altitude
                let _scratchCartographic = Cesium.Cartographic.fromDegrees(position.coords.longitude, position.coords.latitude, position.coords.altitude)
                await updateHeightFromTerrain(_scratchCartographic)
                position.coords.altitude = _scratchCartographic.height + _savedHeightOffset

                // need to keep a bunch of these that are defined specifically relative to this
                // position report with the height offset taken into account
                position.cartesian = Cesium.Cartesian3.fromDegrees(position.coords.longitude, position.coords.latitude, position.coords.altitude)
                position._fixedToLocal = mat4.create()
                position._localToFixed = mat4.create()
                _eastUpSouthToFixedFrame(position.cartesian, undefined, position._localToFixed)
                Cesium.Matrix4.inverseTransformation(position._localToFixed, position._fixedToLocal) 
            }

            console.log("new geo anchor: ", position.coords)

            // get a new Anchor right where the device is right now
            let _headLevelFrameOfReference = await _XRsession.requestFrameOfReference('head-model')
            let newAnchor = await _XRsession.addAnchor(_identity, _headLevelFrameOfReference)

            _geoAnchorDeleted = false
            newAnchor.addEventListener("remove", _handleGeoAnchorDelete)

            newAnchor._isInternalGeoAnchor = true
            if (!_overrideGeolocation && _geoOriginAnchor) {
                sendNewGeoAnchorEvent (_geoOriginAnchor, newAnchor)
                await _XRsession.removeAnchor(_geoOriginAnchor)
            }
            _geoOriginAnchor = newAnchor
            _geoOrigin = position
            // call this, because return from geolocation API may have null altitude
            _geoCartesian = await cartographicToFixed(position.coords.longitude, position.coords.latitude, position.coords.altitude)

            if (!_overrideGeolocation) {
                updateGeoCartesian(_geoCartesian, _geoOriginAnchor)
            }
            _updatingOrigin = false;
        } catch(e) {
            _updatingOrigin = false;
            console.error("error setting the geospatial origin: ", e)
        }
    }   
}

function _handleGeoAnchorDelete() {
    console.log("geoAnchor deleted by system, will use next geospatial report")
    _geoAnchorDeleted = true
}

function geoErrorCallback (positionError)
{
    switch(positionError.code) {
        case 1: // permission denied
        case 2: // position unavailable
        case 3: // timeout
    }   
    console.error("watchPosition failed: ", positionError.message)
}

function generateUID() {
    return 'geoAnchor-' + new Date().getTime() + '-' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
}

function enqueueOrExec(callback) {
    if (_geoOrigin) {
        callback()
    } else {
        _geoAnchorsWaiting.push(callback)
    }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default class XRGeospatialAnchor extends XRAnchor {
    // this should only be called when things are working, from the factory below
    constructor(cartographic) {
		let uid = generateUID()
        super(_identity, uid)
        this._cartographic = cartographic
        this._localCartesian = vec3.create()
        this._cartesian = Cesium.Cartographic.toCartesian(cartographic)

        this._newGeoOriginNotifier = this._newGeoAnchor.bind(this)
        this._updateCartesianNotifier = this._updateLocalCartesian.bind(this)
        this._updateLocalNotifier = this._updateLocalMatrix.bind(this)
        let anchor = currentGeoOriginAnchor()
        anchor.addEventListener("newGeoAnchor", this._newGeoOriginNotifier)
        anchor.addEventListener("updateCartesian", this._updateCartesianNotifier)
        anchor.addEventListener("update", this._updateLocalNotifier)
        this._updateLocalCartesian()
    }

    _newGeoAnchor(event) {
        event.oldAnchor.removeEventListener("newGeoAnchor", this._newGeoOriginNotifier)
        event.oldAnchor.removeEventListener("updateCartesian", this._updateCartesianNotifier)
        event.oldAnchor.removeEventListener("update", this._updateLocalNotifier)
        event.newAnchor.addEventListener("newGeoAnchor", this._newGeoOriginNotifier)
        event.newAnchor.addEventListener("updateCartesian", this._updateCartesianNotifier)
        event.newAnchor.addEventListener("update", this._updateLocalNotifier)
    }

    _updateLocalCartesian() {
        vec3.set(_scratchVec3, this._cartesian.x, this._cartesian.y, this._cartesian.z)
        vec3.transformMat4(this._localCartesian, _scratchVec3, _fixedToLocal)

        // we can override the orientation around the geoAnchor, which rotates the
        // local cartesian around the geolocation anchor.
        if (_overrideGeoOrientation) {
            mat3.fromMat4(_scratchMat3, _overrideOrientationAnchor.modelMatrix)
            vec3.transformMat3(this._localCartesian, this._localCartesian, _scratchMat3)
        }
        this._updateLocalMatrix()
    }

    _updateLocalMatrix() {
        // we just want the position of the anchor, not the rotation, since everything is aligned with EUS
        mat4.getTranslation(_scratchVec3, currentGeoOriginAnchor().modelMatrix)
        vec3.add(_scratchVec3, _scratchVec3, this._localCartesian)
        mat4.fromTranslation(_scratchMat4, _scratchVec3)
        // the matrix for this "anchor" is based on the position of the geoAnchor and the position offset of 
        // this location from the geoAnchor.  We use just the position because these are points, and both of these
        // assume the base coordinate system is aligned with EUS
        super.updateModelMatrix(_scratchMat4, currentGeoOriginAnchor.timeStamp)
    }

    get cartographic () {
        if (this._cartographic == null) {
            this._cartographic = Cesium.Cartographic.fromCartesian(this._cartesian)
        }
        return this._cartographic
    }
    set cartographic (cartographic) {
        this._cartographic = cartographic
        this._cartesian = Cesium.Cartographic.toCartesian(cartographic)
        this._updateLocalCartesian()
    }

    get cartesian () { return this._cartesian}
    set cartesian (cartesian) {
        this._cartesian = cartesian
        this._cartographic = null;  // expensive to convert, do it lazily since we don't need it otherwise
        this._updateLocalCartesian()
    }

    // for debugging
    static getGeoOriginPose() { 
        if (currentGeoOriginAnchor()) {
            return currentGeoOriginAnchor().modelMatrix
        } else {
            return _identity
        }
    }

    static getOriginCartesian() {
        return currentGeoOriginCartesian()
    }

    ///// The external API calls
    //
    // the factory method you should call.
    static createGeoAnchor(cartographic) {
        return new Promise((resolve, reject) => {
            // make sure Cesium has been loaded
            if (!window.hasOwnProperty("Cesium")) {
                var e = "must load Cesium.js for XRGeospatialAnchor to work"
                console.error (e)
                reject(e)
            }
            const createAnchor = () => {
                resolve(new XRGeospatialAnchor(cartographic))
            }
    
            enqueueOrExec(createAnchor)
        })
    }

    static useEstimatedElevation(setting, offsetFromGround=0) {
        return _useEstimatedElevation(setting, offsetFromGround)
    }

    static updateOffsetFromGround(offsetFromGround) {
        return _updateOffsetFromGround(offsetFromGround)
    }

    // we can override the geo location, orientation, or both
    static overrideGeoOrientation(anchor){
        // idea here is that the orientation of this anchor wil be used as EUS
        // In updateLocalCartesian and updateLocalMatrix below, we won't use the 
        // identify orientation, we'll use this ... somehow
        _overrideGeoOrientation = true
        _overrideOrientationAnchor = anchor

        if (_overrideGeolocation) {
            updateGeoCartesian(_overrideCartesian, _overrideLocationAnchor)
        } else if (_geoOrigin) {
            updateGeoCartesian(_geoCartesian, _geoOriginAnchor)
        }
    }

    static overrideGeoLocation (cartesian, anchor) {
        // override the location API, setting the given anchor to be the 
        // cartesian origin

        if (!_overrideGeolocation && _geoOriginAnchor) {
            sendNewGeoAnchorEvent (_geoOriginAnchor, anchor)
        } else if (_overrideGeolocation) {
            sendNewGeoAnchorEvent (_overrideLocationAnchor, anchor)
        }    

        _overrideGeolocation = true
        _overrideCartesian = cartesian
        _overrideLocationAnchor = anchor
        updateGeoCartesian(_overrideCartesian, _overrideLocationAnchor)
    }

    static overrideGeoLocationOrientation(cartesian, anchor) {
        // override both
        if (!_overrideGeolocation && _geoOriginAnchor) {
            sendNewGeoAnchorEvent (_geoOriginAnchor, anchor)
        } else if (_overrideGeolocation) {
            sendNewGeoAnchorEvent (_overrideLocationAnchor, anchor)
        }    

        _overrideGeoOrientation = true
        _overrideOrientationAnchor = anchor
        _overrideGeolocation = true
        _overrideCartesian = cartesian
        _overrideLocationAnchor = anchor
        updateGeoCartesian(_overrideCartesian, _overrideLocationAnchor)
    }

    static useDeviceGeolocation() {
        // resume using the device geolocation.  Only send the "newGeoAnchor" event if there
        // is a _geoOriginAnchor;  we might have overriden "nothing"
        if (_overrideGeolocation && _geoOriginAnchor) {
            sendNewGeoAnchorEvent (_overrideLocationAnchor, _geoOriginAnchor)
        }    

        _overrideGeoOrientation = false
        _overrideOrientationAnchor = null
        _overrideGeolocation = false
        _overrideCartesian = null
        _overrideLocationAnchor = null
        if (_geoOrigin) {
            updateGeoCartesian(_geoCartesian, _geoOriginAnchor)
        }
    }

    // returns a promise because it might have to fetch data
    static async getDefaultElevation(cartographic) {
        return await getAltitude(cartographic)
    }

    // returns the elevation of the device in geospatial coordinates.  It's a Promise because
    // it will not execute until we have a geospatial alignment
    static getDeviceElevation () {
        return new Promise((resolve, reject) => {
            enqueueOrExec( () => {
                _XRsession.requestFrameOfReference('head-model').then(_headLevelFrameOfReference => {
                    _headLevelFrameOfReference.getTransformTo(_eyeLevelFrameOfReference,_scratchMat4)
                    mat4.getTranslation(_scratchVec3, _scratchMat4)
                    let deviceLocalY = _scratchVec3[1]

                    mat4.getTranslation(_scratchVec3, currentGeoOriginAnchor().modelMatrix)
                    let geoAnchorY = _scratchVec3[1]
                    let altitudeDiff = deviceLocalY - geoAnchorY

                    resolve(_geoOrigin.coords.altitude + altitudeDiff)
                })
            })
        })
    }

    // returns the full cartographic values of the device.  It's a Promise because
    // it will not execute until we have a geospatial alignment
    // Carefull, relatively expensive!
    static async getDeviceCartographic() {
        return new Promise((resolve, reject) => {
            enqueueOrExec( () => {
                _XRsession.requestFrameOfReference('head-model').then(_headLevelFrameOfReference => {
                    _headLevelFrameOfReference.getTransformTo(_eyeLevelFrameOfReference, _scratchMat4)
                    mat4.getTranslation(_scratchVec3, _scratchMat4)
                    mat4.getTranslation(_scratch2Vec3, currentGeoOriginAnchor().modelMatrix)
                    vec3.subtract(_scratchVec3, _scratchVec3, _scratch2Vec3)
                    vec3.transformMat4(_scratchVec3, _scratchVec3, _localToFixed)

                    _scratchCartesian = Cesium.Cartesian3.unpack(_scratchVec3, 0, _scratchCartesian)
                    resolve(Cesium.Cartographic.fromCartesian(_scratchCartesian))
                })
            })
        })
    }
}

if (GLOBALS["XRGeospatialAnchr"] !== undefined) {
    console.warn(`XRGeospatialAnchor already defined on global.`);
} else if (GLOBALS["XRAnchor"] !== undefined && GLOBALS["XRDevice"] !== undefined) {
    _patchXRDevice()
    window["XRGeospatialAnchor"] = XRGeospatialAnchor;
}
