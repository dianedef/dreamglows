DreamGlows helps you manage the tab clutter. Easily switch between tabs, save & restore set of tabs or windows, and more.

DreamGlows helps you manage tab clutter and be more productive.

Stash a set of tab/windows that you want to save for later and easily restore them when needed. 

Use quick switcher to search among open tabs and stashes and switch to them. Drag and drop the tabs to rearrange them with in windows or stashes.

Name stashes so you can easily remember the purpose for each set of tabs. Easily send tabs to named stashes through right click context menu.


Common usages:
- Quickly search and switch between all the open tabs and stashes
- Save the pages you've visited during your research session and restore all of them later.
- Logically group all the pages you visit often and load each group when needed.
- Easily manage existing open tabs by saving unnecessary tabs as a session.

### Project Structure

- `src` - main source.
  - `content-script` - scripts and components to be injected as `content_script`
    - `iframe` content script iframe vue3 app which will be injected into page
  - `background` - scripts for background.
  - `popup` - popup vuejs application root
    - `pages` - popup pages
  - `options` - options vuejs application root
    - `pages` - options pages
  - `setup` - Page for Install and Update extension events
    - `pages` - pages for install and update events
  - `offscreen` - extension offscreen pages, can be used for audio, screen recording etc
  - `pages` - application pages, common to all views (About, Contact, Authentication etc)
  - `components` - auto-imported Vue components that are shared in popup and options page.
  - `assets` - assets used in Vue components
- `dist` - built files
  - `chrome` - Chrome extension, can be publishd to Opera, Edge and toher chromium based browsers store etc
  - `firefox` - Firefox extension

[Web memex](http://demo.webmemex.org/?page=demoDoc_screencast)


  
help features :

rich text (foreground color, background color, bold, italic, underline, strikethrough, small, h1, h2, h3, h4, h5, h6, subscript, superscript, monospace)
syntax highlighting supporting several programming languages
images handling: insertion in the text, edit (resize/rotate), save as png file
latex math equations rendering
embedded files handling: insertion in the text, save to disk
multi-level lists handling (bulleted, numbered, to-do and switch between them, multiline with shift+enter)
simple tables handling (cells with plain text), cut/copy/paste row, import/export as csv file
codeboxes handling: boxes of plain text (optionally with syntax highlighting) into rich text, import/export as text file
execution of the code for code nodes and codeboxes; the terminal and the command per syntax highlighting is configurable in the preferences dialog; an embedded terminal is available on linux and mac os
alignment of text, images, tables and codeboxes (left/center/right/fill)
hyperlinks associated to text and images (links to webpages, links to nodes/nodes + anchors, links to files, links to folders)
spell check (using gspell)
intra application copy/paste: supported single images, single codeboxes, single tables and a compound selection of rich text, images, codeboxes and tables
cross application copy/paste (tested with libreoffice and gmail): supported single images, single codeboxes, single tables and a compound selection of rich text, images, codeboxes and tables
copying a list of files from the file manager and pasting in cherrytree will create a list of links to files, images are recognized and inserted in the text
print & save as pdf file of a selection / node / node and subnodes / the whole tree
export to html of a selection / node / node and subnodes / the whole tree
export to plain text of a selection / node / node and subnodes / the whole tree
toc generation for a node / node and subnodes / the whole tree, based on headers h1, h2, h3, h4, h5, h6 and text sections between headers collapsible
find a node, find in selected node, find in selected node and subnodes, find in all nodes
replace in nodes names, replace in selected node, replace in selected node and subnodes, replace in all nodes
iteration of the latest find, iteration of the latest replace, iteration of the latest applied text formatting
import from html file, import from folder of html files
import from plain text file, import from folder of plain text files
import from basket, cherrytree, epim html, gnote, keepnote, keynote, knowit, mempad, notecase, rednotebook, tomboy, treepad lite, tuxcards, zim
export to cherrytree file of a selection / node / node and subnodes / the whole tree
password protection (using http://www.7-zip.org/) available only for storage as single file – NOTE: while a cherrytree password protected document is opened, an unprotected copy is extracted to a temporary folder of the filesystem; this copy is removed when you close cherrytree
tree nodes drag and drop
automatic link to web page if writing the URL
automatic link to node if writing node name surrounded by [[node name]]


c) Dans update.vue, gérer les vues multiples :
```vue
<template>
  <div class="tree-views-container">
    <!-- Vue principale -->
    <div class="tree-view">
      <VueTreeDnd
        v-model="treeData"
        :component="TreeNodeContent"
        :locked="false"
        @move="handleMove"
        @zoom="handleZoom"
        @duplicate="handleDuplicate"
      />
    </div>

    <!-- Vues dupliquées -->
    <div 
      v-for="view in treeStore.activeViews"
      :key="view.id"
      class="tree-view"
    >
      <VueTreeDnd
        v-model="view.currentView"
        :component="TreeNodeContent"
        :locked="false"
        @move="handleMove"
        @zoom="(item) => handleZoom(item, view.id)"
        @duplicate="(item) => handleDuplicate(item, view.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTreeStore } from '../stores/treeStore'

const treeStore = useTreeStore()

const handleDuplicate = (item: TreeItem, viewId?: string) => {
  treeStore.createView(viewId || 'main', item)
}
</script>

<style lang="scss" scoped>
.tree-views-container {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 20px;
}

.tree-view {
  flex: 1;
  min-width: 300px;
  max-width: 500px;
}
</style>
```

3. Avantages de cette approche :
- Utilisation de Pinia pour gérer l'état global
- Chaque vue a son propre état de zoom et navigation
- Les données restent synchronisées car elles viennent du même store
- Flexibilité pour ajouter/supprimer des vues

4. Points à considérer :
- Gestion de la mémoire (limiter le nombre de vues ?)
- Performance avec plusieurs arbres
- Synchronisation des modifications entre les vues

Voulez-vous que je commence à implémenter cette solution ? Nous pouvons commencer par :
1. Mettre à jour le store
3. Modifier update.vue pour gérer les vues multiples






1. **Gestion avancée des nœuds**
- Possibilité d'ajouter des pièces jointes aux nœuds
- Support de différents types de contenu (texte riche, code, images)
- Système de tags pour une meilleure organisation

2. **Fonctionnalités de recherche**
- Recherche globale dans tous les nœuds
- Filtres avancés (par type, date, tags)
- Historique des recherches

3. **Améliorations de l'interface**
- Menu contextuel enrichi
- Raccourcis clavier personnalisables
- Système de favoris
- Breadcrumbs améliorés

4. **Gestion des sessions**
- Sauvegarde automatique
- Restauration de session
- Points de restauration

5. **Export/Import**
- Export au format PDF/HTML
- Import depuis d'autres formats
- Synchronisation avec le cloud

Votre structure actuelle avec le `treeStore` et les composants Vue est déjà bien adaptée pour intégrer ces fonctionnalités. Je suggère de commencer par :

1. Enrichir le modèle de données des nœuds :
```typescript
interface TreeNode {
  id: string;
  text: string;
  type: 'folder' | 'text' | 'code' | 'image';
  content?: string;
  tags?: string[];
  attachments?: Attachment[];
  metadata: {
    created: Date;
    modified: Date;
    favorite: boolean;
  };
  expanded: boolean;
  children: TreeNode[];
}
```

https://github.com/giuspen/cherrytree