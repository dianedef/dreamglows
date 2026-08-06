const FR_NOTE_TEMPLATE = `---
date: {year}-{MM}-{DD}
---
# {year}

## 🎯 Objectifs atteints

## 📝 Journal

## 📊 Bilan de la journée
`;

const EN_NOTE_TEMPLATE = `---
date: {year}-{MM}-{DD}
---
# {year}

## 🎯 Goals Achieved

## 📝 Diary

## 📊 Daily Review
`;

export const getDefaultTemplate = (language: 'fr' | 'en'): string => {
    return language === 'fr' ? FR_NOTE_TEMPLATE : EN_NOTE_TEMPLATE;
}; 