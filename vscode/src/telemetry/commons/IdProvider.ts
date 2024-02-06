
export interface IdProvider {
    getUUID():Promise<string>;
}