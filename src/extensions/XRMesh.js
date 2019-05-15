/**
 * Copyright (c) 2019 Mozilla Inc. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. 
 */
import XRAnchor from './XRAnchor.js'
import * as glMatrix from "gl-matrix/src/gl-matrix/common";

/**
* XRMesh represents anchored world geometry, including surfaces like floors, table tops, 
* walls, faces, or scan data from depth sensor reconstruction.
*/
var _useGeomArrays = false

export default class XRMesh extends XRAnchor {    
    // this will be called from ARKitWrapper if it's set up to use arrays instead of 
    // dictionaries for the data
    static setUseGeomArrays() { _useGeomArrays = true }
    static useGeomArrays() {return _useGeomArrays}

	constructor(transform, geometry, uid=null, timestamp=0) {
        super(transform, uid, timestamp)
        
        // copy the array value into the object
        this._useGeomArrays = _useGeomArrays

        /* General mesh geometry comes in with:

        vertexCount
		vertices:  array [vertexCount] of [x,y,z] elements

		textureCoordinateCount  (should be same as vertexCount)
		textureCoordinates: array [textCoordinates] of [x,y] elements

        triangleCount
		triangleIndices:  array[triangleCount * 3] where each 3 are indcies into
			textureCoordinates and vertexPositions of the 3 points of a triangle
        */
        this._vertexCountChanged = true
        this._vertexPositionsChanged = true
        this._triangleIndicesChanged = true
		this._textureCoordinatesChanged = true 
        this._vertexPositions = []    // new Float32Array( vertexCount * 3 );
        this._triangleIndices = []   // new Float32Array( triangleCount * 3 );
		this._textureCoordinates = []

        this._vertexNormalsChanged = true
        this._vertexNormals = []      // new Float32Array( vertexCount * 3 );
        
        // subclass may update geometry from constructor, so only call if if they pass
        // geomtry up here
        if (geometry) {
            this._geometry = geometry
            this._updateGeometry(this._geometry)
        }
    }
    
    isMesh() { return true }

    get changed () { 
        return super.changed || 
            this._vertexPositionsChanged ||
            this._vertexNormalsChanged ||
            this._triangleIndicesChanged ||
            this._vertexCountChanged
        }
	clearChanged() {
		super.clearChanged()
        this._vertexPositionsChanged = false
        this._vertexNormalsChanged = false
        this._triangleIndicesChanged = false
        this._vertexCountChanged = false
	}	
   
    get vertexCountChanged () { return this._vertexCountChanged }
    get vertexPositionsChanged() { return this._vertexPositionsChanged }
    get triangleIndicesChanged () { this._triangleIndicesChanged }
    get textureCoordinatesChanged () { this._textureCoordinatesChanged }
    get vertexNormalsChanged () { this._vertexNormalsChanged }

    get vertexPositions () { return this._vertexPositions }
    get vertexNormals () { return this._vertexNormals }
    get triangleIndices () { return this._triangleIndices}
    get textureCoordinates () { return this._textureCoordinates}

    get vertexCount () { return this._vertexPositions.length }
    get triangleCount () { return this._triangleIndices.length } 

    // textureCoordinates and Normals are optional
    get hasNormals () { return this._vertexNormals.length > 0 }
    get hasTextureCoordinates () { return this._textureCoordinates.length > 0}

    _updateGeometry(geometry) {
        this._geometry = geometry
        let g = geometry
        
        // I _think_ a plane anchor could have no geometry, when it has not
        // yet found a boundary (i.e., it's just a plane w/ no area)
        if (g.vertexCount == 0) {
            if (this._vertexPositions.length > 0) {
                this._vertexPositionsChanged = true
                this._vertexNormalsChanged = true
                this._triangleIndicesChanged = true
                this._textureCoordinatesChanged = true 
        
                this._vertexPositions = []    // new Float32Array( vertexCount * 3 );
                this._vertexNormals = []      // new Float32Array( vertexCount * 3 );
        
                this.triangleIndices = []   // new Float32Array( triangleCount * 3 );
                this._textureCoordinates = []
            }
            return    
        }

        // note: after initially created, only some of the properties of geometry
        // may be passed in to update.  We should just not change ones that have
        // actually been passed in

        // if there are a different number of vertices, or triangles, things have
        // definitly changed

        if (typeof g.vertexCount === 'undefined') {
            console.warn("bad geometry data passed to XRMesh._updateGeometry: no vertex count", g)
            return
        }

        let currentVertexIndex = 0
            
        if (this._vertexPositions.length != g.vertexCount * 3) {
            if (typeof g.vertices === 'undefined') {
                console.warn("bad geometry data passed to XRMesh._updateGeometry: no vertices", g)
                return
            }
            this._vertexCountChanged = true
            this._vertexPositionsChanged = true
            this._vertexPositions = new Float32Array( g.vertexCount * 3 );

            if (g.textureCoordinates) {
                this._textureCoordinatesChanged = true
                this._textureCoordinates = new Float32Array( g.vertexCount * 2 );
            }    
        } else {
            if (this._useGeomArrays) {
                this._vertexPositionsChanged = (typeof g.vertices != 'undefined') && !XRMesh.arrayFuzzyEquals(this._vertexPositions, g.vertices)
                this._textureCoordinatesChanged = (typeof g.textureCoordinates != 'undefined') && !XRMesh.arrayFuzzyEquals(this._textureCoordinates, g.textureCoordinates)
            } else {
                this._vertexPositionsChanged = false
                if (g.vertices) {
                    currentVertexIndex = 0
                    for ( var i = 0, l = g.vertexCount; i < l; i++ ) {
                        if (Math.abs(this._vertexPositions[currentVertexIndex++] - g.vertices[i].x) > glMatrix.EPSILON ||
                            Math.abs(this._vertexPositions[currentVertexIndex++] - g.vertices[i].y) > glMatrix.EPSILON ||
                            Math.abs(this._vertexPositions[currentVertexIndex++] - g.vertices[i].z) > glMatrix.EPSILON) 
                        {
                            this._vertexPositionsChanged = true
                            break;
                        }
                    }
                }
                this._textureCoordinatesChanged = false
                if (g.textureCoordinates) {
                    currentVertexIndex = 0
                    for ( var i = 0, l = g.vertexCount; i < l; i++ ) {
                        if (Math.abs(this._textureCoordinates[currentVertexIndex++] - g.textureCoordinates[i].x) > glMatrix.EPSILON ||
                            Math.abs(this._textureCoordinates[currentVertexIndex++] - g.textureCoordinates[i].x) > glMatrix.EPSILON) 
                        {
                            this._textureCoordinatesChanged = true
                            break;
                        }
                    }
                }
            }
        }

        if (g.triangleCount) {
            if(this._triangleIndices.length != g.triangleCount * 3) {
                this._triangleIndicesChanged = true
                this._triangleIndices = XRMesh.arrayMax(g.triangleIndices) > 65535 ? new Uint32Array( g.triangleCount * 3) :  new Uint32Array( g.triangleCount * 3)
            } else {
                this._triangleIndicesChanged = g.triangleIndicies && !XRMesh.arrayEquals(this._triangleIndices, g.triangleIndices)
            }
        } else {
            this._triangleIndicesChanged = false
        }

        if (this._vertexPositionsChanged) {
            if (this._useGeomArrays) {
                this._vertexPositions.set(g.vertices)
            } else {
                currentVertexIndex = 0
                for (let vertex of g.vertices) {
                    this._vertexPositions[currentVertexIndex++] = vertex.x
                    this._vertexPositions[currentVertexIndex++] = vertex.y
                    this._vertexPositions[currentVertexIndex++] = vertex.z
                }
            }
        }
        if (this._textureCoordinatesChanged) {
			currentVertexIndex = 0
            if (this._useGeomArrays) {
                this._textureCoordinates.set(g.textureCoordinates)
            } else {
                for (let tc of g.textureCoordinates) {
                    this._textureCoordinates[currentVertexIndex++] = tc.x
                    this._textureCoordinates[currentVertexIndex++] = tc.y
                }
			}
        }
        if (this._triangleIndicesChanged) {
            this._triangleIndices.set(g.triangleIndices)            
        }
    }

    static arrayMax( array ) {
        if ( array.length === 0 ) return - Infinity;
        var max = array[ 0 ];
        for ( var i = 1, l = array.length; i < l; ++ i ) {
            if ( array[ i ] > max ) max = array[ i ];
        }
        return max;
    }

    static arrayEquals(a, b) {
        // if the other array is a falsy value, return
        if (!a || !b)
            return false;

        // compare lengths - can save a lot of time 
        if (a.length != b.length)
            return false;

        for (var i = 0, l=a.length; i < l; i++) {
            if (a[i] != b[i]) { 
                return false;   
            }           
        }       
        return true;
    }

    static arrayFuzzyEquals(a, b) {
        // if the other array is a falsy value, return
        if (!a || !b)
            return false;

        // compare lengths - can save a lot of time 
        if (a.length != b.length)
            return false;

        for (var i = 0, l=a.length; i < l; i++) {
            if (Math.abs(a[i] - b[i]) > glMatrix.EPSILON) {
                return false;   
            }           
        }       
        return true;
    }
}