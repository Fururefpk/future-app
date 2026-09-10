'use strict';
window.FPH = window.FPH || {};

window.FPH.passkey = (() => {
  function isSupported() { return !!window.PublicKeyCredential; }

  function _b64ToUint8(b64) { return Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); }
  function _uint8ToB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }

  async function login(email) {
    if (!isSupported()) throw new Error('Passkeys not supported in this browser');

    let challenge;
    try {
      const j = await FPH.api.post('/auth/passkey/challenge',{email},{auth:false});
      challenge = _b64ToUint8(j.data.challenge);
    } catch {
      challenge = crypto.getRandomValues(new Uint8Array(32));
    }

    const credential = await navigator.credentials.get({
      publicKey: { challenge, timeout:60000, userVerification:'preferred', rpId:location.hostname },
    });
    if (!credential) throw new Error('Passkey authentication cancelled');

    const data = await FPH.api.post('/auth/passkey/verify',{
      email,
      credentialId: credential.id,
      rawId: _uint8ToB64(credential.rawId),
      type:  credential.type,
      authenticatorData: _uint8ToB64(credential.response.authenticatorData),
      clientDataJSON:    _uint8ToB64(credential.response.clientDataJSON),
      signature:         _uint8ToB64(credential.response.signature),
    },{auth:false});

    FPH.storage.Session.set(data.data);
    return data;
  }

  async function register(displayName) {
    if (!isSupported()) throw new Error('Passkeys not supported in this browser');
    const j = await FPH.api.post('/auth/passkey/register',{displayName});
    const opts = j.data.options;

    const credential = await navigator.credentials.create({
      publicKey: {
        ...opts,
        challenge: _b64ToUint8(opts.challenge),
        user: { ...opts.user, id: _b64ToUint8(opts.user.id) },
        excludeCredentials: (opts.excludeCredentials||[]).map(c=>({...c,id:_b64ToUint8(c.id)})),
      },
    });

    return FPH.api.post('/auth/passkey/confirm',{
      credentialId: credential.id,
      rawId:        _uint8ToB64(credential.rawId),
      attestation:  _uint8ToB64(credential.response.attestationObject),
      clientDataJSON: _uint8ToB64(credential.response.clientDataJSON),
    });
  }

  return { isSupported, login, register };
})();