'use strict';
window.FPH = window.FPH || {};

window.FPH.cameraUI = (() => {
  let _mode = 'enroll';
  const I = n => FPH.icons?.get(n) || '';

  function open(mode = 'enroll') {
    _mode = mode;
    const modal  = document.getElementById('biometricModal');
    const title  = document.getElementById('biometricTitle');
    const status = document.getElementById('faceDetectionStatus');
    if (!modal) return;
    if (title)  title.textContent  = mode === 'enroll' ? 'Enroll Your Face' : 'Face Recognition Login';
    if (status) { status.textContent = 'Position your face within the guide circle…'; status.className = 'camera-status detecting'; }
    modal.classList.add('active');
    _startCamera();
  }

  async function _startCamera() {
    const video  = document.getElementById('cameraVideo');
    const status = document.getElementById('faceDetectionStatus');
    if (!video) return;
    try {
      await FPH.biometric.start(_mode, video,
        (msg, cls) => {
          if (status) { status.textContent = msg; status.className = `camera-status ${cls || 'detecting'}`; }
        },
        (result) => {
          if (result.success) {
            close();
            FPH.dashboardUI.updateVerificationBadge();
            FPH.dashboard.invalidate('settings');
            if (_mode === 'auth') FPH.app._afterLogin?.() || FPH.app.showLanding?.();
          }
        }
      );
    } catch (e) {
      if (status) { status.textContent = 'Camera error: ' + e.message; status.className = 'camera-status error'; }
      FPH.toast.error('Camera error: ' + e.message);
    }
  }

  function capture() {
    const video  = document.getElementById('cameraVideo');
    const canvas = document.getElementById('captureCanvas');
    const btn    = document.getElementById('captureBtn');
    if (!video) return;
    FPH.camera.captureFrame(video, canvas);
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    const status = document.getElementById('faceDetectionStatus');
    if (status) { status.textContent = 'Processing capture…'; status.className = 'camera-status detecting'; }
    setTimeout(() => {
      if (btn) { btn.disabled = false; btn.innerHTML = `${I('camera')} Capture Photo`; }
    }, 1500);
  }

  function close() {
    FPH.biometric.stop();
    document.getElementById('biometricModal')?.classList.remove('active');
    const status = document.getElementById('faceDetectionStatus');
    if (status) { status.textContent = 'Position your face within the guide circle…'; status.className = 'camera-status detecting'; }
  }

  return { open, capture, close };
})();