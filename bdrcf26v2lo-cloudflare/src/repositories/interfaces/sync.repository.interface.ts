export interface ISyncRepository {
  getSavedSyncOperation(operationId: string): Promise<any | null>;
  saveSyncOperation(operationId: string, result: any): Promise<void>;
}
