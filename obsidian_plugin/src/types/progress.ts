export interface ProgressInfo {
    current: number;
    total: number;
    message: string;
    percentage: number;
}

export class ProgressTracker {
    private abortController = new AbortController();
    private current = 0;
    private total = 0;
    private message = '';

    constructor(private onProgress: (progress: ProgressInfo) => void) {}

    setTotal(total: number, message = '') {
        this.total = total;
        this.message = message;
        this.notifyProgress();
    }

    increment(message?: string) {
        this.current = Math.min(this.current + 1, this.total);
        if (message) {
            this.message = message;
        }
        this.notifyProgress();
    }

    private notifyProgress() {
        const percentage = this.total > 0 ? Math.min(Math.round((this.current / this.total) * 100), 100) : 0;
        this.onProgress({
            current: this.current,
            total: this.total,
            message: this.message,
            percentage
        });
    }

    abort() {
        this.abortController.abort();
    }

    get signal() {
        return this.abortController.signal;
    }
} 