import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { AddItemToCollectionDirectionType } from './addItemToCollectionDirectionType';

export type AddItemToCollectionStrategy = <T extends LinkedRepresentation>(collection: CollectionRepresentation<T>, item: T, addType?: AddItemToCollectionDirectionType) => CollectionRepresentation<T>;
