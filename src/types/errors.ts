import { z } from 'zod';

export class GoalFlowzError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ValidationError extends GoalFlowzError {
    constructor(message: string, public readonly details: string) {
        super(`${message}: ${details}`);
    }

    static fromZodError(error: z.ZodError): ValidationError {
        return new ValidationError(
            'Erreur de validation',
            error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        );
    }
}

export class StorageError extends GoalFlowzError {
    constructor(message: string, cause?: Error) {
        super(message, cause);
    }
}

export class ParsingError extends GoalFlowzError {
    constructor(message: string, public readonly content?: string) {
        super(message);
    }
}

export class DateError extends Error {
    constructor(message: string, public readonly date: string) {
        super(message);
        this.name = 'DateError';
    }
}

export class ConsistencyError extends GoalFlowzError {
    constructor(message: string, public readonly entityId: string) {
        super(`${message} (ID: ${entityId})`);
    }
}

export class EventError extends GoalFlowzError {
    constructor(message: string, public readonly eventType: string) {
        super(`${message} (Type: ${eventType})`);
    }
}

export class MetricsError extends GoalFlowzError {
    constructor(message: string, public readonly metricName: string) {
        super(`${message} (Métrique: ${metricName})`);
    }
}

export class NotesGenerationError extends Error {
    constructor(
        message: string, 
        public readonly code: NotesErrorCode,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'NotesGenerationError';
    }
}

export enum NotesErrorCode {
    PATH_NOT_DEFINED = 'PATH_NOT_DEFINED',
    PATH_INVALID = 'PATH_INVALID',
    PATH_TOO_LONG = 'PATH_TOO_LONG',
    FOLDER_CREATION_FAILED = 'FOLDER_CREATION_FAILED',
    FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
    FILE_CREATION_FAILED = 'FILE_CREATION_FAILED',
    INVALID_DATE = 'INVALID_DATE',
    TEMPLATE_ERROR = 'TEMPLATE_ERROR',
    USER_CANCELLED = 'USER_CANCELLED'
}

// Fonction utilitaire pour gérer les erreurs
export function handleError(error: unknown): GoalFlowzError {
    if (error instanceof GoalFlowzError) {
        return error;
    }

    if (error instanceof z.ZodError) {
        return ValidationError.fromZodError(error);
    }

    if (error instanceof Error) {
        return new GoalFlowzError(error.message, error);
    }

    return new GoalFlowzError('Une erreur inconnue est survenue');
}

// Types pour la gestion des erreurs
export type ErrorHandler = (error: GoalFlowzError) => void;

export interface ErrorContext {
    source: string;
    action: string;
    data?: unknown;
}

// Fonction pour enrichir les erreurs avec du contexte
export function enrichError(error: GoalFlowzError, context: ErrorContext): GoalFlowzError {
    const enrichedMessage = `[${context.source}][${context.action}] ${error.message}`;
    const enrichedError = new error.constructor(enrichedMessage) as GoalFlowzError;
    
    if ('details' in error) {
        (enrichedError as ValidationError).details = (error as ValidationError).details;
    }
    if ('content' in error) {
        (enrichedError as ParsingError).content = (error as ParsingError).content;
    }
    if ('date' in error) {
        (enrichedError as DateError).date = (error as DateError).date;
    }
    if ('entityId' in error) {
        (enrichedError as ConsistencyError).entityId = (error as ConsistencyError).entityId;
    }
    if ('eventType' in error) {
        (enrichedError as EventError).eventType = (error as EventError).eventType;
    }
    if ('metricName' in error) {
        (enrichedError as MetricsError).metricName = (error as MetricsError).metricName;
    }

    return enrichedError;
} 