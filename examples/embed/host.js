import { buildSandboxEmbedUrl } from '../../src/embed/buildSandboxEmbedUrl.ts';

const frame = document.querySelector('#netlab-frame');
const progress = document.querySelector('#progress');
const parentOrigin = window.location.origin;

frame.src = buildSandboxEmbedUrl({
  baseUrl: '/?#/networking/mtu-fragmentation',
  scenarioId: 'fragmented-echo',
  embedMode: 'compact',
  sandboxEnabled: true,
  parentOrigin,
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  switch (event.data?.type) {
    case 'sandbox-ready':
      progress.textContent = 'Sandbox ready. No edits yet.';
      break;
    case 'sandbox-edit-count-changed':
      progress.textContent = `Student has made ${event.data.count} edits.`;
      break;
    case 'sandbox-assessment-passed':
      progress.textContent = `Assessment passed with ${event.data.hintsUsed} hints.`;
      break;
    case 'sandbox-session-exported':
      progress.textContent = `Session exported (${event.data.sizeBytes} bytes).`;
      break;
  }
});
