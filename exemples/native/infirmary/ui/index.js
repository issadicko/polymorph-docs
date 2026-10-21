/**
 * User interface of the Infirmary extension: custom elements, with no build step and no library.
 * Polymorph calls activate(polymorph) once, then sets two properties on each element:
 * - context: the slot's context ({ apprenant } on the learner record), or { params, query } for a screen;
 * - polymorph: the SDK (api, t, can, notify, confirm, date, navigate…).
 * The elements render in the page DOM: they take the product's font, colours and pm-* classes.
 */

const OUTCOMES = {
  BACK_TO_CLASS: { label: 'Retour en classe', tone: 'pm-success' },
  SENT_HOME: { label: 'Rentré à la maison', tone: 'pm-warning' },
  DOCTOR: { label: 'Orienté vers un médecin', tone: 'pm-danger' },
};

/** Any text coming from the data goes through here before entering the HTML. */
const escape = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
/** Value of a datetime-local field: local time, to the minute. */
const now = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** Common base: renders once the SDK is set, and after each change of state. */
class InfirmaryElement extends HTMLElement {
  #polymorph = null;
  #context = {};

  get polymorph() { return this.#polymorph; }
  set polymorph(sdk) { this.#polymorph = sdk; this.start(); }

  get context() { return this.#context; }
  set context(c) { this.#context = c ?? {}; if (this.#polymorph) this.start(); }

  connectedCallback() { if (this.#polymorph) this.start(); }

  start() {}

  t(text) { return this.polymorph.t(text); }
}

/** Screen /modules/infirmary: the visits over a period, and recording a visit. */
class Visits extends InfirmaryElement {
  from = daysAgo(30);
  to = today();
  visits = null;
  reasons = [];
  formOpen = false;
  errors = {};

  async start() {
    if (this.started) return;
    this.started = true;
    this.addEventListener('click', (e) => this.onClick(e));
    this.addEventListener('change', (e) => this.onChange(e));
    this.addEventListener('submit', (e) => this.save(e));
    this.addEventListener('input', (e) => this.searchLearner(e));
    this.render();
    await Promise.all([this.load(), this.polymorph.api.get('reasons').then((r) => (this.reasons = r))]);
    this.render();
  }

  async load() {
    this.visits = await this.polymorph.api.get('visits', { from: this.from, to: this.to });
    this.render();
  }

  onClick(e) {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'new') { this.formOpen = true; this.errors = {}; this.render(); this.querySelector('#inf-learner')?.focus(); }
    if (action === 'cancel') { this.formOpen = false; this.render(); }
    if (action === 'delete') void this.remove(Number(e.target.closest('[data-id]').dataset.id));
    if (action === 'record') { e.preventDefault(); this.polymorph.navigate(`/apprenants/${e.target.closest('[data-learner]').dataset.learner}`); }
  }

  onChange(e) {
    if (e.target.name === 'from' || e.target.name === 'to') {
      this[e.target.name] = e.target.value;
      void this.load();
    }
  }

  /** Autocomplete: the core learner search (API /api/v1/apprenants/recherche), after a short pause. */
  searchLearner(e) {
    if (e.target.id !== 'inf-learner') return;
    const list = this.querySelector('#inf-learners');
    const term = e.target.value.trim();
    // A picked suggestion is not a new search term.
    if (term.length < 2 || [...list.options].some((o) => o.value === e.target.value)) return;
    clearTimeout(this.pause);
    this.pause = setTimeout(async () => {
      const results = await this.polymorph.api.get('/api/v1/apprenants/recherche', { q: term });
      list.innerHTML = results
        .map((a) => `<option value="${escape(`${a.nom_complet} — ${a.matricule}`)}" data-id="${a.id}"></option>`).join('');
    }, 250);
  }

  async save(e) {
    e.preventDefault();
    const fields = new FormData(e.target);
    const typed = String(fields.get('learner') ?? '');
    const option = [...this.querySelectorAll('#inf-learners option')].find((o) => o.value === typed);
    try {
      await this.polymorph.api.post('visits', {
        learner_id: option ? Number(option.dataset.id) : null,
        occurred_at: fields.get('occurred_at'),
        reason: fields.get('reason'),
        care: fields.get('care') || null,
        outcome: fields.get('outcome'),
        parent_informed: fields.get('parent_informed') === 'on',
      });
      this.polymorph.notify(this.t('Visite enregistrée.'), 'success');
      this.formOpen = false;
      await this.load();
    } catch (error) {
      // Validation error: the messages per field; otherwise the core has already shown the error.
      this.errors = error.errors ?? {};
      this.render();
    }
  }

  async remove(id) {
    if (!(await this.polymorph.confirm(this.t('Supprimer cette visite ?'), { danger: true }))) return;
    await this.polymorph.api.delete(`visits/${id}`);
    this.polymorph.notify(this.t('Visite supprimée.'), 'success');
    await this.load();
  }

  error(field) {
    const message = this.errors[field]?.[0];
    return message ? `<small class="pm-error">${escape(message)}</small>` : '';
  }

  render() {
    const canManage = this.polymorph.can('infirmary.manage');
    this.innerHTML = `
      <div class="pm-screen">
        <header class="pm-header">
          <h1 class="pm-title">${this.t('Visites')}</h1>
          <div class="pm-toolbar">
            <label class="pm-field pm-inline">${this.t('Du')} <input type="date" name="from" value="${this.from}" max="${this.to}"></label>
            <label class="pm-field pm-inline">${this.t('Au')} <input type="date" name="to" value="${this.to}" min="${this.from}"></label>
            ${canManage && !this.formOpen ? `<button type="button" class="pm-button" data-action="new"><i class="pi pi-plus"></i> ${this.t('Nouvelle visite')}</button>` : ''}
          </div>
        </header>
        ${this.formOpen ? this.renderForm() : ''}
        <section class="pm-card">${this.renderTable()}</section>
      </div>`;
  }

  renderForm() {
    return `
      <form class="pm-card" novalidate>
        <h2 class="pm-card-title">${this.t('Nouvelle visite')}</h2>
        <div class="pm-grid">
          <label class="pm-field pm-full">${this.t('Apprenant')} *
            <input id="inf-learner" name="learner" list="inf-learners" autocomplete="off" placeholder="${this.t('Rechercher un apprenant')}" required>
            <datalist id="inf-learners"></datalist>
            ${this.error('learner_id')}
          </label>
          <label class="pm-field">${this.t('Date et heure')} *
            <input type="datetime-local" name="occurred_at" value="${now()}" max="${now()}" required>
            ${this.error('occurred_at')}
          </label>
          <label class="pm-field">${this.t('Motif')} *
            <input name="reason" list="inf-reasons" maxlength="160" required>
            <datalist id="inf-reasons">${this.reasons.map((r) => `<option value="${escape(r.label)}"></option>`).join('')}</datalist>
            ${this.error('reason')}
          </label>
          <label class="pm-field pm-full">${this.t('Soins donnés')}
            <textarea name="care" rows="2" maxlength="2000"></textarea>
          </label>
          <label class="pm-field">${this.t('Orientation')} *
            <select name="outcome">
              ${Object.entries(OUTCOMES).map(([code, o]) => `<option value="${code}">${this.t(o.label)}</option>`).join('')}
            </select>
          </label>
          <label class="pm-checkbox"><input type="checkbox" name="parent_informed"> ${this.t('Parent prévenu')}</label>
        </div>
        <div class="pm-toolbar pm-end">
          <button type="button" class="pm-button pm-secondary" data-action="cancel">${this.t('Annuler')}</button>
          <button type="submit" class="pm-button">${this.t('Enregistrer')}</button>
        </div>
      </form>`;
  }

  renderTable() {
    const p = this.polymorph;
    if (this.visits === null) return '<p class="pm-muted">…</p>';
    if (!this.visits.length) return `<p class="pm-empty"><i class="pi pi-heart"></i>${this.t('Aucune visite sur la période.')}</p>`;
    const canManage = p.can('infirmary.manage');
    return `
      <table class="pm-table">
        <thead><tr>
          <th>${this.t('Date et heure')}</th><th>${this.t('Apprenant')}</th><th>${this.t('Motif')}</th>
          <th>${this.t('Orientation')}</th><th>${this.t('Parent prévenu')}</th>${canManage ? '<th></th>' : ''}
        </tr></thead>
        <tbody>${this.visits.map((v) => {
          const o = OUTCOMES[v.outcome] ?? { label: v.outcome, tone: '' };
          return `<tr data-id="${v.id}">
            <td>${escape(p.date(v.occurred_at, 'time'))}</td>
            <td><a href="/apprenants/${v.learner.id}" class="pm-link" data-action="record" data-learner="${v.learner.id}">${escape(`${v.learner.nom} ${v.learner.prenom}`)}</a>
              <span class="pm-muted">${escape(v.learner.matricule)}</span></td>
            <td>${escape(v.reason)}</td>
            <td><span class="pm-badge ${o.tone}">${this.t(o.label)}</span></td>
            <td>${v.parent_informed ? this.t('Oui') : `<span class="pm-badge pm-warning">${this.t('Non')}</span>`}</td>
            ${canManage ? `<td class="pm-actions"><button type="button" class="pm-button pm-text pm-danger pm-small" data-action="delete" aria-label="${this.t('Supprimer')}"><i class="pi pi-trash"></i></button></td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }
}

/** Screen /modules/infirmary/reasons: the reasons suggested when recording a visit. */
class Reasons extends InfirmaryElement {
  reasons = null;

  async start() {
    if (this.started) return;
    this.started = true;
    this.addEventListener('submit', (e) => this.add(e));
    this.addEventListener('click', (e) => {
      const id = e.target.closest('[data-remove]')?.dataset.remove;
      if (id) void this.remove(Number(id));
    });
    await this.load();
  }

  async load() {
    this.reasons = await this.polymorph.api.get('reasons');
    this.render();
  }

  async add(e) {
    e.preventDefault();
    const label = new FormData(e.target).get('label');
    try {
      await this.polymorph.api.post('reasons', { label });
      this.polymorph.notify(this.t('Motif ajouté.'), 'success');
      await this.load();
    } catch { /* the core shows the error */ }
  }

  async remove(id) {
    await this.polymorph.api.delete(`reasons/${id}`);
    this.polymorph.notify(this.t('Motif retiré.'), 'success');
    await this.load();
  }

  render() {
    this.innerHTML = `
      <div class="pm-screen">
        <header class="pm-header"><h1 class="pm-title">${this.t('Motifs')}</h1></header>
        <section class="pm-card">
          <p class="pm-muted">${this.t('Les motifs proposés à la saisie d\'une visite. On peut toujours en écrire un autre.')}</p>
          <ul class="pm-list">${(this.reasons ?? []).map((r) => `
            <li><span>${escape(r.label)}</span>
              <button type="button" class="pm-button pm-text pm-danger pm-small" data-remove="${r.id}" aria-label="${this.t('Supprimer')}"><i class="pi pi-times"></i></button></li>`).join('')}
          </ul>
          <form class="pm-toolbar">
            <label class="pm-field pm-inline"><span class="pm-sr-only">${this.t('Nouveau motif')}</span>
              <input name="label" maxlength="160" placeholder="${this.t('Nouveau motif')}" required></label>
            <button type="submit" class="pm-button pm-secondary"><i class="pi pi-plus"></i> ${this.t('Ajouter')}</button>
          </form>
        </section>
      </div>`;
  }
}

/** Card of the learner record (slot « fiche-apprenant.cartes »): number of visits and the latest ones. */
class Card extends InfirmaryElement {
  async start() {
    const learner = this.context.apprenant;
    if (!learner || this.shownFor === learner.id) return;
    this.shownFor = learner.id;
    this.innerHTML = `<section class="pm-card"><h2 class="pm-card-title">${this.t('Infirmerie')}</h2><p class="pm-muted">…</p></section>`;
    const d = await this.polymorph.api.get(`learners/${learner.id}`);
    const p = this.polymorph;
    this.innerHTML = `
      <section class="pm-card">
        <h2 class="pm-card-title">${this.t('Infirmerie')}</h2>
        ${d.total === 0 ? `<p class="pm-muted">${this.t('Aucune visite à l\'infirmerie.')}</p>` : `
          <p class="pm-toolbar"><span><strong>${d.total}</strong> ${this.t(d.total > 1 ? 'visites' : 'visite')}</span>
            ${d.not_informed ? `<span class="pm-badge pm-warning">${this.t('Parent non prévenu')} : ${d.not_informed}</span>` : ''}</p>
          <ul class="pm-list">${d.latest.map((v) => `
            <li><span>${escape(v.reason)}</span><span class="pm-muted">${escape(p.date(v.occurred_at, 'time'))}</span></li>`).join('')}
          </ul>
          <button type="button" class="pm-button pm-text pm-small">${this.t('Voir toutes les visites')} <i class="pi pi-arrow-right"></i></button>`}
      </section>`;
    this.querySelector('button')?.addEventListener('click', () => p.navigate('/modules/infirmary'));
  }
}

export function activate(polymorph) {
  customElements.define('infirmary-visits', Visits);
  customElements.define('infirmary-reasons', Reasons);
  customElements.define('infirmary-card', Card);

  polymorph.screen('', 'infirmary-visits');
  polymorph.screen('reasons', 'infirmary-reasons');
  polymorph.slot('fiche-apprenant.cartes', 'infirmary-card', { permission: 'infirmary.view' });
}
