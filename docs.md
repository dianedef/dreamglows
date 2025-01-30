https://thebrain.com
heyluc.com
https://optemization.com
https://bronotion.com
https://github.com/uwidev/life-disciplines-projects?source=post_page-----4f060faa651c--------------------------------
https://github.com/kaylesworth/workout-tracker?source=post_page-----4f060faa651c--------------------------------
https://github.com/jrgilbertson/lifelong-learning-system-template?source=post_page-----4f060faa651c--------------------------------
[Habit Genius](https://www.habit-genius.com/?ref=betalist)
[Timebox++ | Peta Sittek](https://www.petasittek.com/timebox-plus-plus/?utm_content=ad)
[SupaPlaner - Stay on Top of All Your Projects](https://www.supaplaner.com/?source=betalist&ref=betalist)

https://github.com/cheeaun/life

engaging quizzes that test your knowledge and boost engagement
Get insights into your audience and improve your marketing strategy.


tabflowz : http://demo.webmemex.org/?page=demoDoc_screencast

Features

Powerful project management and knowledge base solution trusted by 100K customers

Experience high-quality project management without the high cost
All YouTrack features and full technical support are provided for all license types

Projects

Tasks

AI Assistance

Knowledge Base

Agile Boards

Timesheets

Gantt Charts

Reports

Helpdesk

Workflows
Manage projects for any team
YouTrack is a project management tool packed with features that streamline your work and increase productivity on any team project. From software development and DevOps to HR and marketing, all kinds of teams can use YouTrack’s functionality to easily track and collaborate on projects of any size.




Adjusts to your needs
options for technical and non-technical users.
Powerful automation enables deep customization of YouTrack to support specific business processes.
Paid subscriptions can save up to 80% in cost of ownership compared to other project management tools.
Licenses are perpetual, starting with 15-user packs.
Cloud subscriptions are flexible with monthly or discounted annual pay-per-user payment schemes.


## calendrier

Les saisons et les trimestres ne sont pas exactement les mêmes, bien qu'ils soient souvent liés. Voici une explication :

### Saisons
Les saisons sont généralement définies comme suit dans l'hémisphère nord :
- **Printemps** : 21 mars - 20 juin
- **Été** : 21 juin - 22 septembre
- **Automne** : 23 septembre - 20 décembre
- **Hiver** : 21 décembre - 20 mars

### Trimestres
Les trimestres sont des divisions de l'année en quatre parties égales :
- **1er trimestre** : janvier, février, mars
- **2e trimestre** : avril, mai, juin
- **3e trimestre** : juillet, août, septembre
- **4e trimestre** : octobre, novembre, décembre

### Numéros de semaine
Les numéros de semaine dépendent du calendrier utilisé. Par exemple, selon la norme ISO 8601 :
- La première semaine de l'année est celle qui contient le premier jeudi de l'année.
- Les semaines sont numérotées de 1 à 52 (ou 53 dans certaines années).

Les numéros de semaine peuvent changer d'une année à l'autre, même s'ils suivent un calendrier similaire. Par exemple, le 1er janvier peut tomber un lundi une année et un vendredi l'année suivante, ce qui déplace les numéros de semaine.

### Conclusion
Donc, bien que les saisons et les trimestres soient des divisions de l'année, elles ne coïncident pas parfaitement. En ce qui concerne les numéros de semaine, même si vous utilisez le même calendrier chaque année, les numéros de semaine peuvent varier en fonction de l'année et du jour de la semaine sur lequel commence l'année.


Ah oui, excellente idée ! Cela a beaucoup plus de sens d'intégrer les goals et les tâches directement dans les notes journalières existantes. Modifions le `StorageService` pour cette nouvelle approche :

```typescript:src/services/StorageService.ts
import { App, TFile, Notice } from 'obsidian';
import { Goal } from '../types/goals';
import { Task } from '../types/tasks';
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export class StorageService {
    private app: App;
    private dataFile: string = '.obsidian/plugins/obs-GoalFlowz/data.json';

    constructor(app: App) {
        this.app = app;
    }

    private async getDailyNote(date: Date): Promise<TFile | null> {
        const formattedDate = format(date, 'yyyy-MM-dd', { locale: fr });
        const notePath = `${formattedDate}.md`;
        const file = this.app.vault.getAbstractFileByPath(notePath);
        return file instanceof TFile ? file : null;
    }

    private async createOrUpdateDailyNote(date: Date, content: string): Promise<void> {
        const formattedDate = format(date, 'yyyy-MM-dd', { locale: fr });
        const notePath = `${formattedDate}.md`;
        
        try {
            const file = await this.getDailyNote(date);
            if (file) {
                const existingContent = await this.app.vault.read(file);
                // Vérifier si la section GoalFlowz existe déjà
                const regex = /## 🎯 GoalFlowz[\s\S]*?(?=\n## |$)/;
                const newContent = existingContent.includes('## 🎯 GoalFlowz') 
                    ? existingContent.replace(regex, content)
                    : `${existingContent}\n\n${content}`;
                await this.app.vault.modify(file, newContent);
            } else {
                const newContent = `# ${format(date, 'dd MMMM yyyy', { locale: fr })}\n\n${content}`;
                await this.app.vault.create(notePath, newContent);
            }
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de la note du ${formattedDate}:`, error);
            throw error;
        }
    }

    private async saveToDataJson(data: { goals: Goal[], tasks: Task[] }): Promise<void> {
        try {
            await this.app.vault.adapter.write(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde dans data.json:', error);
            throw error;
        }
    }

    private async loadFromDataJson(): Promise<{ goals: Goal[], tasks: Task[] }> {
        try {
            const exists = await this.app.vault.adapter.exists(this.dataFile);
            if (!exists) {
                return { goals: [], tasks: [] };
            }
            const content = await this.app.vault.adapter.read(this.dataFile);
            return JSON.parse(content);
        } catch (error) {
            console.error('Erreur lors de la lecture de data.json:', error);
            return { goals: [], tasks: [] };
        }
    }

    private formatGoalForNote(goal: Goal): string {
        return [
            `- [ ] ${goal.title}`,
            `  - ID: ${goal.id}`,
            `  - Catégorie: ${goal.category}`,
            `  - Priorité: ${goal.priority}`,
            `  - Description: ${goal.description}`,
            goal.tasks.length > 0 ? `  - Tâches: ${goal.tasks.map(id => `#task-${id}`).join(', ')}` : '',
            ''
        ].filter(Boolean).join('\n');
    }

    private formatTaskForNote(task: Task): string {
        return [
            `- [ ] ${task.title}`,
            `  - ID: ${task.id}`,
            task.goalId ? `  - Objectif: #goal-${task.goalId}` : '',
            `  - Priorité: ${task.priority}`,
            task.description ? `  - Description: ${task.description}` : '',
            task.notes ? `  - Notes: ${task.notes}` : '',
            ''
        ].filter(Boolean).join('\n');
    }

    async saveGoal(goal: Goal): Promise<void> {
        try {
            // Si le goal a une date, l'ajouter à la note du jour
            if (goal.startDate && isValid(new Date(goal.startDate))) {
                const date = new Date(goal.startDate);
                const content = `## 🎯 GoalFlowz\n\n### Objectifs\n${this.formatGoalForNote(goal)}`;
                await this.createOrUpdateDailyNote(date, content);
            }

            // Sauvegarder aussi dans data.json pour la persistance globale
            const data = await this.loadFromDataJson();
            const index = data.goals.findIndex(g => g.id === goal.id);
            if (index >= 0) {
                data.goals[index] = goal;
            } else {
                data.goals.push(goal);
            }
            await this.saveToDataJson(data);

        } catch (error) {
            console.error('Erreur lors de la sauvegarde du goal:', error);
            new Notice('Erreur lors de la sauvegarde de l\'objectif');
        }
    }

    async saveTask(task: Task): Promise<void> {
        try {
            // Si la tâche a une date, l'ajouter à la note du jour
            if (task.startDate && isValid(new Date(task.startDate))) {
                const date = new Date(task.startDate);
                const content = `## 🎯 GoalFlowz\n\n### Tâches\n${this.formatTaskForNote(task)}`;
                await this.createOrUpdateDailyNote(date, content);
            }

            // Sauvegarder aussi dans data.json pour la persistance globale
            const data = await this.loadFromDataJson();
            const index = data.tasks.findIndex(t => t.id === task.id);
            if (index >= 0) {
                data.tasks[index] = task;
            } else {
                data.tasks.push(task);
            }
            await this.saveToDataJson(data);

        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la tâche:', error);
            new Notice('Erreur lors de la sauvegarde de la tâche');
        }
    }

    async loadGoals(): Promise<Goal[]> {
        try {
            // Charger les goals depuis data.json
            const { goals } = await this.loadFromDataJson();
            return goals;
        } catch (error) {
            console.error('Erreur lors du chargement des objectifs:', error);
            new Notice('Erreur lors du chargement des objectifs');
            return [];
        }
    }

    async loadTasks(): Promise<Task[]> {
        try {
            // Charger les tâches depuis data.json
            const { tasks } = await this.loadFromDataJson();
            return tasks;
        } catch (error) {
            console.error('Erreur lors du chargement des tâches:', error);
            new Notice('Erreur lors du chargement des tâches');
            return [];
        }
    }
}
```


Cette nouvelle approche offre plusieurs avantages :

1. **Intégration avec le journal** : Les goals et les tâches sont directement intégrés dans les notes journalières, ce qui permet d'avoir une vue complète de ce qui a été fait chaque jour.

2. **Double stockage intelligent** :
   - Les goals et tâches avec date sont ajoutés aux notes journalières correspondantes
   - Tous les goals et tâches (avec ou sans date) sont stockés dans `data.json` pour la persistance globale et la timeline

3. **Format lisible** :
```markdown
# 20 Mars 2024

... contenu existant de la note ...

## 🎯 GoalFlowz

### Objectifs
- [ ] Refactorer le plugin
  - ID: abc-123
  - Catégorie: Développement
  - Priorité: Haute
  - Description: Améliorer l'architecture du plugin
  - Tâches: #task-xyz-789, #task-def-456

### Tâches
- [ ] Implémenter le nouveau stockage
  - ID: xyz-789
  - Objectif: #goal-abc-123
  - Priorité: Haute
  - Description: Créer le StorageService
  - Notes: Utiliser les notes journalières
```

4. **Recherche facilitée** :
   - Les utilisateurs peuvent facilement rechercher des tâches et des objectifs via la recherche standard d'Obsidian
   - Les IDs et les liens entre goals et tâches sont maintenus via les tags (#task-id, #goal-id)

Voulez-vous que j'ajoute d'autres fonctionnalités à cette architecture ? Par exemple :
- Ajouter une section pour le statut de progression
- Inclure des liens vers d'autres notes liées
- Ajouter des statistiques journalières
