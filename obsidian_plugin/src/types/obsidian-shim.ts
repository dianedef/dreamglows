// Simulation des types Obsidian pour le développement
export interface App {
    workspace: {
        detachLeavesOfType: () => void;
        getRightLeaf: () => any;
        revealLeaf: () => void;
    };
    vault: {
        getFiles: () => TFile[];
        readBinary: (file: TFile) => Promise<ArrayBuffer>;
        create: (path: string, content: string) => Promise<void>;
    };
    loadData: () => Promise<any>;
    saveData: (data: any) => Promise<void>;
}

export class Plugin {
    app: App;
    constructor() {
        this.app = {
            workspace: {
                detachLeavesOfType: () => {},
                getRightLeaf: () => {},
                revealLeaf: () => {}
            },
            vault: {
                getFiles: () => [],
                readBinary: async () => new ArrayBuffer(0),
                create: async () => {}
            },
            loadData: async () => ({}),
            saveData: async () => {}
        };
    }
    addCommand() {}
    addRibbonIcon() {}
}

export class Modal {
    constructor(app: App) {}
    open() {}
    close() {}
}

export class Notice {
    constructor(message: string) {
        console.log('Notice:', message);
    }
}

export interface Command {
    id: string;
    name: string;
    callback: () => void;
    hotkeys?: Array<{
        modifiers: string[];
        key: string;
    }>;
}

export interface TFile {
    path: string;
    basename: string;
    extension: string;
} 