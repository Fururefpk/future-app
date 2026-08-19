'use strict';
window.FPH = window.FPH || {};

window.FPH.faceAuth = (() => {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/';
  let _modelsLoaded = false;
  let _detectionLoop = null;

  async function loadModels() {
    if (_modelsLoaded || !window.faceapi) return _modelsLoaded;
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      _modelsLoaded = true;
    } catch(e) { console.warn('face-api.js models unavailable:', e.message); }
    return _modelsLoaded;
  }

  async function detectFace(videoEl) {
    if (!window.faceapi || !_modelsLoaded) return null;
    return faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  function startDetectionLoop(videoEl, onDetected, onStatus, intervalMs=600) {
    stopDetectionLoop();
    let hits = 0;
    _detectionLoop = setInterval(async () => {
      if (!FPH.camera.getStream()) { stopDetectionLoop(); return; }
      const det = await detectFace(videoEl).catch(()=>null);
      if (det) {
        hits++;
        onStatus?.(`✓ Face detected (${hits}/4)`, 'detected');
        if (hits >= 4) { stopDetectionLoop(); onDetected(det); }
      } else {
        hits = 0;
        onStatus?.('👤 Align your face with the camera', 'detecting');
      }
    }, intervalMs);
  }

  function stopDetectionLoop() {
    if (_detectionLoop) { clearInterval(_detectionLoop); _detectionLoop=null; }
  }

  async function getDescriptor(videoEl) {
    const det = await detectFace(videoEl);
    return det ? Array.from(det.descriptor) : null;
  }

  function euclideanDist(a, b) {
    return Math.sqrt(a.reduce((s,v,i) => s + (v-b[i])**2, 0));
  }

  function matchDescriptors(stored, live, threshold=0.55) {
    if (!stored || !live) return false;
    return euclideanDist(stored, live) < threshold;
  }

  async function loginWithFace(email, videoEl) {
    const descriptor = await getDescriptor(videoEl);
    if (!descriptor) throw new Error('No face detected — please position your face clearly');
    return FPH.api.post('/auth/biometric-login', {userEmail:email, faceDescriptor:descriptor}, {auth:false});
  }

  return { loadModels, detectFace, startDetectionLoop, stopDetectionLoop, getDescriptor, matchDescriptors, loginWithFace, get modelsLoaded(){return _modelsLoaded;} };
})();