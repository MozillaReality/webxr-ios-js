# Extensions to WebXR Implemented by the WebXR Viewer

This document summarizes the extensions to WebXR provided by this implementation of WebXR and the WebXR Viewer.  It is not intended to be comprehensive developer documentation;  rather, it is here to provide a starting point for developers wishing to contribute to (or understand) this code.

Need a way to request a session has:
- World Knowledge
- Camera frame access
- Geospatial
- Illumination Estimation

frame contains
- hasLightEstimate, lightEstimate

## Anchors

Methods:
- frame.addAnchor(coordinateSystem, pose)
- session.hitTest() => promise (when hit)

Events on session:
- newAnchor
- updateAnchor
- removeAnchor

### Anchor Types

XRAnchor
- pose

XRPlaneAnchor
- pose
- geometry (center, extent, alignment, geometry)

XRFaceAnchor
- pose
- geometry (vertexCount, vertices, triangleIndices)
- blendShapes

XRImageAnchor
- pose

### Image Anchor Methods
- session.createImageAnchor(name, imageData, pixelWidth, pixelHeight, meterWidth)  => promise (when created)
    - unclear is this is how this should work now
- session.activateDetectionImage (name) => promise (when detected)


## World Knowledge
We will need to see how https://github.com/immersive-web/real-world-geometry progresses

Right now the data is all associated with Anchors (planes, faces) in the WebXR Viewer.


## Camera Access
Will want to see how https://github.com/immersive-web/computer-vision progresses.

- session.setVideoFrameHandler(worker)   
    - probably want to only use callback.  Perhaps turn requestVideoFrame into something returning a promise?
- session.startVideoFrames()
- session.requestVideoFrame()
- session.getVideoFramePose(videoFrame, camPose)
- videoFrame.release()

videoFrame is of type XRVideoFrame, and 

## Needed
- A way to know if a certain kind of Anchor (face, image, etc) is supported by the current session.
- A way to know that there are multiple cameras on the device, that if it has been switched by the user (so that we can check the capabilities again) 
