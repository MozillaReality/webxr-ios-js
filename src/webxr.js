import WebXRPolyfill from './lib/webxr-polyfill.module.js'
import ARKitDevice from './arkit/ARKitDevice.js'

WebXRPolyfill.prototype._patchRequestDevice = function(){
    this.xr = new XR(new ARKitDevice());
    Object.defineProperty(this.global.navigator, 'xr', {
      value: this.xr,
      configurable: true,
    });
}

const xrPolyfill = new WebXRPolyfill(null, {
	webvr: false,
	cardboard: false
})
