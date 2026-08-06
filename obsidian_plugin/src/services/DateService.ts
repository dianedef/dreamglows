import { DateTime, Duration, Interval } from 'luxon';
import { DateError } from '../types/errors';

export type DateFormat = 'ISO' | 'FILE' | 'DISPLAY' | 'FULL';

export class DateService {
    private static readonly FORMATS = {
        ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
        FILE: 'yyyy-MM-dd',
        DISPLAY: 'dd-MM-yyyy',
        FULL: 'EEEE d MMMM yyyy'
    };

    private notesDirectory: string;

    constructor(private locale: string = 'fr', notesDirectory: string = 'Journal') {
        // Configurer la locale par défaut
        DateTime.local().setLocale(locale);
        this.notesDirectory = notesDirectory;
    }

    getNotesDirectory(): string {
        return this.notesDirectory;
    }

    /**
     * Convertit une date en DateTime
     */
    toDateTime(date: Date | string | DateTime): DateTime {
        try {
            if (date instanceof DateTime) return date;
            if (date instanceof Date) return DateTime.fromJSDate(date);
            return DateTime.fromISO(date);
        } catch (error) {
            throw new DateError('Conversion de date impossible', date.toString());
        }
    }

    /**
     * Formate une date selon le format spécifié
     */
    format(date: Date | string | DateTime, format: DateFormat = 'DISPLAY'): string {
        try {
            const dt = this.toDateTime(date);
            return dt.setLocale(this.locale).toFormat(DateService.FORMATS[format]);
        } catch (error) {
            throw new DateError('Formatage de date impossible', date.toString());
        }
    }

    /**
     * Parse une chaîne de caractères en DateTime
     */
    parse(dateStr: string, format: DateFormat = 'FILE'): DateTime {
        try {
            return DateTime.fromFormat(dateStr, DateService.FORMATS[format], { locale: this.locale });
        } catch (error) {
            throw new DateError('Parsing de date impossible', dateStr);
        }
    }

    /**
     * Valide une date
     */
    validateDate(date: Date | string | DateTime): boolean {
        try {
            const dt = this.toDateTime(date);
            return dt.isValid;
        } catch {
            return false;
        }
    }

    /**
     * Vérifie si une date est dans une plage donnée
     */
    isInRange(date: Date | string | DateTime, start: Date | string | DateTime, end: Date | string | DateTime): boolean {
        try {
            const dt = this.toDateTime(date);
            const startDt = this.toDateTime(start);
            const endDt = this.toDateTime(end);
            return Interval.fromDateTimes(startDt, endDt).contains(dt);
        } catch {
            return false;
        }
    }

    /**
     * Retourne la date du jour
     */
    today(): DateTime {
        return DateTime.now().setLocale(this.locale).startOf('day');
    }

    /**
     * Retourne le début de la semaine
     */
    startOfWeek(date: Date | string | DateTime = this.today()): DateTime {
        return this.toDateTime(date).startOf('week');
    }

    /**
     * Retourne la fin de la semaine
     */
    endOfWeek(date: Date | string | DateTime = this.today()): DateTime {
        return this.toDateTime(date).endOf('week');
    }

    /**
     * Retourne le début du mois
     */
    startOfMonth(date: Date | string | DateTime = this.today()): DateTime {
        return this.toDateTime(date).startOf('month');
    }

    /**
     * Retourne la fin du mois
     */
    endOfMonth(date: Date | string | DateTime = this.today()): DateTime {
        return this.toDateTime(date).endOf('month');
    }

    /**
     * Calcule la durée entre deux dates
     */
    duration(start: Date | string | DateTime, end: Date | string | DateTime): Duration {
        const startDt = this.toDateTime(start);
        const endDt = this.toDateTime(end);
        return endDt.diff(startDt);
    }

    /**
     * Vérifie si deux dates sont le même jour
     */
    isSameDay(date1: Date | string | DateTime, date2: Date | string | DateTime): boolean {
        const dt1 = this.toDateTime(date1);
        const dt2 = this.toDateTime(date2);
        return dt1.hasSame(dt2, 'day');
    }

    /**
     * Ajoute une durée à une date
     */
    add(date: Date | string | DateTime, duration: Duration | { [key: string]: number }): DateTime {
        const dt = this.toDateTime(date);
        return dt.plus(duration);
    }

    /**
     * Soustrait une durée à une date
     */
    subtract(date: Date | string | DateTime, duration: Duration | { [key: string]: number }): DateTime {
        const dt = this.toDateTime(date);
        return dt.minus(duration);
    }

    /**
     * Compare deux dates
     * Retourne -1 si date1 < date2, 0 si égales, 1 si date1 > date2
     */
    compare(date1: Date | string | DateTime, date2: Date | string | DateTime): number {
        const dt1 = this.toDateTime(date1);
        const dt2 = this.toDateTime(date2);
        if (dt1 < dt2) return -1;
        if (dt1 > dt2) return 1;
        return 0;
    }

    /**
     * Retourne le numéro de la semaine
     */
    getWeekNumber(date: Date | string | DateTime = this.today()): number {
        return this.toDateTime(date).weekNumber;
    }

    /**
     * Extrait la date d'un nom de fichier
     */
    extractFromFilename(filename: string): string | null {
        const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : null;
    }

    /**
     * Retourne les jours de la semaine courante
     */
    getCurrentWeekDays(date: Date | string | DateTime = this.today()): DateTime[] {
        const currentDate = this.toDateTime(date);
        const startOfWeek = currentDate.startOf('week');
        const days: DateTime[] = [];
        
        for (let i = 0; i < 7; i++) {
            days.push(startOfWeek.plus({ days: i }));
        }
        
        return days;
    }

    /**
     * Vérifie si une date est dans le futur
     */
    isFutureDate(date: Date | string | DateTime): boolean {
        const dt = this.toDateTime(date);
        return dt > this.today();
    }

    /**
     * Vérifie si une date est aujourd'hui
     */
    isToday(date: Date | string | DateTime): boolean {
        const dt = this.toDateTime(date);
        return this.isSameDay(dt, this.today());
    }
} 