const root = document.documentElement;
const themeToggles = document.querySelectorAll('.theme-toggle');
const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
const modal = document.querySelector('#auth-modal');
const authDialog = modal.querySelector('.auth-modal');
const authForm = document.querySelector('#auth-form');
const authFeedback = document.querySelector('#auth-feedback');
const authSubmit = document.querySelector('#auth-submit');
const dashboard = document.querySelector('#dashboard');
const toast = document.querySelector('#toast');

const USERS_KEY = 'portia-local-users-v1';
const SESSION_KEY = 'portia-local-session-v1';
const INTEGRATIONS_KEY = 'portia-local-integrations-v1';
const PROFILE_KEY = 'portia-local-profile-v1';
const PORTFOLIO_KEY = 'portia-local-portfolio-v1';
const PLAN_KEY = 'portia-local-plan-v1';
const ITERATIONS = 120000;
let pendingGithubProjects = [];
const PLAN_CONFIG = {
  free: { label: 'Gratis', maxPortfolios: 1, exportsPerMonth: 1, logo: false, fonts: false, advancedStyles: false },
  pro: { label: 'Pro', maxPortfolios: 5, exportsPerMonth: Infinity, logo: true, fonts: true, advancedStyles: true },
  download: { label: 'Descarga', maxPortfolios: 5, exportsPerMonth: 5, logo: true, fonts: true, advancedStyles: true },
};
const PORTFOLIO_THEMES = {
  minimal: { label: 'Minimalista', accent: '#6440ec', background: '#fafaf9', surface: '#ffffff', text: '#1c1917' },
  joyful: { label: 'Alegre', accent: '#ec4899', background: '#fff7ed', surface: '#ffffff', text: '#431407' },
  playful: { label: 'Divertido', accent: '#f97316', background: '#fefce8', surface: '#ffffff', text: '#422006' },
  elegant: { label: 'Elegante', accent: '#a16207', background: '#fafaf9', surface: '#fffdf5', text: '#292524' },
  tech: { label: 'Tech', accent: '#22d3ee', background: '#0f172a', surface: '#111827', text: '#e2e8f0' },
};

function darkenThemeColor(value) {
  const match = String(value || '').match(/^#([0-9a-f]{6})$/i);
  if (!match) return value;
  const channels = [0, 2, 4].map((offset) => Math.max(0, Math.round(parseInt(match[1].slice(offset, offset + 2), 16) * 0.72)));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

const savedTheme = localStorage.getItem('portia-theme');
if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;
updateThemeIcons();

themeToggles.forEach((toggle) => toggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('portia-theme', root.dataset.theme);
  updateThemeIcons();
}));

function updateThemeIcons() {
  document.querySelectorAll('.theme-switch').forEach((switcher) => {
    switcher.classList.toggle('is-dark', root.dataset.theme === 'dark');
  });
  themeToggles.forEach((toggle) => toggle.setAttribute('aria-label', root.dataset.theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'));
}

menuButton.addEventListener('click', () => {
  const isOpen = navLinks.classList.contains('open');
  if (isOpen) closeMenu();
  else {
    navLinks.classList.remove('closing');
    navLinks.classList.add('open');
    menuButton.setAttribute('aria-expanded', 'true');
  }
});

navLinks.querySelectorAll('a, button').forEach((link) => link.addEventListener('click', () => closeMenu()));

function closeMenu() {
  if (!navLinks.classList.contains('open')) return;
  navLinks.classList.add('closing');
  navLinks.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  window.setTimeout(() => navLinks.classList.remove('closing'), 300);
}

document.querySelectorAll('.auth-trigger').forEach((button) => button.addEventListener('click', () => {
  if (getSessionUser() && button.dataset.plan) {
    openPlanModal(button.dataset.plan);
    return;
  }
  openAuth(button.textContent.toLowerCase().includes('crear') ? 'register' : 'login');
}));
document.querySelectorAll('.price-card .auth-trigger').forEach((button, index) => {
  button.dataset.plan = ['free', 'pro', 'download'][index] || 'free';
});
document.querySelector('.modal-close').addEventListener('click', closeAuth);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeAuth();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('open')) closeAuth();
  if (event.key === 'Escape' && document.querySelector('#plan-modal').classList.contains('open')) closePlanModal();
  if (event.key === 'Escape' && document.querySelector('#project-modal').classList.contains('open')) closeProjectModal();
});

document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
document.querySelector('.password-toggle').addEventListener('click', (event) => {
  const password = document.querySelector('#auth-password');
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  event.currentTarget.textContent = visible ? 'Mostrar' : 'Ocultar';
});
authForm.addEventListener('submit', handleAuth);

function openAuth(mode = 'login') {
  setAuthMode(mode);
  authFeedback.textContent = '';
  authFeedback.className = 'auth-feedback';
  authForm.reset();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.querySelector(mode === 'register' ? '#auth-name' : '#auth-email').focus();
}

function closeAuth() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function setAuthMode(mode) {
  const register = mode === 'register';
  authDialog.classList.toggle('register-mode', register);
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelector('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
  document.querySelector('#auth-password-confirm').required = register;
  document.querySelector('#auth-consent').required = register;
  authSubmit.innerHTML = register ? 'Crear cuenta <span>→</span>' : 'Entrar <span>→</span>';
}

async function handleAuth(event) {
  event.preventDefault();
  authFeedback.textContent = '';
  authFeedback.className = 'auth-feedback';
  const data = new FormData(authForm);
  const email = String(data.get('email') || '').trim().toLowerCase();
  const password = String(data.get('password') || '');
  const register = authDialog.classList.contains('register-mode');

  if (!isValidEmail(email)) return setFeedback('Escribe un email válido.');
  if (password.length < 10) return setFeedback('La contraseña debe tener al menos 10 caracteres.');
  if (register && password !== String(data.get('passwordConfirm') || '')) return setFeedback('Las contraseñas no coinciden.');
  if (register && !document.querySelector('#auth-consent').checked) return setFeedback('Necesitas aceptar el almacenamiento local para continuar.');

  setBusy(true);
  try {
    const users = readUsers();
    if (register) {
      if (users[email]) return setFeedback('Ya existe una cuenta con ese email en este navegador.');
      const salt = randomBytes(16);
      const hash = await derivePassword(password, salt);
      users[email] = {
        email,
        name: String(data.get('name') || '').trim() || email.split('@')[0],
        salt: bytesToBase64(salt),
        hash: bytesToBase64(hash),
        createdAt: new Date().toISOString(),
      };
      writeUsers(users);
      startSession(email);
      closeAuth();
      showDashboard(users[email]);
      showToast('Cuenta creada. Tus datos permanecen en este navegador.');
    } else {
      const user = users[email];
      if (!user || !await verifyPassword(password, user)) return setFeedback('Email o contraseña incorrectos.');
      startSession(email);
      closeAuth();
      showDashboard(user);
      showToast(`Bienvenido, ${user.name}.`);
    }
  } catch {
    setFeedback('No se pudo completar la operación local. Prueba de nuevo.');
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  authSubmit.disabled = isBusy;
  authSubmit.innerHTML = isBusy ? 'Comprobando…' : (authDialog.classList.contains('register-mode') ? 'Crear cuenta <span>→</span>' : 'Entrar <span>→</span>');
}

function setFeedback(message) {
  authFeedback.textContent = message;
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function startSession(email) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, startedAt: Date.now() }));
}

function getSessionUser() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return session ? readUsers()[session.email] : null;
  } catch {
    return null;
  }
}

function showDashboard(user) {
  if (!user) return;
  document.querySelector('#dashboard-name').textContent = user.name;
  document.querySelector('#user-chip').textContent = user.email;
  document.querySelector('#account-email').textContent = user.email;
  loadProfile(user);
  loadPortfolio(user);
  updatePlanUsage();
  updateAccountSources();
  switchDashboardView('overview');
  dashboard.classList.add('visible');
  dashboard.setAttribute('aria-hidden', 'false');
  document.body.classList.add('dashboard-active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideDashboard() {
  dashboard.classList.remove('visible');
  dashboard.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('dashboard-active');
}

document.querySelector('.logout-button').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  hideDashboard();
  showToast('Sesión cerrada en este dispositivo.');
});

document.querySelectorAll('.dashboard-tab').forEach((tab) => tab.addEventListener('click', () => switchDashboardView(tab.dataset.dashboardView)));
document.querySelector('#new-portfolio').addEventListener('click', () => switchDashboardView('portfolio'));
document.querySelector('#connect-github').addEventListener('click', () => {
  const githubCard = document.querySelector('.integration-card[data-integration="github"]');
  if (githubCard && !githubCard.classList.contains('connected')) githubCard.querySelector('.integration-action').click();
  switchDashboardView('overview');
  showToast('GitHub está listo como fuente local. La conexión OAuth llegará con el backend.');
});

document.querySelector('#profile-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const profile = Object.fromEntries(new FormData(event.currentTarget).entries());
  saveScopedData(PROFILE_KEY, profile);
  integrationState.github = Boolean(profile.githubUsername);
  integrationState.linkedin = Boolean(profile.linkedinUrl);
  integrationState.notion = Boolean(profile.notionUrl);
  integrationState.profile = true;
  writeIntegrations(integrationState);
  updateIntegrationProgress(integrationState);
  updateAccountSources();
  const users = readUsers();
  const sessionUser = getSessionUser();
  if (sessionUser && users[sessionUser.email]) {
    users[sessionUser.email].name = String(profile.name || '').trim() || users[sessionUser.email].name;
    writeUsers(users);
    document.querySelector('#dashboard-name').textContent = users[sessionUser.email].name;
  }
  showToast('Perfil guardado en este navegador.');
});

document.querySelector('#portfolio-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const plan = getPlanConfig();
  const store = readPortfolioStore();
  if (store.items.filter((item) => item.status === 'created').length >= plan.maxPortfolios) {
    openPlanModal();
    showToast(`Tu plan permite ${plan.maxPortfolios} portfolio${plan.maxPortfolios === 1 ? '' : 's'}.`);
    return;
  }
  const portfolio = createPortfolioRecord(Object.fromEntries(new FormData(event.currentTarget).entries()), 'created');
  await savePortfolioRecord(portfolio);
  renderPortfolioPreview(portfolio);
  updatePortfolioStatus(portfolio);
  updatePlanUsage();
  showToast('Portfolio creado y guardado en tu base local.');
});

document.querySelector('#import-github').addEventListener('click', importGithubData);
document.querySelector('#add-github-projects').addEventListener('click', addSelectedGithubProjects);
document.querySelector('#save-portfolio-draft').addEventListener('click', async () => {
  const portfolio = createPortfolioRecord(Object.fromEntries(new FormData(document.querySelector('#portfolio-form')).entries()), 'draft');
  await savePortfolioRecord(portfolio);
  updatePortfolioStatus(portfolio);
  updatePlanUsage();
  showToast('Borrador guardado. Pulsa “Crear portfolio” cuando quieras generarlo.');
});
document.querySelector('#export-portfolio').addEventListener('click', exportPortfolio);
document.querySelector('#open-plan-modal').addEventListener('click', () => openPlanModal());
document.querySelector('#plan-modal-close').addEventListener('click', closePlanModal);
document.querySelector('#plan-modal').addEventListener('click', (event) => {
  if (event.target.id === 'plan-modal') closePlanModal();
});
document.querySelectorAll('.plan-option').forEach((button) => button.addEventListener('click', () => selectPlan(button.dataset.plan)));
document.querySelector('#open-created-portfolio').addEventListener('click', () => {
  const preview = document.querySelector('#portfolio-public-preview');
  preview.hidden = false;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#close-created-portfolio').addEventListener('click', () => {
  document.querySelector('#portfolio-public-preview').hidden = true;
});
document.querySelector('#project-modal-close').addEventListener('click', closeProjectModal);
document.querySelector('#project-modal').addEventListener('click', (event) => {
  if (event.target.id === 'project-modal') closeProjectModal();
});

document.querySelectorAll('#portfolio-form input, #portfolio-form textarea, #portfolio-form select').forEach((field) => {
  field.addEventListener('input', () => renderPortfolioPreview(Object.fromEntries(new FormData(document.querySelector('#portfolio-form')).entries())));
  field.addEventListener('change', () => renderPortfolioPreview(Object.fromEntries(new FormData(document.querySelector('#portfolio-form')).entries())));
});

document.querySelector('#delete-account').addEventListener('click', () => {
  const user = getSessionUser();
  if (!user) return;
  const users = readUsers();
  delete users[user.email];
  writeUsers(users);
  localStorage.removeItem(getScopedKey(PROFILE_KEY, user.email));
  localStorage.removeItem(getScopedKey(PORTFOLIO_KEY, user.email));
  localStorage.removeItem(`${PLAN_KEY}:${user.email}`);
  if (window.PortiaDB) {
    Promise.all([
      window.PortiaDB.remove('profiles', user.email),
      window.PortiaDB.remove('portfolios', user.email),
      window.PortiaDB.remove('integrations', user.email),
      window.PortiaDB.remove('githubSnapshots', user.email),
    ]).catch(() => {});
  }
  sessionStorage.removeItem(SESSION_KEY);
  hideDashboard();
  showToast('Cuenta y datos locales eliminados.');
});

document.querySelector('#demo-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#github-user');
  const error = document.querySelector('#demo-error');
  const username = input.value.trim();
  if (!input.checkValidity() || !username) {
    error.textContent = 'Escribe un usuario de GitHub válido.';
    input.focus();
    return;
  }
  error.textContent = '';
  showToast(`Vista previa de @${username} preparada para la Fase 2.`);
});

document.querySelectorAll('.template-option').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.template-option.active').classList.remove('active');
  button.classList.add('active');
  document.querySelector('#template-preview').dataset.template = button.dataset.template;
  showToast(`Plantilla ${button.textContent} seleccionada.`);
}));

document.querySelectorAll('.faq-list details').forEach((item) => {
  const summary = item.querySelector('summary');
  summary.setAttribute('aria-expanded', String(item.open));
  summary.addEventListener('click', (event) => {
    event.preventDefault();
    const willOpen = !item.open;
    if (!willOpen) {
      item.classList.add('is-closing');
      summary.setAttribute('aria-expanded', 'false');
      window.setTimeout(() => {
        item.open = false;
        item.classList.remove('is-closing');
      }, 340);
      return;
    }

    document.querySelectorAll('.faq-list details[open]').forEach((other) => {
      if (other === item) return;
      other.classList.add('is-closing');
      other.querySelector('summary').setAttribute('aria-expanded', 'false');
      window.setTimeout(() => {
        other.open = false;
        other.classList.remove('is-closing');
      }, 340);
    });
    item.open = true;
    window.requestAnimationFrame(() => summary.setAttribute('aria-expanded', 'true'));
  });
});

const integrationCards = [...document.querySelectorAll('.integration-card')];
const integrationState = readIntegrations();
integrationCards.forEach((card) => {
  const key = card.dataset.integration;
  card.classList.toggle('connected', Boolean(integrationState[key]));
  updateIntegrationButton(card);
  card.querySelector('.integration-action').addEventListener('click', () => {
    integrationState[key] = !card.classList.contains('connected');
    card.classList.toggle('connected', integrationState[key]);
    writeIntegrations(integrationState);
    updateIntegrationButton(card);
    updateIntegrationProgress(integrationState);
    updateAccountSources();
    showToast(integrationState[key] ? `${integrationLabel(key)} añadida a tu perfil local.` : `${integrationLabel(key)} desconectada.`);
  });
});
updateIntegrationProgress(integrationState);
writeIntegrations(integrationState);

function integrationLabel(key) {
  return { github: 'GitHub', linkedin: 'LinkedIn', notion: 'Notion', profile: 'Tus datos' }[key] || 'Fuente';
}

function updateIntegrationButton(card) {
  const button = card.querySelector('.integration-action');
  const connected = card.classList.contains('connected');
  button.innerHTML = connected ? 'Conectado <span>✓</span>' : 'Añadir <svg class="button-icon"><use href="#icon-arrow"></use></svg>';
}

function updateIntegrationProgress(state) {
  const connected = integrationCards.filter((card) => state[card.dataset.integration]).length;
  document.querySelector('#integration-count').textContent = `${connected} de ${integrationCards.length} conectadas`;
  document.querySelector('#integration-progress').style.width = `${(connected / integrationCards.length) * 100}%`;
}

function readIntegrations() {
  try {
    const saved = JSON.parse(localStorage.getItem(INTEGRATIONS_KEY) || 'null');
    return { github: true, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { github: true };
  }
}

function writeIntegrations(state) {
  localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(state));
  const email = getSessionUser()?.email || 'anonymous';
  if (window.PortiaDB) window.PortiaDB.set('integrations', email, state).catch(() => {});
}

function switchDashboardView(view) {
  document.querySelectorAll('.dashboard-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.dashboardView === view));
  document.querySelectorAll('.dashboard-view').forEach((panel) => panel.classList.toggle('active', panel.dataset.dashboardPanel === view));
}

function getScopedKey(baseKey, email = getSessionUser()?.email) {
  return email ? `${baseKey}:${email}` : baseKey;
}

function readScopedData(baseKey, email) {
  try {
    return JSON.parse(localStorage.getItem(getScopedKey(baseKey, email)) || 'null') || {};
  } catch {
    return {};
  }
}

function saveScopedData(baseKey, value) {
  localStorage.setItem(getScopedKey(baseKey), JSON.stringify(value));
  const email = getSessionUser()?.email;
  if (email && window.PortiaDB) {
    return window.PortiaDB.set(baseKey === PROFILE_KEY ? 'profiles' : 'portfolios', email, value);
  }
  return Promise.resolve(value);
}

async function loadProfile(user) {
  const stored = window.PortiaDB ? await window.PortiaDB.get('profiles', user.email).catch(() => null) : null;
  const profile = { name: user.name, ...(stored || readScopedData(PROFILE_KEY, user.email)) };
  const form = document.querySelector('#profile-form');
  Object.entries(profile).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value || '';
  });
}

async function loadPortfolio(user) {
  const stored = window.PortiaDB ? await window.PortiaDB.get('portfolios', user.email).catch(() => null) : null;
  let portfolio = getActivePortfolio(stored || readScopedData(PORTFOLIO_KEY, user.email));
  portfolio = await refreshWebsitePreviews(portfolio);
  const form = document.querySelector('#portfolio-form');
  Object.entries(portfolio).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value || '';
  });
  renderPortfolioPreview(portfolio);
  updatePortfolioStatus(portfolio);
}

function readPortfolioStore() {
  const raw = readScopedData(PORTFOLIO_KEY);
  if (Array.isArray(raw.items)) return raw;
  return { ...raw, items: raw.id ? [raw] : [], activeId: raw.id || null };
}

function getActivePortfolio(store) {
  const items = Array.isArray(store?.items) ? store.items : [];
  return items.find((item) => item.id === store.activeId) || items[items.length - 1] || store || {};
}

async function savePortfolioRecord(record) {
  const store = readPortfolioStore();
  const items = [...store.items];
  const index = items.findIndex((item) => item.id === record.id);
  if (index >= 0) items[index] = record;
  else if (record.status === 'created') items.push(record);
  const next = { ...record, items, activeId: record.id };
  await saveScopedData(PORTFOLIO_KEY, next);
  return next;
}

function getPlanState() {
  const user = getSessionUser();
  if (!user) return { plan: 'free', exports: {} };
  try {
    return JSON.parse(localStorage.getItem(`${PLAN_KEY}:${user.email}`) || '{"plan":"free","exports":{}}');
  } catch {
    return { plan: 'free', exports: {} };
  }
}

function getPlanConfig() {
  return PLAN_CONFIG[getPlanState().plan] || PLAN_CONFIG.free;
}

function savePlanState(state) {
  const user = getSessionUser();
  if (user) localStorage.setItem(`${PLAN_KEY}:${user.email}`, JSON.stringify(state));
}

function updatePlanUsage() {
  const state = getPlanState();
  const config = getPlanConfig();
  const count = readPortfolioStore().items.filter((item) => item.status === 'created').length;
  document.querySelector('#plan-label').textContent = config.label;
  document.querySelector('#portfolio-limit-label').textContent = `${count}/${config.maxPortfolios}`;
  document.querySelector('#account-plan').textContent = config.label;
  document.querySelector('#account-portfolio-limit').textContent = `${count}/${config.maxPortfolios}`;
}

function openPlanModal(preselectedPlan = '') {
  if (!getSessionUser()) {
    openAuth('login');
    return;
  }
  const modal = document.querySelector('#plan-modal');
  const feedback = document.querySelector('#plan-feedback');
  feedback.textContent = preselectedPlan ? `Plan seleccionado: ${PLAN_CONFIG[preselectedPlan]?.label || ''}` : '';
  document.querySelectorAll('.plan-option').forEach((option) => option.classList.toggle('selected', option.dataset.plan === (preselectedPlan || getPlanState().plan)));
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closePlanModal() {
  const modal = document.querySelector('#plan-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function selectPlan(plan) {
  if (!PLAN_CONFIG[plan]) return;
  const previous = getPlanState();
  const state = { ...previous, plan };
  savePlanState(state);
  document.querySelector('#plan-feedback').textContent = plan === 'free'
    ? 'Plan gratuito activo. Puedes exportar una vez al mes con marca Portia.'
    : 'Plan preparado en modo demo local. El cobro real se activará al conectar Stripe.';
  updatePlanUsage();
  showToast(`${PLAN_CONFIG[plan].label} seleccionado para esta cuenta.`);
}

function getExportKey() {
  return new Date().toISOString().slice(0, 7);
}

async function exportPortfolio() {
  const activePortfolio = getActivePortfolio(readPortfolioStore());
  const form = document.querySelector('#portfolio-form');
  const currentFields = form ? Object.fromEntries(new FormData(form).entries()) : {};
  const portfolio = activePortfolio.id ? { ...activePortfolio, ...currentFields } : activePortfolio;
  if (!portfolio.id) {
    showToast('Crea un portfolio antes de exportarlo.');
    return;
  }
  await savePortfolioRecord(portfolio);
  const config = getPlanConfig();
  const state = getPlanState();
  const key = getExportKey();
  const used = state.exports[key] || 0;
  if (used >= config.exportsPerMonth) {
    openPlanModal();
    showToast('Has alcanzado el límite de exportación de tu plan.');
    return;
  }
  const title = escapeHtml(portfolio.title || 'Portfolio');
  const intro = escapeHtml(portfolio.intro || '');
  const theme = PORTFOLIO_THEMES[portfolio.theme] || PORTFOLIO_THEMES.minimal;
  const profile = readScopedData(PROFILE_KEY) || {};
  const rawBrandName = String(portfolio.brandName || profile.name || portfolio.title || 'Portfolio').split(' · ')[0];
  const brandName = escapeHtml(rawBrandName);
  const initials = escapeHtml((String(portfolio.brandInitials || '').trim() || rawBrandName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || 'P').slice(0, 3).toUpperCase());
  const brandColor = /^#[0-9a-f]{6}$/i.test(String(portfolio.brandColor || '')) ? portfolio.brandColor : theme.accent;
  const colorMode = portfolio.colorMode === 'dark';
  const pageBackground = colorMode ? darkenThemeColor(theme.background) : theme.background;
  const pageSurface = colorMode ? darkenThemeColor(theme.surface) : theme.surface;
  const pageText = colorMode ? '#f5f5f4' : theme.text;
  const logoStyle = ['monogram', 'wordmark', 'badge'].includes(portfolio.logoStyle) ? portfolio.logoStyle : 'monogram';
  const fontFamily = config.fonts ? (portfolio.theme === 'elegant' ? 'Georgia, serif' : 'Inter, ui-sans-serif, system-ui, sans-serif') : 'system-ui, sans-serif';
  const logo = config.logo
    ? (logoStyle === 'wordmark' ? `<span class="brand-word">${brandName}</span>` : `<span class="brand-mark ${logoStyle}" aria-hidden="true">${initials}</span>`)
    : '<span class="brand-word">portia</span>';
  const projects = (portfolio.projects || []).map((project) => {
    const imageUrl = getProjectImage(project);
    const image = imageUrl ? `<img src="${escapeHtml(safeExternalUrl(imageUrl))}" alt="" loading="lazy">` : '';
    const languages = escapeHtml((project.languages || [project.language]).filter(Boolean).join(' · '));
    const link = safeExternalUrl(project.url);
    return `<article class="project-card">${image ? `<div class="project-image">${image}</div>` : ''}<div><h2>${escapeHtml(project.name || 'Proyecto')}</h2><p>${escapeHtml(project.description || '')}</p><p class="project-languages">${languages}</p><a href="${escapeHtml(link)}" rel="noopener noreferrer">Ver proyecto <span aria-hidden="true">→</span></a></div></article>`;
  }).join('');
  const isFreePlan = state.plan === 'free';
  const upgradeNotice = isFreePlan ? '<aside class="upgrade-notice"><strong>¿Quieres llevarlo más lejos?</strong><span>Actualiza a Pro para desbloquear logo, tipografías y estilos avanzados.</span></aside>' : '';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>:root{--accent:${brandColor};--bg:${pageBackground};--surface:${pageSurface};--text:${pageText};--muted:color-mix(in srgb,var(--text) 66%,transparent);--border:color-mix(in srgb,var(--accent) 22%,var(--text))}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:88px}section[id],footer[id]{scroll-margin-top:88px}body{margin:0;background:var(--bg);color:var(--text);font-family:${fontFamily};line-height:1.6}a{color:var(--accent);font-weight:700;text-decoration:none}a:hover{text-decoration:underline}.site-header{position:sticky;top:0;z-index:2;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}.nav{width:min(1080px,calc(100% - 40px));height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.04em}.brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:${logoStyle === 'badge' ? '50%' : '11px'};background:var(--accent);color:${pageBackground};font-size:12px}.brand-word{color:var(--accent);font-size:18px}.nav-links{display:flex;gap:22px;font-size:13px}.page-main{width:min(1080px,calc(100% - 40px));margin:auto;padding:92px 0}.hero{max-width:800px;margin-bottom:62px}.eyebrow{color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.hero h1{font-size:clamp(44px,8vw,88px);line-height:1.02;letter-spacing:-.08em;margin:18px 0}.hero p{max-width:650px;color:var(--muted);font-size:18px}.project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.project-card{overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:${config.advancedStyles ? '20px' : '12px'};padding:${config.advancedStyles ? '0' : '22px'};box-shadow:${config.advancedStyles ? '0 18px 45px color-mix(in srgb,var(--accent) 12%,transparent)' : 'none'}}.project-card>div:last-child{padding:${config.advancedStyles ? '22px' : '0'}}.project-image{height:150px;overflow:hidden}.project-image img{width:100%;height:100%;object-fit:cover;display:block}.project-card h2{font-size:20px;letter-spacing:-.04em;margin:0 0 8px}.project-card p{color:var(--muted);font-size:14px}.project-languages{font-size:12px!important;color:var(--accent)!important}.upgrade-notice{display:flex;gap:10px;flex-direction:column;margin:42px 0 0;padding:18px 20px;border:1px dashed var(--border);border-radius:14px;color:var(--muted);font-size:13px}.upgrade-notice strong{color:var(--text)}.site-footer{border-top:1px solid var(--border);padding:28px 0}.footer-inner{width:min(1080px,calc(100% - 40px));margin:auto;display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:12px}.footer-inner a{margin-left:16px}@media(max-width:650px){.nav-links{gap:10px;font-size:11px}.page-main{padding:60px 0}.footer-inner{display:block}.footer-inner a{margin:0 14px 0 0}}</style></head><body><header class="site-header"><nav class="nav" aria-label="Navegación principal"><a class="brand" href="#inicio">${logo}${logoStyle === 'wordmark' ? '' : `<span>${brandName}</span>`}</a><div class="nav-links"><a href="#inicio">Inicio</a><a href="#proyectos">Proyectos</a><a href="#sobre-mi">Sobre mí</a></div></nav></header><main class="page-main"><section class="hero" id="inicio"><span class="eyebrow">${theme.label} · ${colorMode ? 'Oscuro' : 'Claro'} · Portfolio</span><h1>${title}</h1><p id="sobre-mi">${intro}</p></section><section id="proyectos"><span class="eyebrow">Trabajo seleccionado</span><div class="project-grid">${projects || '<p>Aún no hay proyectos añadidos.</p>'}</div></section>${upgradeNotice}</main><footer class="site-footer"><div class="footer-inner"><span>Creado con Portia · ${theme.label}</span><span><a href="#inicio">Volver arriba</a><a href="#proyectos">Proyectos</a></span></div></footer></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${String(portfolio.title || 'portfolio').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'portfolio'}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
  savePlanState({ ...state, exports: { ...state.exports, [key]: used + 1 } });
  showToast('Exportación HTML descargada.');
}

async function importGithubData() {
  const status = document.querySelector('#github-import-status');
  const button = document.querySelector('#import-github');
  const user = getSessionUser();
  if (!user) return;
  const storedProfile = window.PortiaDB ? await window.PortiaDB.get('profiles', user.email).catch(() => null) : null;
  const profile = storedProfile || readScopedData(PROFILE_KEY, user.email);
  const username = String(profile.githubUsername || '').trim();
  if (!username) {
    status.textContent = 'Añade primero tu usuario de GitHub en Mi perfil.';
    status.classList.add('error');
    switchDashboardView('profile');
    document.querySelector('#profile-github').focus();
    return;
  }

  button.disabled = true;
  status.classList.remove('error');
  status.textContent = 'Consultando los datos públicos de GitHub…';
  try {
    const userResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!userResponse.ok) throw new Error('GitHub no ha encontrado ese usuario o ha limitado la consulta.');
    const githubUser = await userResponse.json();
    const repositories = await fetchAllGithubRepositories(username);
    const profileReadme = await fetchGithubReadme(`${githubUser.login}/${githubUser.login}`);
    const listedRepositories = profileReadme ? findRepositoriesInReadme(profileReadme.content, repositories, githubUser.login) : [];
    const inspectedRepositories = listedRepositories.length ? listedRepositories : [];
    const profileRepository = repositories.find((repo) => repo.name.toLowerCase() === githubUser.login.toLowerCase());
    const enrichedRepositories = await enrichGithubRepositories(inspectedRepositories, profileReadme?.content || '', profileRepository);
    const snapshot = {
      username: githubUser.login,
      name: githubUser.name || githubUser.login,
      bio: githubUser.bio || '',
      location: githubUser.location || '',
      avatar: githubUser.avatar_url || '',
      publicRepos: githubUser.public_repos || 0,
      followers: githubUser.followers || 0,
      repositories: enrichedRepositories,
      profileReadme: Boolean(profileReadme),
      profileReadmeUrl: profileReadme?.htmlUrl || '',
      fetchedAt: new Date().toISOString(),
    };
    await window.PortiaDB.set('githubSnapshots', user.email, snapshot);
    const skills = [...new Set(snapshot.repositories.flatMap((repo) => repo.languages || []).filter(Boolean))].slice(0, 10);
    const topProject = snapshot.repositories[0];
    const portfolio = {
      ...readScopedData(PORTFOLIO_KEY, user.email),
      status: 'draft',
      projects: snapshot.repositories,
      title: `${snapshot.name} · ${profile.role || 'Developer'}`,
      intro: snapshot.bio || `Desarrollo proyectos públicos y comparto mi trabajo en GitHub.`,
      skills: skills.join(', '),
      project: topProject?.name || '',
      projectDescription: topProject?.description || 'Proyecto destacado de GitHub',
    };
    await saveScopedData(PORTFOLIO_KEY, portfolio);
    document.querySelector('#portfolio-form').reset();
    Object.entries(portfolio).forEach(([key, value]) => {
      const field = document.querySelector('#portfolio-form').elements.namedItem(key);
      if (field) field.value = value || '';
    });
    renderPortfolioPreview(portfolio);
    updatePortfolioStatus(portfolio);
    integrationState.github = true;
    document.querySelector('.integration-card[data-integration="github"]')?.classList.add('connected');
    writeIntegrations(integrationState);
    updateIntegrationProgress(integrationState);
    updateAccountSources();
    pendingGithubProjects = await Promise.all(repositories
      .filter((repo) => !snapshot.repositories.some((project) => project.url === repo.html_url))
      .map((repo) => normalizeGithubRepository(repo, null)));
    renderGithubProjectPicker(pendingGithubProjects, {
      hasProfileReadme: Boolean(profileReadme),
      listedCount: listedRepositories.length,
      importedCount: snapshot.repositories.length,
    });
    status.textContent = snapshot.repositories.length
      ? `Añadidos ${snapshot.repositories.length} proyectos mencionados en el README de perfil.`
      : 'No se han añadido proyectos automáticamente; elige cuáles quieres incluir.';
    showToast(snapshot.repositories.length ? 'Proyectos del README importados al borrador.' : 'Elige los proyectos que quieres añadir.');
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.message || 'No se pudo importar GitHub.';
  } finally {
    button.disabled = false;
  }
}

async function fetchAllGithubRepositories(username) {
  const repositories = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('GitHub no ha podido devolver todos los repositorios.');
    const pageRepositories = await response.json();
    repositories.push(...pageRepositories);
    if (pageRepositories.length < 100) break;
  }
  return repositories;
}

async function fetchGithubReadme(fullName) {
  const response = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('GitHub no ha podido leer uno de los README.');
  const readme = await response.json();
  return {
    content: decodeGithubContent(readme.content || ''),
    htmlUrl: readme.html_url || '',
    downloadUrl: readme.download_url || '',
    path: readme.path || 'README.md',
  };
}

function decodeGithubContent(content) {
  const binary = atob(String(content).replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function findRepositoriesInReadme(content, repositories, username) {
  const text = String(content || '');
  const normalizedText = text.toLowerCase();
  const references = new Set();
  const fullNamePattern = new RegExp(`github\\.com[/:]${escapeRegExp(username)}\\/([a-z0-9._-]+)`, 'gi');
  for (const match of normalizedText.matchAll(fullNamePattern)) references.add(match[1].toLowerCase());
  return repositories.filter((repo) => {
    const name = String(repo.name || '').toLowerCase();
    return name && name !== username.toLowerCase() && name !== `${username.toLowerCase()}.github.io` && references.has(name);
  });
}

async function enrichGithubRepositories(repositories, profileReadmeContent = '', profileRepository = null) {
  const results = await Promise.all(repositories.map(async (repo) => {
    const readme = await fetchGithubReadme(repo.full_name);
    if (!readme) return null;
    const languages = await fetchGithubLanguages(repo.full_name);
    return normalizeGithubRepository(repo, readme, languages, profileReadmeContent, profileRepository);
  }));
  return results.filter(Boolean);
}

async function enrichGithubProject(project) {
  if (!project?.fullName) return project;
  const [readme, languages] = await Promise.all([
    fetchGithubReadme(project.fullName),
    fetchGithubLanguages(project.fullName),
  ]);
  return normalizeGithubRepository({
    name: project.name,
    full_name: project.fullName,
    html_url: project.url,
    homepage: project.homepage,
    description: project.description,
    language: project.language,
    stargazers_count: project.stars,
    forks_count: project.forks,
    topics: project.topics,
    updated_at: project.updatedAt,
    default_branch: project.defaultBranch || 'main',
  }, readme, languages);
}

async function fetchGithubLanguages(fullName) {
  const response = await fetch(`https://api.github.com/repos/${fullName}/languages`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return [];
  return Object.keys(await response.json());
}

async function normalizeGithubRepository(repo, readme, languages = [], profileReadmeContent = '', profileRepository = null) {
  const readmeImage = readme ? extractReadmeImage(readme.content, repo, readme.path) : '';
  const profileImage = profileReadmeContent ? extractProfileReadmeImage(profileReadmeContent, repo, profileRepository) : '';
  const websiteImage = await resolveWebsitePreviewImage(repo.homepage);
  return {
    name: repo.name,
    description: repo.description || '',
    language: repo.language || '',
    languages: languages.length ? languages : (repo.language ? [repo.language] : []),
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    homepage: repo.homepage || '',
    updatedAt: repo.updated_at || '',
    image: websiteImage || profileImage || readmeImage,
    imageSource: websiteImage ? 'deployed-web' : profileImage ? 'profile-readme' : readmeImage ? 'repository-readme' : '',
    readmeUrl: readme?.htmlUrl || '',
    url: repo.html_url,
    fullName: repo.full_name,
    defaultBranch: repo.default_branch || 'main',
  };
}

function getWebsitePreviewImage(homepage) {
  const value = String(homepage || '').trim();
  return /^https:\/\//i.test(value) ? `https://image.thum.io/get/width/1200/crop/700/wait/5/${value}` : '';
}

async function resolveWebsitePreviewImage(homepage) {
  const value = String(homepage || '').trim();
  if (!/^https:\/\//i.test(value)) return '';
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(value)}&screenshot=true&meta=false`);
    if (response.ok) {
      const payload = await response.json();
      const screenshot = payload?.data?.screenshot?.url;
      if (typeof screenshot === 'string' && /^https:\/\//i.test(screenshot)) return screenshot;
    }
  } catch {
    // Keep the local fallback below when the screenshot service is unavailable.
  }
  return getWebsitePreviewImage(value);
}

async function refreshWebsitePreviews(portfolio) {
  if (!portfolio || !Array.isArray(portfolio.projects) || !portfolio.projects.some((project) => project.homepage && project.imageSource === 'deployed-web' && /image\.thum\.io/i.test(project.image || ''))) return portfolio;
  const projects = await Promise.all(portfolio.projects.map(async (project) => {
    if (!project.homepage || project.imageSource !== 'deployed-web' || !/image\.thum\.io/i.test(project.image || '')) return project;
    const image = await resolveWebsitePreviewImage(project.homepage);
    return image ? { ...project, image } : project;
  }));
  const next = { ...portfolio, projects };
  await saveScopedData(PORTFOLIO_KEY, next);
  renderPortfolioPreview(next);
  return next;
}

function extractProfileReadmeImage(content, repo, profileRepository) {
  const source = String(content || '');
  const owner = String(repo.full_name || '').split('/')[0];
  const repoPattern = new RegExp(`github\\.com[/:]${escapeRegExp(owner)}\\/${escapeRegExp(repo.name)}\\b`, 'i');
  const repoMatch = repoPattern.exec(source) || new RegExp(`\\b${escapeRegExp(repo.name)}\\b`, 'i').exec(source);
  if (!repoMatch) return '';
  const tableCell = [...source.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/gi)]
    .map((match) => match[0])
    .find((cell) => cell.toLowerCase().includes(repo.full_name.toLowerCase()) || cell.toLowerCase().includes(`>${repo.name.toLowerCase()}<`));
  const nearbyText = tableCell || source.slice(Math.max(0, repoMatch.index - 500), Math.min(source.length, repoMatch.index + 500));
  const candidates = [];
  const markdownPattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/gi;
  const htmlPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  for (const match of nearbyText.matchAll(markdownPattern)) candidates.push(match[1]);
  for (const match of nearbyText.matchAll(htmlPattern)) candidates.push(match[1]);
  const image = candidates.find((candidate) => !/shields\.io|badge|travis-ci|codecov/i.test(candidate));
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  const path = image.replace(/^\.?\//, '');
  return profileRepository ? `https://raw.githubusercontent.com/${profileRepository.full_name}/${profileRepository.default_branch}/${path}` : '';
}

function extractReadmeImage(content, repo, readmePath) {
  const source = String(content || '');
  const candidates = [];
  const markdownPattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/gi;
  const htmlPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  for (const match of source.matchAll(markdownPattern)) candidates.push(match[1]);
  for (const match of source.matchAll(htmlPattern)) candidates.push(match[1]);
  const image = candidates.find((candidate) => !/shields\.io|badge|travis-ci|codecov/i.test(candidate));
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  const path = image.replace(/^\.?\//, '');
  return `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${path || readmePath}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderGithubProjectPicker(projects, meta = {}) {
  const picker = document.querySelector('#github-project-picker');
  const options = document.querySelector('#github-project-options');
  const copy = document.querySelector('#github-project-picker-copy');
  const count = document.querySelector('#github-project-picker-count');
  if (!picker || !options) return;
  if (!projects.length) {
    picker.hidden = true;
    return;
  }
  picker.hidden = false;
  copy.textContent = meta.listedCount
    ? 'Estos repositorios no estaban en el README de perfil o no tenían README propio. Selecciona los que quieras añadir.'
    : meta.hasProfileReadme
      ? 'El README de perfil no menciona repositorios reconocibles. Selecciona manualmente los proyectos que quieras mostrar.'
      : 'No se ha encontrado un README de perfil con proyectos. Selecciona manualmente los repositorios que quieras mostrar.';
  count.textContent = `${projects.length} disponibles`;
  options.innerHTML = projects.map((project, index) => `<label class="github-project-option"><input type="checkbox" value="${index}"><span class="github-project-check" aria-hidden="true"></span><span class="github-project-copy"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.description || 'Sin descripción')}</small></span></label>`).join('');
}

async function addSelectedGithubProjects() {
  const selected = [...document.querySelectorAll('#github-project-options input:checked')]
    .map((input) => pendingGithubProjects[Number(input.value)])
    .filter(Boolean);
  if (!selected.length) {
    showToast('Selecciona al menos un proyecto.');
    return;
  }
  const user = getSessionUser();
  if (!user) return;
  const stored = window.PortiaDB ? await window.PortiaDB.get('portfolios', user.email).catch(() => null) : null;
  const portfolio = stored || readScopedData(PORTFOLIO_KEY, user.email) || {};
  const enrichedSelected = await Promise.all(selected.map(enrichGithubProject));
  const projects = [...(Array.isArray(portfolio.projects) ? portfolio.projects : []), ...enrichedSelected];
  const next = { ...portfolio, projects, status: portfolio.status || 'draft', updatedAt: new Date().toISOString() };
  await saveScopedData(PORTFOLIO_KEY, next);
  pendingGithubProjects = pendingGithubProjects.filter((project) => !selected.includes(project));
  renderPortfolioPreview(next);
  renderGithubProjectPicker(pendingGithubProjects);
  updatePortfolioStatus(next);
  showToast(`${selected.length} proyecto${selected.length === 1 ? '' : 's'} añadido${selected.length === 1 ? '' : 's'} a la galería.`);
}

function renderPortfolioPreview(portfolio) {
  const title = String(portfolio.title || '').trim() || 'Tu nombre · Tu especialidad';
  const intro = String(portfolio.intro || '').trim() || 'Tu presentación aparecerá aquí.';
  const project = String(portfolio.project || '').trim() || 'Añade un proyecto para mostrarlo';
  const description = String(portfolio.projectDescription || '').trim() || 'Descripción breve del proyecto';
  const skills = String(portfolio.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean);
  applyPortfolioTheme(portfolio.theme);
  applyPortfolioBranding(portfolio);
  document.querySelector('#preview-title').textContent = title;
  document.querySelector('#preview-intro').textContent = intro;
  document.querySelector('#preview-project-name').textContent = project;
  document.querySelector('#preview-project-description').textContent = description;
  document.querySelector('#preview-skills').innerHTML = (skills.length ? skills : ['Tus habilidades']).map((skill) => `<span>${escapeHtml(skill)}</span>`).join('');
  document.querySelector('#public-preview-title').textContent = title;
  document.querySelector('#public-preview-intro').textContent = intro;
  document.querySelector('#public-preview-skills').innerHTML = (skills.length ? skills : ['Tus habilidades']).map((skill) => `<span>${escapeHtml(skill)}</span>`).join('');
  renderProjectGallery(Array.isArray(portfolio.projects) ? portfolio.projects : []);
}

function applyPortfolioTheme(theme) {
  const selectedTheme = PORTFOLIO_THEMES[theme] ? theme : 'minimal';
  document.querySelector('#portfolio-live-preview')?.setAttribute('data-portfolio-theme', selectedTheme);
  document.querySelector('#portfolio-public-preview')?.setAttribute('data-portfolio-theme', selectedTheme);
}

function applyPortfolioBranding(portfolio) {
  const preview = document.querySelector('#portfolio-live-preview');
  if (!preview) return;
  const mode = portfolio.colorMode === 'dark' ? 'dark' : 'light';
  const name = String(portfolio.brandName || '').trim() || 'Tu marca';
  const initials = (String(portfolio.brandInitials || '').trim() || name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || 'P').slice(0, 3).toUpperCase();
  const color = /^#[0-9a-f]{6}$/i.test(String(portfolio.brandColor || '')) ? portfolio.brandColor : '#6440ec';
  const style = ['monogram', 'wordmark', 'badge'].includes(portfolio.logoStyle) ? portfolio.logoStyle : 'monogram';
  preview.dataset.colorMode = mode;
  preview.style.setProperty('--portfolio-brand', color);
  preview.dataset.logoStyle = style;
  const brand = document.querySelector('#preview-brand');
  if (brand) {
    brand.innerHTML = style === 'wordmark'
      ? `<strong>${escapeHtml(name)}</strong>`
      : `<span class="preview-brand-mark">${escapeHtml(initials)}</span><strong>${escapeHtml(name)}</strong>`;
  }
}

function renderProjectGallery(projects) {
  const gallery = document.querySelector('#public-project-gallery');
  if (!gallery) return;
  document.querySelector('#public-project-count').textContent = projects.length ? `${projects.length} proyectos` : '';
  gallery.innerHTML = projects.length
    ? projects.map((project, index) => {
      const image = getProjectImage(project);
      const topics = Array.isArray(project.topics) ? project.topics.slice(0, 3) : [];
      return `<article class="project-card" data-project-index="${index}">
        <div class="project-card-media">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="project-card-placeholder"><svg><use href="#icon-portia"></use></svg></span>'}</div>
        <div class="project-card-body"><div class="project-card-heading"><h4>${escapeHtml(project.name || 'Proyecto sin nombre')}</h4><span>★ ${project.stars || 0}</span></div>
        <p>${escapeHtml(project.description || 'Sin descripción disponible.')}</p>
        <div class="project-card-meta">${(project.languages?.length ? project.languages : [project.language || 'Proyecto']).map((language) => `<span>${escapeHtml(language)}</span>`).join('')}${topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join('')}</div>
        <button class="button button-secondary project-details-button" type="button">Ver detalles <span>→</span></button></div>
      </article>`;
    }).join('')
    : '<p class="gallery-empty">Importa GitHub para convertir tus repositorios en una galería de proyectos.</p>';
  gallery.querySelectorAll('.project-card-media img').forEach((image) => {
    image.addEventListener('error', () => {
      image.replaceWith(Object.assign(document.createElement('span'), {
        className: 'project-card-placeholder',
        innerHTML: '<svg aria-hidden="true"><use href="#icon-portia"></use></svg>',
      }));
    }, { once: true });
  });
  gallery.querySelectorAll('.project-details-button').forEach((button) => button.addEventListener('click', () => {
    openProjectModal(projects[Number(button.closest('.project-card').dataset.projectIndex)]);
  }));
}

function getProjectImage(project) {
  const image = String(project?.image || '').trim();
  return image || getGithubPreviewImage(project?.url);
}

function openProjectModal(project) {
  if (!project) return;
  const modal = document.querySelector('#project-modal');
  document.querySelector('#project-modal-title').textContent = project.name || 'Proyecto';
  document.querySelector('#project-modal-description').textContent = project.description || 'Sin descripción disponible.';
  document.querySelector('#project-modal-language').textContent = (project.languages?.length ? project.languages : [project.language]).filter(Boolean).join(' · ') || 'Sin lenguaje indicado';
  document.querySelector('#project-modal-stars').textContent = `★ ${project.stars || 0} estrellas · ${project.forks || 0} forks`;
  document.querySelector('#project-modal-topics').innerHTML = (project.topics || []).map((topic) => `<span>${escapeHtml(topic)}</span>`).join('');
  const image = document.querySelector('#project-modal-image');
  image.src = getProjectImage(project);
  image.alt = project.name ? `Vista previa de ${project.name}` : '';
  image.onerror = () => {
    image.removeAttribute('src');
    image.alt = 'Vista previa no disponible';
  };
  const link = document.querySelector('#project-modal-link');
  link.href = safeExternalUrl(project.url);
  link.hidden = !project.url;
  const readmeLink = document.querySelector('#project-modal-readme');
  readmeLink.href = safeExternalUrl(project.readmeUrl);
  readmeLink.hidden = !project.readmeUrl;
  const homepageLink = document.querySelector('#project-modal-homepage');
  homepageLink.href = safeExternalUrl(project.homepage);
  homepageLink.hidden = !project.homepage;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function getGithubPreviewImage(url) {
  const value = String(url || '').trim();
  const match = value.match(/^https:\/\/github\.com\/([^/?#]+\/[^/?#]+)/i);
  return match ? `https://opengraph.githubassets.com/1/${match[1]}` : '';
}

function safeExternalUrl(url) {
  const value = String(url || '').trim();
  return /^https:\/\//i.test(value) ? value : '#';
}

function closeProjectModal() {
  const modal = document.querySelector('#project-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function createPortfolioRecord(fields, status) {
  const current = getActivePortfolio(readPortfolioStore());
  return {
    ...current,
    ...fields,
    theme: fields.theme || current.theme || 'minimal',
    colorMode: fields.colorMode || current.colorMode || 'light',
    brandName: fields.brandName || current.brandName || '',
    brandInitials: String(fields.brandInitials || current.brandInitials || '').toUpperCase().slice(0, 3),
    brandColor: fields.brandColor || current.brandColor || '#6440ec',
    logoStyle: fields.logoStyle || current.logoStyle || 'monogram',
    id: status === 'created' || !current.id ? `portfolio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` : current.id,
    status,
    createdAt: current.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function updatePortfolioStatus(portfolio) {
  const status = document.querySelector('#portfolio-status');
  const meta = document.querySelector('#created-portfolio-meta');
  const openButton = document.querySelector('#open-created-portfolio');
  if (!portfolio || !portfolio.id) {
    status.textContent = 'Sin crear';
    meta.textContent = '';
    openButton.hidden = true;
    return;
  }
  const created = portfolio.status === 'created';
  status.textContent = created ? 'Creado localmente' : 'Borrador guardado';
  meta.textContent = created
    ? `ID ${portfolio.id} · Creado ${formatDate(portfolio.createdAt)}`
    : `Borrador actualizado ${formatDate(portfolio.updatedAt)}`;
  openButton.hidden = !created;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function updateAccountSources() {
  const count = integrationCards.filter((card) => card.classList.contains('connected')).length;
  document.querySelector('#account-sources').textContent = `${count} activa${count === 1 ? '' : 's'}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function derivePassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, 256);
  return new Uint8Array(bits);
}

async function verifyPassword(password, user) {
  const hash = await derivePassword(password, base64ToBytes(user.salt));
  return constantTimeEqual(hash, base64ToBytes(user.hash));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

const existingUser = getSessionUser();
if (existingUser) showDashboard(existingUser);
