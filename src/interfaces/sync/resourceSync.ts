import { StrategyType } from './types';
import { SyncOptions } from './syncOptions';
import { RelationshipType } from 'semantic-link';
import { Representation, Document } from '../../types/types';

export interface ResourceSync<T extends Representation = Representation, U extends Document = Document> {
    readonly resource: T;
    readonly document: U;
    readonly strategies?: StrategyType[];
    readonly options?: SyncOptions;
    /**
     * Link rel on the parent (ie context) resource to be followed
     */
    readonly rel?: RelationshipType;
    /**
     * The attribute name of the named resource that is added to the in-memory resource. This is an override value
     * where the default is a stringly-type of {@link rel}.
     */
    readonly name?: string;
}
