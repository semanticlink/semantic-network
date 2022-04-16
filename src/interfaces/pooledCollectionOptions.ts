import { Resolver } from './resolver';
import { RelationshipType } from 'semantic-link';
import { ResourceResolver } from './resourceResolver';
import { PooledResolver } from './sync/syncOptions';

export interface PooledCollectionOptions {
    readonly resolver?: Resolver;
    readonly rel?: RelationshipType;
    readonly resourceResolver?: ResourceResolver;
    readonly pooledResolver?: PooledResolver

    /**
     * Marks a collection as read-only - you'd don't get the ability to add items
     */
    readonly readonly?: boolean;
}
