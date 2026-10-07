import { connectTufteDocument, connectTufteNavigation, connectTufteComponents, applyTufteReceipt } from './tufte-browser.mjs';

// This external module contains no application policy. Its seed is escaped JSON
// rendered by the framework; domain components are explicit module capabilities.
for (const root of document.querySelectorAll('[data-tufte-bootstrap]')) {
  const seed = JSON.parse(root.dataset.tufteBootstrap);
  const navigation = seed.navigation !== false ? connectTufteNavigation(root, { projection: seed.projection }) : null;
  const connections = [connectTufteDocument(root, { autoPatch: true, projection: seed.projection, enhanceForms: seed.forms, navigate: navigation?.navigate ?? (href => location.assign(href)) })];
  if (navigation) connections.push(navigation);
  root.addEventListener('tufte:receipt', (event) => {
    if (event.target === root && event.detail?.kind !== 'tufte.projection') applyTufteReceipt(root, event.detail);
  });
  const clearError = () => root.querySelector('[data-tufte-request-error]')?.remove();
  root.addEventListener('tufte:submit', clearError);
  root.addEventListener('tufte:navigate', clearError);
  root.addEventListener('tufte:refusal', event => {
    if (event.target !== root || event.detail?.projection || event.detail?.tile?.fields) return;
    clearError();
    const message = document.createElement('p');
    message.dataset.tufteRequestError = '';
    message.setAttribute('role', 'alert');
    message.textContent = event.detail?.message ?? 'The request could not be completed.';
    root.append(message);
  });
  const factories = Object.create(null);
  for (const [name, src] of Object.entries(seed.components ?? {})) {
    const module = await import(src);
    if (typeof module.mount !== 'function') throw new TypeError(`TUFTE component ${name} must export mount`);
    factories[name] = module.mount;
  }
  if (Object.keys(factories).length) connections.push(connectTufteComponents(root, factories));
  if (seed.workspace) {
    const { connectTufteWorkspace } = await import('./tufte-topology.mjs');
    connections.push(connectTufteWorkspace(root, { workspace: seed.workspace }));
  }
  root.dataset.tufteReady = 'true';
  root.dispatchEvent(new CustomEvent('tufte:ready', { bubbles: true }));
  // A page in the back/forward cache retains its live component state.
  addEventListener('pagehide', (event) => { if (!event.persisted) for (const connection of connections) connection.disconnect(); });
}
