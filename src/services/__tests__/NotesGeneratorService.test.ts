import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesGeneratorService } from '../NotesGeneratorService';
import { DateService } from '../DateService';
import { ValidationService } from '../ValidationService';
import { StorageService } from '../StorageService';
import { DateTime } from 'luxon';
import { DateError } from '../../types/errors';

// Mock des dépendances
const mockApp = {
    vault: {
        adapter: {
            exists: vi.fn(),
            mkdir: vi.fn()
        },
        createFolder: vi.fn(),
        create: vi.fn()
    }
};

const mockSettings = {
    notesPath: 'daily-notes',
    folderStructure: 'monthly',
    noteTemplate: '# {day} {month} {MM} {DD}\n\n## Objectifs\n\n## Tâches',
    monthLanguage: 'fr'
};

describe('NotesGeneratorService', () => {
    let service: NotesGeneratorService;
    let dateService: DateService;
    let validationService: ValidationService;
    let storageService: StorageService;

    beforeEach(() => {
        // Reset des mocks
        vi.clearAllMocks();

        // Initialisation des services
        dateService = new DateService('fr');
        validationService = new ValidationService(dateService, mockSettings as GoalFlowzSettings);
        storageService = vi.fn() as unknown as StorageService;

        // Création du service à tester
        service = new NotesGeneratorService(
            mockApp as any,
            mockSettings,
            dateService,
            validationService,
            storageService
        );
    });

    describe('generateNotes', () => {
        it('devrait créer le dossier principal s\'il n\'existe pas', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(false);

            await service.generateNotes();

            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('daily-notes');
        });

        it('ne devrait pas créer le dossier principal s\'il existe déjà', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(true);

            await service.generateNotes();

            expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
        });

        it('devrait lancer une erreur si le chemin des notes n\'est pas défini', async () => {
            const serviceWithoutPath = new NotesGeneratorService(
                mockApp as any,
                { ...mockSettings, notesPath: '' },
                dateService,
                validationService,
                storageService
            );

            await expect(serviceWithoutPath.generateNotes()).rejects.toThrow('Chemin des notes non défini');
        });
    });

    describe('generateMonthNotes', () => {
        it('devrait créer un dossier mensuel en mode "monthly"', async () => {
            mockApp.vault.adapter.exists
                .mockResolvedValueOnce(true)  // dossier principal
                .mockResolvedValueOnce(false); // dossier mensuel

            const date = DateTime.fromObject({ year: 2024, month: 1 });
            await (service as any).generateMonthNotes(date);

            expect(mockApp.vault.createFolder).toHaveBeenCalledWith('daily-notes/janvier');
        });

        it('devrait générer une note pour chaque jour du mois', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(true);
            const date = DateTime.fromObject({ year: 2024, month: 1 });

            await (service as any).generateMonthNotes(date);

            // Janvier a 31 jours
            expect(mockApp.vault.create).toHaveBeenCalledTimes(31);
        });
    });

    describe('generateDayNote', () => {
        it('devrait générer une note avec le bon format de nom', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(false);
            const date = DateTime.fromObject({ year: 2024, month: 1, day: 1 });

            await (service as any).generateDayNote(date, 'daily-notes');

            expect(mockApp.vault.create).toHaveBeenCalledWith(
                'daily-notes/📓 1er janvier.md',
                expect.any(String)
            );
        });

        it('ne devrait pas générer une note si elle existe déjà', async () => {
            mockApp.vault.adapter.exists.mockResolvedValue(true);
            const date = DateTime.fromObject({ year: 2024, month: 1, day: 1 });

            await (service as any).generateDayNote(date, 'daily-notes');

            expect(mockApp.vault.create).not.toHaveBeenCalled();
        });
    });

    describe('formatNoteFileName', () => {
        it('devrait formater correctement le nom pour le 1er du mois', () => {
            const date = DateTime.fromObject({ year: 2024, month: 1, day: 1 });
            const fileName = (service as any).formatNoteFileName(date);
            expect(fileName).toBe('📓 1er janvier');
        });

        it('devrait formater correctement le nom pour les autres jours', () => {
            const date = DateTime.fromObject({ year: 2024, month: 1, day: 2 });
            const fileName = (service as any).formatNoteFileName(date);
            expect(fileName).toBe('📓 2 janvier');
        });
    });

    describe('generateNoteContent', () => {
        it('devrait remplacer tous les placeholders dans le template', () => {
            const date = DateTime.fromObject({ year: 2024, month: 1, day: 1 });
            const content = (service as any).generateNoteContent(date);

            expect(content).toBe('# 1 janvier 01-01\n\n## Objectifs\n\n## Tâches');
        });

        it('devrait gérer correctement le suffixe "er" pour le premier du mois', () => {
            const date = DateTime.fromObject({ year: 2024, month: 1, day: 1 });
            const serviceWithSuffix = new NotesGeneratorService(
                mockApp as any,
                { ...mockSettings, noteTemplate: '# {day}{suffix} {month}' },
                dateService,
                validationService,
                storageService
            );

            const content = (serviceWithSuffix as any).generateNoteContent(date);
            expect(content).toBe('# 1er janvier');
        });
    });
}); 