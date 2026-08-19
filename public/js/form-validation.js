'use strict';
window.FPH = window.FPH || {};

window.FPH.validation = (() => {
  // ── Field rules ────────────────────────────────────────────
  const rules = {
    required:    v => !!String(v||'').trim()     || 'This field is required',
    email:       v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
    minLength:  (n,v) => String(v||'').length>=n || `Minimum ${n} characters required`,
    maxLength:  (n,v) => String(v||'').length<=n || `Maximum ${n} characters allowed`,
    phone:       v => /^(\+233|0)[2-9]\d{8}$/.test(v.replace(/\s/g,'')) || 'Enter a valid Ghana phone number',
    ghanaCard:   v => /^GHA-[0-9]{9}-[0-9]$/.test(v.trim())             || 'Format: GHA-XXXXXXXXX-X',
    password:    v => String(v||'').length>=8    || 'Password must be at least 8 characters',
    match:    (other,v,form) => v===form[other]?.value || 'Passwords do not match',
    number:      v => !isNaN(Number(v))          || 'Must be a number',
    positive:    v => Number(v)>0                || 'Must be a positive number',
    url:         v => { try{new URL(v);return true;}catch{return 'Enter a valid URL';} },
    noScript:    v => !/<script/i.test(v)        || 'Invalid characters',
  };

  // ── Validate a single field ────────────────────────────────
  function validateField(name, value, fieldRules=[], form={}) {
    for (const rule of fieldRules) {
      const [fn, ...args] = Array.isArray(rule) ? rule : [rule];
      const checker = typeof fn==='string' ? rules[fn] : fn;
      if (!checker) continue;
      const result = args.length ? checker(...args, value, form) : checker(value, form);
      if (result !== true) return result; // returns error string
    }
    return null; // valid
  }

  // ── Validate entire form schema ────────────────────────────
  // schema: { fieldName: [rule1, [rule2, arg], ...] }
  function validate(data, schema) {
    const errors = {};
    let valid = true;
    for (const [field, fieldRules] of Object.entries(schema)) {
      const err = validateField(field, data[field], fieldRules, data);
      if (err) { errors[field]=err; valid=false; }
    }
    return { valid, errors };
  }

  // ── Live validation: attach to form inputs ─────────────────
  function attachLive(formEl, schema, onError) {
    if (!formEl) return;
    formEl.querySelectorAll('[name]').forEach(input => {
      const field = input.name;
      if (!schema[field]) return;
      const check = () => {
        const data = Object.fromEntries(new FormData(formEl));
        const err  = validateField(field, data[field], schema[field], data);
        onError?.(field, err);
      };
      input.addEventListener('blur', check);
      input.addEventListener('input', FPH.utils.debounce(check, 400));
    });
  }

  // ── Predefined schemas ─────────────────────────────────────
  const schemas = {
    register: {
      role:      [['required']],
      firstName: [['required'],['minLength',2]],
      lastName:  [['required'],['minLength',2]],
      email:     [['required'],['email']],
      phone:     [['required'],['phone']],
      password:  [['required'],['password']],
    },
    login: {
      email:    [['required'],['email']],
      password: [['required']],
    },
    ghanaCard: {
      ghanaCardNumber: [['required'],['ghanaCard']],
      ghanaCardName:   [['required'],['minLength',3]],
    },
    property: {
      name:         [['required'],['minLength',3]],
      address:      [['required']],
      city:         [['required']],
      price:        [['required'],['number'],['positive']],
      propertyType: [['required']],
    },
    inquiry: {
      subject: [['required'],['minLength',5]],
      message: [['required'],['minLength',10]],
    },
  };

  return { rules, validateField, validate, attachLive, schemas };
})();