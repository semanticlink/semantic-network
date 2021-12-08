import { LinkedRepresentation } from 'semantic-link';
import { Document, Representation } from '../../types/types';
import { SyncResult } from './syncResult';
import { SyncInfo } from './syncInfo';

export type StrategyType = <T extends Representation, U extends Document>(syncResult: SyncResult<T, U>) => Promise<void>;

/**
 * Action to make on resource
 */
export type SyncInfoAction = 'create' | 'update' | 'delete';

export type UpdateType = {
    lVal: LinkedRepresentation;
    rVal: LinkedRepresentation;
}

export type CreateType = {
    lVal: LinkedRepresentation;
    rVal: LinkedRepresentation | undefined;
}

export type DeleteType = LinkedRepresentation;

/**
 *   An array of 4 values for the form [SyncInfo[], createlist, updatelist, deletelist].
 *
 *   Where the first collection is the collection resource grouped with the document data. The createlist is
 *   an array describing the resources created. The update list is an array that describes the resources
 *   updated. The delete list describes the resources deleted.</p>
 *
 *   The create list items are an array of two values. The first item is the new item returned from the
 *   createStrategy promise. The second item is the create data provided to the createStrategy.
 *
 *   The update list item are an array of two values. The first value is the resource from the
 *   collection resource that is provided to the updateStrategy. The second item is the update
 *   data from the document resource used to update the resource.
 *
 *   The delete list items are an array with a single value. The value is the resource from
 *   the collection resource prior to being deleted.
 */
export type SyncResultItem = {
    info: SyncInfo[],
    created: CreateType[],
    updated: UpdateType[],
    deleted: DeleteType[],
};
