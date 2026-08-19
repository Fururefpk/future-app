'use strict';
window.FPH = window.FPH || {};

window.FPH.biometric = (() => {
  let _mode = 'enroll'; // 'enroll' | 'auth'
  let _onDone = null;
  let _videoEl = null;

  async function _onFaceDetected(detection) {
    try {
      const descriptor = Array.from(detection.descriptor);
      if (_mode === 'enroll') {
        await FPH.verification.enrollFace(descriptor);
        FPH.toast.success('✓ Face enrolled successfully!');
        _onDone?.({success:true, mode:'enroll'});
      } else {
        const email = document.getElementById('loginEmail')?.value?.trim();
        if (!email) { FPH.toast.error('Enter your email first'); return; }
        const data = await FPH.faceAuth.loginWithFace(email, _videoEl);
        if (data.success) {
          FPH.storage.Session.set(data.data);
          FPH.toast.success('✓ Signed in with face!');
          _onDone?.({success:true, mode:'auth', data:data.data});
        }
      }
    } catch(e) {
      FPH.toast.error(e.message);
      _onDone?.({success:false, error:e.message, mode:_mode});
    }
  }

  async function start(mode='enroll', videoEl, onStatus, onDone) {
    _mode   = mode;
    _onDone = onDone;
    _videoEl = videoEl;

    const loaded = await FPH.faceAuth.loadModels();
    if (!loaded) {
      onStatus?.('⚠ Face AI not loaded — using simulated detection', 'detecting');
    }

    try {
      await FPH.camera.start(videoEl);
      onStatus?.('👤 Align your face with the camera', 'detecting');
      FPH.faceAuth.startDetectionLoop(videoEl, _onFaceDetected, onStatus);
    } catch(e) {
      FPH.toast.error('Camera error: ' + e.message);
      onDone?.({success:false, error:e.message});
    }
  }

  function stop() {
    FPH.faceAuth.stopDetectionLoop();
    FPH.camera.stop();
  }

  function isSupported() {
    return FPH.camera.isSupported();
  }

  return { start, stop, isSupported };
})();