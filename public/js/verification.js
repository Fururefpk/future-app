'use strict';
window.FPH = window.FPH || {};

window.FPH.verification = (() => {
  const { api, storage:{Session,Cache} } = FPH;

  async function getStatus() {
    if (Session.isDemo) {
      const v = Session.user?.verification||{};
      return {success:true,data:{ghanaCardStatus:v.ghanaCardVerified?'verified':'not_submitted',faceStatus:v.faceVerified?'enrolled':'not_enrolled',overallStatus:v.status||'unverified'}};
    }
    const cached = Cache.get('verification:status');
    if (cached) return cached;
    const data = await api.get('/biometric/status');
    Cache.set('verification:status', data);
    return data;
  }

  async function submitGhanaCard({number, name, imageFile}) {
    const {valid,errors} = FPH.validation.validate({ghanaCardNumber:number,ghanaCardName:name}, FPH.validation.schemas.ghanaCard);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]),{errors});

    Cache.del('verification:status');
    if (Session.isDemo) {
      const user = Session.user;
      user.verification = {...(user.verification||{}), ghanaCardVerified:true, status:user.verification?.faceVerified?'verified':'pending'};
      Session.patch({user});
      return {success:true,_demo:true,data:{message:'Ghana Card submitted (demo mode)',status:'pending'}};
    }
    const fd = new FormData();
    fd.append('ghanaCardNumber', number);
    fd.append('ghanaCardName',   name);
    if (imageFile) fd.append('cardImage', imageFile);
    return api.upload('POST','/biometric/verify-ghana-card', fd);
  }

  async function enrollFace(descriptor, quality=90) {
    Cache.del('verification:status');
    if (Session.isDemo) {
      const user = Session.user;
      user.verification = {...(user.verification||{}), faceVerified:true, status:user.verification?.ghanaCardVerified?'verified':'pending'};
      Session.patch({user});
      return {success:true,_demo:true,data:{message:'Face enrolled (demo mode)'}};
    }
    return api.post('/biometric/enroll-face', {faceDescriptor:descriptor, imageQuality:quality});
  }

  async function deleteFace() {
    Cache.del('verification:status');
    return api.del('/biometric/face');
  }

  async function getHistory() {
    return api.get('/biometric/history');
  }

  function isFullyVerified() {
    const v = Session.user?.verification;
    return v?.status === 'verified';
  }

  return { getStatus, submitGhanaCard, enrollFace, deleteFace, getHistory, isFullyVerified };
})();