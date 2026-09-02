export const siteCopy = {
  brand: 'DreamGlows',
  navigation: [
    { label: 'La méthode', href: '#methode' },
    { label: 'Le produit', href: '#produit' },
    { label: 'Les surfaces', href: '#surfaces' }
  ],
  hero: {
    eyebrow: 'Un rêve, ce n’est que le début',
    title: 'Avance vers ce qui compte.',
    lead: 'DreamGlows transforme un rêve impalpable en un chemin clair, semé d’actions compréhensibles. Nous ne mettons pas de limites à tes rêves.'
    primaryAction: { label: 'Découvrir le plugin Obsidian', href: 'https://github.com/dianedef/dreamglows' },
    secondaryAction: { label: 'Voir la méthode', href: '#methode' }
  },
  tension: {
    eyebrow: 'Du pourquoi au comment',
    title: 'Ce qui te fait rêver peut guider ce que tu fais aujourd’hui.',
    body: 'DreamGlows garde ton pourquoi au centre. Chaque objectif, chaque étape et chaque action reste relié à ce que tu veux vraiment construire, sans brider ton ambition. Tu comprends où tu vas, comment avancer et pourquoi le chemin compte pour toi.'
  },
  method: [
    { number: '01', title: 'Rêve', body: 'Nomme ce qui compte vraiment et donne une direction à tes efforts.' },
    { number: '02', title: 'Objectifs', body: 'Transforme cette direction en résultats concrets que tu peux suivre.' },
    { number: '03', title: 'Étapes clés', body: 'Découpe le chemin en étapes mesurables, assez proches pour rester motivantes.' },
    { number: '04', title: 'Tâches', body: 'Choisis la prochaine action utile et avance sans perdre le lien avec ton ambition.' }
  ],
  product: {
    eyebrow: 'Ton chemin, au même endroit',
    title: 'Comprends où tu vas. Vois comment avancer.',
    body: 'DreamGlows rassemble tes rêves, tes objectifs, tes étapes, tes actions et tes habitudes dans un même chemin. Tu ne fais pas les choses pour les cocher : tu avances parce que tu sais ce qu’elles rendent possible, sans poser de limite à l’ampleur de ton ambition.'
    features: [
      { title: 'Ton pourquoi reste visible', body: 'Chaque action garde le lien avec le rêve qui lui donne du sens.' }
      { title: 'Tu sais comment avancer', body: 'Les grandes ambitions deviennent des étapes claires et des actions compréhensibles.' },
      { title: 'Chaque progrès nourrit le suivant', body: 'Tu vois le chemin parcouru et l’élan que tu es déjà en train de créer.' }
    ]
  },
  surfaces: {
    eyebrow: 'Une vision, plusieurs surfaces',
    title: 'Commence là où tes idées vivent déjà.',
    body: 'Le plugin Obsidian est la première surface active de DreamGlows. Les expériences Chrome, Windows et Android sont en cours d’alignement autour du même langage produit.',
    items: [
      { name: 'Obsidian', status: 'Disponible', detail: 'Pilotage quotidien au cœur de tes notes.' },
      { name: 'Chrome', status: 'En préparation', detail: 'Continuité légère pendant la navigation.' },
      { name: 'Windows', status: 'En préparation', detail: 'Vue dédiée pour garder le cap.' },
      { name: 'Android', status: 'En préparation', detail: 'Prochaine action et progrès en mobilité.' }
    ]
  },
  closing: {
    eyebrow: 'Un progrès qui rayonne',
    title: 'Tes rêves vont se réaliser.',
    body: 'Commence par ce qui compte. Trace ton chemin. On ne donne pas de limites à tes rêves, juste des passages.'
    action: { label: 'Explorer DreamGlows sur GitHub', href: 'https://github.com/dianedef/dreamglows' }
  }
} as const;
