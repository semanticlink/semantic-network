import { FeedRepresentation, instanceOfLinkedRepresentation, LinkedRepresentation } from 'semantic-link';
import { instanceOfForm } from './instanceOfForm';
import { FeedItemRepresentation } from '../../interfaces/feedItemRepresentation';

export function instanceOfFeed(object: unknown | LinkedRepresentation): object is FeedRepresentation {
    // TODO: perhaps also check from feedOnly state

    if (instanceOfLinkedRepresentation(object)) {
        const asObject = object as FeedRepresentation;
        if ((asObject && Array.isArray(asObject.items) && !instanceOfForm(object))) {
            const { items } = asObject;
            const [first]: FeedItemRepresentation[] = items;
            // naive check that the items has an 'id' in it
            if (first !== undefined && 'id' in first) {
                return true;
            }
        }
    }
    return false;
}
