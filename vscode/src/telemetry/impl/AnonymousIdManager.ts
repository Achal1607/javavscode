import { env } from "vscode";

export class AnonymousIdManager {
    private machineId: string = env.machineId;
    private sessionId: string = env.sessionId;

    constructor() {
    }

    getMachineId(): string {
        return this.machineId;
    }

    getSessionId(): string {
        return this.sessionId;
    }
}