export default class XREngine {
	constructor(glCanvas, glContext){
		this._glCanvas = glCanvas
		this._glContext = glContext

		this._camera = new THREE.PerspectiveCamera(45, 1, 0.5, 10000)
		this._camera.matrixAutoUpdate = false
		this._scene = new THREE.Scene()
		this._scene.add(this._camera)
		this._renderer = new THREE.WebGLRenderer({
			canvas: this._glCanvas,
			context: this._glContext,
			antialias: false,
			alpha: false
		})
		this._renderer.autoClear = false
		this._renderer.setPixelRatio(1)
	}

	render(viewport, projectionMatrix, viewMatrix){
		this._camera.matrix.fromArray(viewMatrix)
		this._camera.updateMatrixWorld()
		this._camera.projectionMatrix.fromArray(projectionMatrix)

		this._renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
		this._renderer.clearDepth()
		this._renderer.render(this._scene, this._camera)
	}

	get scene(){ return this._scene }
	get camera() { return this._camera }
	get renderer() { return this._renderer }

	addAmbientLight(color=0xffffff, intensity=0.5){
		const light = new THREE.AmbientLight(color, intensity)
		this._scene.add(light)
		return light
	}

	addBox(position=[0,0,0], size=[0.1, 0.1, 0.1], color=0x00FF00){
		const box = new THREE.Mesh(
			new THREE.BoxBufferGeometry(...size),
			new THREE.MeshLambertMaterial({ color: color })
		)
		box.position.set(...position)
		this._scene.add(box)
		return box
	}
}