'use strict';
window.FPH = window.FPH || {};

/**
 * properties.js
 * Property listing CRUD, with a localStorage-backed demo mode
 * fallback so the UI works fully even when the backend is
 * unreachable (matches the pattern used in auth.js / storage.js).
 */
window.FPH.properties = (() => {
  const { api, storage: { Cache, Session } } = FPH;

  const DEMO_KEY = 'fph_demo_properties';

  /* ── Demo-mode local property store ─────────────────────── */
  const DemoStore = {
    _load() {
      try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); }
      catch { return []; }
    },
    _save(list) { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); },

    getAll(filters = {}) {
      let list = this._load();
      if (filters.city)         list = list.filter(p => p.city === filters.city);
      if (filters.propertyType) list = list.filter(p => p.propertyType === filters.propertyType);
      if (filters.maxPrice)     list = list.filter(p => Number(p.price) <= Number(filters.maxPrice));
      if (filters.minRooms)     list = list.filter(p => Number(p.rooms) >= Number(filters.minRooms));
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(p => (p.name||'').toLowerCase().includes(q) || (p.address||'').toLowerCase().includes(q));
      }
      return list;
    },

    getByOwner(userId) {
      return this._load().filter(p => p.landlord === userId || p.landlord?._id === userId);
    },

    getById(id) {
      return this._load().find(p => p._id === id) || null;
    },

    create(payload, user) {
      const list = this._load();
      const now  = new Date().toISOString();
      const prop = {
        _id: 'demo_prop_' + Date.now(),
        ...payload,
        price:      Number(payload.price),
        rooms:      Number(payload.rooms) || 1,
        bathrooms:  Number(payload.bathrooms) || 1,
        images:     [],
        // Demo mode has no live admin to review submissions, so listings
        // are auto-approved to keep the standalone demo experience usable.
        // (Real backend still requires genuine admin approval.)
        status:     'approved',
        landlord:   { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName, email: user?.email },
        createdAt:  now,
        updatedAt:  now,
      };
      list.unshift(prop);
      this._save(list);
      return prop;
    },

    update(id, payload) {
      const list = this._load();
      const idx  = list.findIndex(p => p._id === id);
      if (idx === -1) throw Object.assign(new Error('Property not found'), { status: 404 });
      list[idx] = {
        ...list[idx],
        ...payload,
        price:     payload.price     !== undefined ? Number(payload.price)     : list[idx].price,
        rooms:     payload.rooms     !== undefined ? Number(payload.rooms)     : list[idx].rooms,
        bathrooms: payload.bathrooms !== undefined ? Number(payload.bathrooms) : list[idx].bathrooms,
        images:    payload.images    !== undefined ? payload.images           : list[idx].images,
        updatedAt: new Date().toISOString(),
      };
      this._save(list);
      return list[idx];
    },

    remove(id) {
      const list = this._load().filter(p => p._id !== id);
      this._save(list);
    },
  };

  /* ── Public API ─────────────────────────────────────────── */

  async function getAll(params = {}) {
    try {
      return await api.get('/properties', { params, auth: false });
    } catch (e) {
      if (e.offline || e.status === 0) {
        const list = DemoStore.getAll(params);
        return { success: true, _demo: true, data: { properties: list, total: list.length } };
      }
      throw e;
    }
  }

  async function getFeatured() {
    const hit = Cache.get('properties:featured');
    if (hit) return hit;
    try {
      const d = await api.get('/properties/featured', { auth: false });
      Cache.set('properties:featured', d);
      return d;
    } catch (e) {
      if (e.offline || e.status === 0) {
        const list = DemoStore.getAll().slice(0, 6);
        return { success: true, _demo: true, data: { properties: list } };
      }
      throw e;
    }
  }

  async function getCities() {
    const hit = Cache.get('properties:cities');
    if (hit) return hit;
    try {
      const d = await api.get('/properties/cities', { auth: false });
      Cache.set('properties:cities', d);
      return d;
    } catch (e) {
      if (e.offline || e.status === 0) return { success: true, _demo: true, data: { cities: CITIES } };
      throw e;
    }
  }

  async function getById(id) {
    const hit = Cache.get(`property:${id}`);
    if (hit) return hit;
    try {
      const d = await api.get(`/properties/${id}`, { auth: false });
      Cache.set(`property:${id}`, d);
      return d;
    } catch (e) {
      if (e.offline || e.status === 0) {
        const prop = DemoStore.getById(id);
        if (!prop) throw Object.assign(new Error('Property not found'), { status: 404 });
        return { success: true, _demo: true, data: { property: prop } };
      }
      throw e;
    }
  }

  async function getMyListings() {
    const me = FPH.auth.getUser()?._id;
    if (!me) throw new Error('Not authenticated');
    try {
      return await api.get(`/properties/user/${me}`);
    } catch (e) {
      if (e.offline || e.status === 0) {
        const list = DemoStore.getByOwner(me);
        return { success: true, _demo: true, data: { properties: list, total: list.length } };
      }
      throw e;
    }
  }

  // Converts a File to a data URL, used only for demo-mode image previews.
  function _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function create(payload, images = []) {
    Cache.del('properties:featured');
    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      return await api.upload('POST', '/properties', fd);
    } catch (e) {
      if (e.offline || e.status === 0) {
        const user = FPH.auth.getUser();
        const prop = DemoStore.create(payload, user);
        // Preview the first selected image locally (demo mode only —
        // never sent anywhere, purely for the property card UI).
        if (images[0]) {
          try {
            const dataUrl = await _fileToDataURL(images[0]);
            prop.images = [{ url: dataUrl, publicId: null }];
            DemoStore.update(prop._id, { images: prop.images });
          } catch { /* preview is best-effort — ignore failures */ }
        }
        return { success: true, _demo: true, data: { property: prop } };
      }
      throw e;
    }
  }

  async function update(id, payload, images = []) {
    Cache.del(`property:${id}`);
    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      return await api.upload('PUT', `/properties/${id}`, fd);
    } catch (e) {
      if (e.offline || e.status === 0) {
        let prop = DemoStore.update(id, payload);
        // If new images were selected, preview the first one (demo only).
        if (images[0]) {
          try {
            const dataUrl = await _fileToDataURL(images[0]);
            prop = DemoStore.update(id, { images: [{ url: dataUrl, publicId: null }] });
          } catch { /* preview is best-effort — ignore failures */ }
        }
        return { success: true, _demo: true, data: { property: prop } };
      }
      throw e;
    }
  }

  async function remove(id) {
    Cache.del(`property:${id}`);
    try {
      return await api.del(`/properties/${id}`);
    } catch (e) {
      if (e.offline || e.status === 0) {
        DemoStore.remove(id);
        return { success: true, _demo: true };
      }
      throw e;
    }
  }

  async function removeImage(id, publicId) {
    Cache.del(`property:${id}`);
    return api.patch(`/properties/${id}/images`, { publicId });
  }

  async function getStats(id) {
    try {
      return await api.get(`/properties/${id}/stats`);
    } catch (e) {
      if (e.offline || e.status === 0) return { success: true, _demo: true, data: { views: 0, inquiries: 0, tenancies: 0 } };
      throw e;
    }
  }

  const TYPES  = ['apartment', 'house', 'studio', 'office', 'commercial'];
  const CITIES = ['Accra', 'Kumasi', 'Takoradi', 'Cape Coast', 'Tamale', 'Tema', 'Ashaiman', 'Sunyani'];

  return { getAll, getFeatured, getCities, getById, getMyListings, create, update, remove, removeImage, getStats, TYPES, CITIES };
})();
