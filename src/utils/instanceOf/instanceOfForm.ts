import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { FormRepresentation } from '../../interfaces/formRepresentation';
import { FormItem } from '../../interfaces/formItem';
import { LinkRelation } from '../../linkRelation';

/**
 * A guard to detect whether the object is a form {@link FormRepresentation}
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfForm(object: unknown | LinkedRepresentation): object is FormRepresentation {
    // form starts off looking like a collection with 'items'
    const { items } = { ...object as FormRepresentation };

    if (items) {
        const [first]: FormItem[] = items;
        // simple check that the items has a 'type' in it
        if (first !== undefined && 'type' in first) {
            /*
             * However, there is a false match in the case of a collection that has items hydrated
             * where the resource also has an attribute with 'type'. (This isn't really either an edge case either.)
             *
             * In this case, double check that the convention of 'form' is used in the url
             *
             *    NOTE: this is very wrong because uris should be transparent
             *
             * Finally, the symptom that this solves is that collections are reloaded as singletons meaning
             * that the items have id/title loaded as attributes rather than a link relations
             *
             * TODO: work out a better type strategy
             *  @see {@link LinkRelation.CreateForm}
             *  @see {@link LinkRelation.EditForm}
             *  @see {@link LinkRelation.SearchForm}
             *  @see {@link LinkRelation.ApplyForm}
             */
            const uri = LinkUtil.getUri(object as LinkedRepresentation, LinkRelation.Self);
            if (uri) {
                return uri.includes('form')
            }
            return false;
        }
    }
    return false;
}
