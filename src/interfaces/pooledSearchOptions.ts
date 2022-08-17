import { RelationshipType } from 'semantic-link';


/**
 * Options available using a pooled search collection
 */
export interface PooledSearchOptions {

    /**
     * The link relation on the resource used to determine the search collection to use off the context collection
     *
     * @default: {@see LinkRelation.Search}
     */
    readonly searchRel?: RelationshipType;

    /**
     * The name of the pooled collection that is attached on the context collection
     *
     * @default: {@link searchPooledPrefix}-{@link searchRel}
     */
    readonly searchName?: string;

    /**
     * The prefix used on the {@link searchName} when not specified directly
     *
     * @default: '.pooled-'
     */
    readonly searchPooledPrefix?: string;
}
