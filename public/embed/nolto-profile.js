/* Nolto profile import v1. No data is read until the person shares it. */
(() => {
  'use strict';
  const origin = new URL(document.currentScript.src).origin;
  const allowed = new Set(['name', 'headline', 'location', 'bio', 'profileUrl', 'handle', 'email', 'phone', 'website', 'experience', 'education', 'skills']);
  function requestProfile(options = {}) {
    const fields = (options.fields || ['name', 'headline', 'profileUrl']).filter(field => allowed.has(field));
    if (!fields.length || !window.crypto?.getRandomValues) return Promise.reject(new Error('Nolto: supported fields and a secure browser are required.'));
    const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('');
    const url = new URL('/share-profile', origin);
    url.search = new URLSearchParams({ origin: window.location.origin, request: requestId, fields: fields.join(',') }).toString();
    const popup = window.open(url.href, `nolto-${requestId}`, 'popup,width=540,height=760');
    if (!popup) return Promise.reject(new Error('Tillåt popupfönster för att hämta från Nolto.'));
    return new Promise((resolve, reject) => {
      let timer, closed;
      const cleanup = () => { clearTimeout(timer); clearInterval(closed); window.removeEventListener('message', receive); };
      const receive = event => {
        if (event.origin !== origin || event.source !== popup || !event.data || event.data.type !== 'nolto:profile' || event.data.request !== requestId) return;
        cleanup();
        if (event.data.cancelled) { reject(new Error('Delningen avbröts.')); return; }
        const profile = {};
        for (const field of fields) {
          const value = event.data.profile?.[field];
          if (typeof value === 'string' || Array.isArray(value)) profile[field] = value;
        }
        resolve(profile);
      };
      window.addEventListener('message', receive);
      timer = setTimeout(() => { cleanup(); reject(new Error('Delningen tog för lång tid. Försök igen.')); }, 15 * 60 * 1000);
      closed = setInterval(() => { if (popup.closed) { cleanup(); reject(new Error('Delningen avbröts.')); } }, 500);
    });
  }
  function bind() {
    for (const button of document.querySelectorAll('[data-nolto-import]')) {
      if (button.dataset.noltoBound) continue;
      button.dataset.noltoBound = 'true';
      button.addEventListener('click', async event => {
        event.preventDefault();
        const form = button.closest('form') || document;
        const status = document.createElement('span');
        status.setAttribute('role', 'status'); button.insertAdjacentElement('afterend', status);
        button.disabled = true;
        try {
          const fields = (button.dataset.noltoFields || 'name,headline,profileUrl').split(',').map(field => field.trim());
          const profile = await requestProfile({ fields });
          for (const input of form.querySelectorAll('[data-nolto-field]')) {
            const value = profile[input.dataset.noltoField];
            if (typeof value !== 'string' || !(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) continue;
            const prototype = input instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
            Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          status.textContent = 'Uppgifterna är hämtade. Kontrollera dem innan du skickar formuläret.';
          button.dispatchEvent(new CustomEvent('nolto:profile', { bubbles: true, detail: profile }));
        } catch (error) { status.textContent = error.message || 'Kunde inte hämta profilen.'; }
        finally { button.disabled = false; }
      });
    }
  }
  window.Nolto = Object.freeze({ requestProfile, bind });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();
