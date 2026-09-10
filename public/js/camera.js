'use strict';
window.FPH = window.FPH || {};

window.FPH.camera = (() => {
  let _stream = null;
  let _videoEl = null;

  async function start(videoEl, opts={}) {
    stop();
    _videoEl = videoEl;
    const constraints = {
      video: { facingMode: opts.facing||'user', width:{ideal:640}, height:{ideal:480} },
      audio: false,
    };
    _stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = _stream;
    await new Promise((res,rej) => {
      videoEl.onloadedmetadata = res;
      videoEl.onerror = rej;
    });
    await videoEl.play();
    return _stream;
  }

  function stop() {
    if (_stream) { _stream.getTracks().forEach(t=>t.stop()); _stream=null; }
    if (_videoEl) { _videoEl.srcObject=null; _videoEl=null; }
  }

  function captureFrame(videoEl, canvasEl) {
    const v = videoEl || _videoEl;
    if (!v) return null;
    const c = canvasEl || document.createElement('canvas');
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c;
  }

  function captureBlob(videoEl, canvasEl, type='image/jpeg', quality=0.9) {
    const c = captureFrame(videoEl, canvasEl);
    if (!c) return null;
    return new Promise(res => c.toBlob(res, type, quality));
  }

  function captureDataURL(videoEl, canvasEl, type='image/jpeg', quality=0.9) {
    const c = captureFrame(videoEl, canvasEl);
    return c ? c.toDataURL(type, quality) : null;
  }

  async function listDevices() {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter(d => d.kind === 'videoinput');
  }

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function getStream() { return _stream; }

  return { start, stop, captureFrame, captureBlob, captureDataURL, listDevices, isSupported, getStream };
})();