import { CanonicalStorage } from '../lib/canonical/storage'

const repository = new CanonicalStorage({
  get: keys => chrome.storage.local.get(keys),
  set: values => chrome.storage.local.set(values)
})

// One writer for all extension windows. Keep the message channel alive until disk acknowledgement.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.namespace !== 'dreamglows-path-v1') return false
  const request = message.action === 'load' ? repository.load()
    : message.action === 'commit' ? repository.commit(message.expectedRevision, message.tree, message.views)
    : Promise.reject(new Error('Requête DreamGlows inconnue.'))
  request.then(document => respond({ ok: true, document }), error => respond({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  return true
})

chrome.runtime.onInstalled.addListener(async (event) => {
  // Never clear storage, including when reinstalled over retained data.
  if (event.reason === 'install' || event.reason === 'update') {
    await chrome.tabs.create({ active: true, url: chrome.runtime.getURL('src/setup/index.html?type=update') })
  }
})
