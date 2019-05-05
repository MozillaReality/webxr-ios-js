import * as mat4 from 'gl-matrix/src/gl-matrix/mat4'
import * as mat3 from 'gl-matrix/src/gl-matrix/mat3'
import * as vec3 from 'gl-matrix/src/gl-matrix/vec3'
import MapzenTerrariumTerrainProvider from '../lib/MapzenTerrariumTerrainProvider.js'
import XRAnchor from './XRAnchor.js'
import XRDevice from 'webxr-polyfill/src/api/XRDevice'


/* ** path the XRSession
*/ 
if (window.hasOwnProperty("Cesium")) {
    var __XRDevice_requestSession = XRDevice.prototype.requestSession
    XRDevice.prototype.requestSession = async function (options) {
        let bindrequest = __XRDevice_requestSession.bind(this)
        let session = await bindrequest(options)

        if (options.alignEUS && options.geolocation) {
            const onSessionEnd = () => {
                _XRsession = null
                if (_watchID) {
                    navigator.geolocation.clearWatch(_watchID);
                    _watchID = 0
                }
                resetState()
                session.removeEventListener('end', onSessionEnd);        
            }
            
            session.addEventListener('end', onSessionEnd);
            await useSession(session)
        }
        return session
    }

    async function useSession(session) { 
        _XRsession = session
        try {
            _headLevelFrameOfReference = await session.requestFrameOfReference('head-model')
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
if (window.hasOwnProperty("Cesium")) {
    _scratchCartesian = new Cesium.Cartesian3()
}

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
if (window.hasOwnProperty("Cesium")) {
    _eastUpSouthToFixedFrame = Cesium.Transforms.localFrameToFixedFrameGenerator('east','up');
}
var _fixedToLocal = mat4.create()
var _localToFixed = mat4.create()

// need these for various computations
var _headLevelFrameOfReference = null
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
    await updateHeightFromTerrain(cart)
    return cart.height

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
if (window.hasOwnProperty("Cesium")) {
    defaultTerrainProvider = new MapzenTerrariumTerrainProvider({
        url : 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/',
        requestWaterMask : true,
        requestVertexNormals : true
    })
}

function updateHeightFromTerrain(cartographic) {
    return Promise.resolve(Cesium.sampleTerrain(defaultTerrainProvider, 15, [cartographic]).then(results => {
        return results[0]
    }))
}

/*** 
 * ensure our cartesian's have altitude
 */
async function cartesianToFixed(longitude, latitude, altitude=null) {
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

var _updatingOrigin = false
async function updatePositionCallback (position)
{
    if (!_updatingOrigin && 
        (!_geoOrigin || 
            _geoOrigin.coords.accuracy > position.coords.accuracy || 
            (_geoOrigin.coords.accuracy == position.coords.accuracy && 
                _geoOrigin.coords.altitudeAccuracy > position.coords.altitudeAccuracy))) {
        // better geolocation!  create new anchor, re-do the alignment, notify all anchors of the change
        _updatingOrigin = true

        try {
            // get a new Anchor right where the device is right now
            let newAnchor = await _XRsession.addAnchor(_identity, _headLevelFrameOfReference)
            newAnchor._isInternalGeoAnchor = true
            if (!_overrideGeolocation && _geoOriginAnchor) {
                sendNewGeoAnchorEvent (_geoOriginAnchor, newAnchor)
                await _XRsession.removeAnchor(_geoOriginAnchor)
            }
            _geoOriginAnchor = newAnchor
            _geoOrigin = position
            // call this, because return from geolocation API may have null altitude
            _geoCartesian = await cartesianToFixed(position.coords.longitude, position.coords.latitude, position.coords.altitude)

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

    get cartesian() { return this._cartesian}
    get cartographic() { return this._cartographic}

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
            vec3.transformMat3(_this._localCartesian, this._localCartesian, _scratchMat3)
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

    // we can override the geo location, orientation, or both
    static overrideGeoOrientation(anchor){
        // idea here is that the orientation of this anchor wil be used as EUS
        // In updateLocalCartesian and updateLocalMatrix below, we won't use the 
        // identify orientation, we'll use this ... somehow
        _overrideGeoOrientation = true
        _overrideOrientationAnchor = anchor
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
                const transform = _headLevelFrameOfReference.getTransformTo(_eyeLevelFrameOfReference)
                mat4.getTranslation(_scratchVec3, transform)
                let deviceLocalY = _scratchVec3[1]

                mat4.getTranslation(_scratchVec3, currentGeoOriginAnchor().modelMatrix)
                let geoAnchorY = _scratchVec3[1]
                let altitudeDiff = deviceLocalY - geoAnchorY

                resolve(_geoOrigin.coords.altitude + altitudeDiff)
            })
        })
    }

    // returns the full cartographic values of the device.  It's a Promise because
    // it will not execute until we have a geospatial alignment
    // Carefull, relatively expensive!
    static async getDeviceCartographic() {
        return new Promise((resolve, reject) => {
            enqueueOrExec( () => {
                const transform = _headLevelFrameOfReference.getTransformTo(_eyeLevelFrameOfReference)
                mat4.getTranslation(_scratchVec3, transform)
                mat4.getTranslation(_scratch2Vec3, currentGeoOriginAnchor().modelMatrix)
                vec3.subtract(_scratchVec3, _scratchVec3, _scratch2Vec3)
                vec3.transformMat4(_scratchVec3, _scratchVec3, _localToFixed)

                let cartesian = Cesium.Cartesian3.unpack(_scratchVec3, 0, _scratchCartesian)
                resolve(Cesium.Cartographic.fromCartesian(cartesian))
            })
        })
    }
}
