import { FeedItemRepresentation as FIR } from 'semantic-link/lib/interfaces';

export interface FeedItemRepresentation extends FIR {
    /**
     * Last modified date of the feed item
     */
    updated?: string;
    /**
     * ETag of the feed item
     */
    eTag?: string;
}
