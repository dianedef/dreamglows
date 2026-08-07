chrome.runtime.onInstalled.addListener(async (opt) => {
  if (opt.reason === 'install') {
    await chrome.storage.local.clear()
    
    // Initialiser les données de l'arbre
    const initialData = {
      treeDataRef: [{
        id: '1',
        text: 'Root',
        children: [
          {
            id: '1-1',
            text: 'Frontend',
            children: [
              {
                id: '1-1-1',
                text: 'Vue',
                children: [
                  {
                    id: '1-1-1-1',
                    text: 'Components',
                    children: []
                  },
                  {
                    id: '1-1-1-2',
                    text: 'Router',
                    children: []
                  }
                ]
              },
              {
                id: '1-1-2',
                text: 'React',
                children: [
                  {
                    id: '1-1-2-1',
                    text: 'Hooks',
                    children: []
                  }
                ]
              }
            ]
          },
          {
            id: '1-2',
            text: 'Backend',
            children: [
              {
                id: '1-2-1',
                text: 'Node.js',
                children: []
              },
              {
                id: '1-2-2',
                text: 'Python',
                children: []
              }
            ]
          }
        ]
      }],
      treeViews: {
        'update-view': {
          id: 'update-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: ['1', '1-1', '1-1-1', '1-1-2', '1-2'],
          selectedNodes: []
        }
      }
    }
    
    console.log('🌱 [Install] Initialisation des données:', initialData)
    await chrome.storage.local.set({ 'tree-store': JSON.stringify(initialData) })

    chrome.tabs.create({
      active: true,
      url: chrome.runtime.getURL('src/setup/index.html?type=install'),
    })
  }

  if (opt.reason === 'update') {
    chrome.tabs.create({
      active: true,
      url: chrome.runtime.getURL('src/setup/index.html?type=update'),
    })
  }
})

console.log('hello world from background')

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`
  )
}

export {}
