import { Document, Representation } from '../../types/types';
import { SyncOptions } from './syncOptions';

export interface SyncResult<T extends Representation, U extends Document> {
    readonly resource: T;
    readonly document: U;
    readonly options?: SyncOptions;
}
