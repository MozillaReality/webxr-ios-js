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


	constructor(transform, geometry, uid=null, timeStamp=0) {
        super(transform, uid)
        
        // copy the array value into the object
        this._useGeomArrays = _useGeomArrays

        // time the mesh was last updated
        this._updateTime = timeStamp

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

    get updateTime () { return this._updateTime }

    get vertexPositions () { return this._vertexPositions }
    get vertexNormals () { return this._vertexNormals }
    get triangleIndices () { return this._triangleIndices} 
    get textureCoordinates () { return this._textureCoordinates}

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
        let currentVertexIndex = 0
        if (this._vertexPositions.length != g.vertexCount * 3 ||
            this._triangleIndices.length != g.triangleCount * 3) {
            this._vertexCountChanged = true

            this._vertexPositionsChanged = true
            this._vertexPositions = new Float32Array( g.vertexCount * 3 );

            if (this._useGeomArrays) {
                this._vertexPositions.set(g.vertices)
            } else {
                for (let vertex of g.vertices) {
                    this._vertexPositions[currentVertexIndex++] = vertex.x
                    this._vertexPositions[currentVertexIndex++] = vertex.y
                    this._vertexPositions[currentVertexIndex++] = vertex.z
                }
            }

            this._triangleIndicesChanged = true
			this._triangleIndices = arrayMax(g.triangleIndices) > 65535 ? new Uint32Array( g.triangleCount * 3) :  new Uint32Array( g.triangleCount * 3)
			this._triangleIndices.set(g.triangleIndices)

			this._textureCoordinatesChanged = true
			this._textureCoordinates = new Float32Array( g.vertexCount * 2 );
			currentVertexIndex = 0
            if (this._useGeomArrays) {
                this._textureCoordinates.set(g.textureCoordinates)
            } else {
                for (let tc of g.textureCoordinates) {
                    this._textureCoordinates[currentVertexIndex++] = tc.x
                    this._textureCoordinates[currentVertexIndex++] = tc.y
                }
			}
		} else {
            // hard case: same number of vertices.  Have any actually changed?
            this._vertexPositionsChanged = false

            if (this._useGeomArrays) {
                for (let t of g.vertices) {
                    if (this._vertexPositionsChanged) {
                        this._vertexPositions[currentVertexIndex++] = t
                    } else {
                        if (this._vertexPositions[currentVertexIndex] != t) {
                            this._vertexPositionsChanged = true
                            this._vertexPositions[currentVertexIndex++] = t
                        } else {
                            currentVertexIndex++
                        }
                    }
                }
            } else {
                for (let vertex of g.vertices) {
                    if (this._vertexPositionsChanged) {
                        this._vertexPositions[currentVertexIndex++] = vertex.x
                        this._vertexPositions[currentVertexIndex++] = vertex.y
                        this._vertexPositions[currentVertexIndex++] = vertex.z
                    } else {
                        if (Math.abs(this._vertexPositions[currentVertexIndex] - vertex.x) > glMatrix.EPSILON) {
                            this._vertexPositionsChanged = true
                            this._vertexPositions[currentVertexIndex++] = vertex.x
                        } else {
                            currentVertexIndex++
                        }
                        if (Math.abs(this._vertexPositions[currentVertexIndex] - vertex.y) > glMatrix.EPSILON) {
                            this._vertexPositionsChanged = true
                            this._vertexPositions[currentVertexIndex++] = vertex.y
                        } else {
                            currentVertexIndex++
                        }
                        if (Math.abs(this._vertexPositions[currentVertexIndex] - vertex.z) > glMatrix.EPSILON) {
                            this._vertexPositionsChanged = true
                            this._vertexPositions[currentVertexIndex++] = vertex.z
                        } else {
                            currentVertexIndex++
                        }
                    }
                }
            }
            this._triangleIndicesChanged = false
            if (g.triangleIndices) {
                currentVertexIndex = 0
                for (let t of g.triangleIndices) {
                    if (this._triangleIndicesChanged) {
                        this._triangleIndices[currentVertexIndex++] = t
                    } else {
                        if (this._triangleIndices[currentVertexIndex] != t) {
                            this._triangleIndicesChanged = true
                            this._triangleIndices[currentVertexIndex++] = t
                        } else {
                            currentVertexIndex++
                        }
                    }
                }
            }
            
            this._textureCoordinatesChanged = false
            if (g._textureCoordinates) {
                if (this._useGeomArrays) {
                    for (let t of g.textureCoordinates) {
                        if (this._textureCoordinatesChanged) {
                            this._textureCoordinates[currentVertexIndex++] = t
                        } else {
                            if (this._textureCoordinates[currentVertexIndex] != t) {
                                this._textureCoordinatesChanged = true
                                this._textureCoordinates[currentVertexIndex++] = t
                            } else {
                                currentVertexIndex++
                            }
                        }
                    }
                } else {
                    for (let vertex of g.textureCoordinates) {
                        if (this._textureCoordinatesChanged) {
                            this._textureCoordinates[currentVertexIndex++] = vertex.x
                            this._textureCoordinates[currentVertexIndex++] = vertex.y
                        } else {
                            if (Math.abs(this._textureCoordinates[currentVertexIndex] - vertex.x) > glMatrix.EPSILON) {
                                this._textureCoordinatesChanged = true
                                this._textureCoordinates[currentVertexIndex++] = vertex.x
                            } else {
                                currentVertexIndex++
                            }
                            if (Math.abs(this._textureCoordinates[currentVertexIndex] - vertex.y) > glMatrix.EPSILON) {
                                this._textureCoordinatesChanged = true
                                this._textureCoordinates[currentVertexIndex++] = vertex.y
                            } else {
                                currentVertexIndex++
                            }
                        }
                    }
                }
            }
        }
    }
}


function arrayMax( array ) {
	if ( array.length === 0 ) return - Infinity;
	var max = array[ 0 ];
	for ( var i = 1, l = array.length; i < l; ++ i ) {
		if ( array[ i ] > max ) max = array[ i ];
	}
	return max;
}

function arrayEquals(a, b) {
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

function arrayFuzzyEquals(a, b) {
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
