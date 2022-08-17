import { CollectionRepresentation } from 'semantic-link';
import { ResourceAssignOptions } from '../interfaces/resourceAssignOptions';
import anylogger from 'anylogger';
import { canonicalOrSelf } from '../utils/comparators/canonicalOrSelf';

const log = anylogger('CollectionMerger');
/**
 * A helper class for manipulating items in a {@link CollectionRepresentation.items}.
 */
export class CollectionMerger {
    /**
     * Omit items in the lvalue that are not in the rvalue.
     * Returns the lvalue (mutated).
     *
     * This method splices (mutates) the {@link CollectionRepresentation.items} in order to retain bindings if they exist.
     *
     * The equality operator is {@link canonicalOrSelf}.
     */
    public static omitItems<T extends CollectionRepresentation>(
        lvalue: T,
        rvalue: T,
        options?: ResourceAssignOptions): T {

        const { items } = lvalue;

        if (!items) {
            log.debug('initialised collection items');
            const { set } = { ...options };
            if (set) {
                set(lvalue, 'items', []);
            } else {
                lvalue.items = [];
            }

            return lvalue;
        }

        if (rvalue.items?.length > 0) {
            // rvalue is NOT empty
            // find all the indexes that match and sort highest to lowest
            // if not sorted, the index position changes relative to what was taken out
            /*
            const excludes = rvalue
                .items
                .map((item) => lvalue.items.findIndex(r => canonicalOrSelf(item, r)))
                .filter(x => x >= 0);
            */

            const indexes: number[] = items
                .map((item, index) => {
                    const found = rvalue.items.findIndex(r => canonicalOrSelf(item, r));
                    // when found in rvalue retain the corresponding lvalue index for removal
                    // mark -1 to those that are not to bbe removed
                    return found >= 0 ? -1 : index;
                })
                // keep just the indexes to remove
                .filter(x => x >= 0)
                // sorted tail --> head (descending)
                .sort((a, b) => b - a);

            // removed starting from the tail each item so that indexes remain correct
            for (const index of indexes) {
                lvalue.items.splice(index, 1);
            }
        } else {
            // clear out the list because rvalue is empty
            lvalue.items.splice(0, lvalue.items.length);
        }
        return lvalue;
    }
    /**
     * Extract items in the rvalue that are not in the lvalue to extend the lvalue.
     * Returns the lvalue (mutated).
     *
     * This method splices (mutates) the {@link CollectionRepresentation.items} in order to retain bindings if they exist.
     *
     * The equality operator is {@link canonicalOrSelf}.
     */
    public static extractItems<T extends CollectionRepresentation>(
        lvalue: T,
        rvalue: T,
        options?: ResourceAssignOptions): T {
        const { items } = lvalue;

        if (!items) {
            log.debug('initialised collection items');
            const { set } = { ...options };
            if (set) {
                set(lvalue, 'items', []);
            } else {
                lvalue.items = [];
            }
            return lvalue;
        }

        if (rvalue.items) {
            // create a set of items in rvalue that don't exist
            const include = rvalue
                .items
                .filter(item => items.findIndex(r => canonicalOrSelf(item, r)) < 0);

            // add into the set at the tail
            lvalue.items.splice(lvalue.items.length, 0, ...include);
        }
        return lvalue;
    }
    /**
     * Return a lvalue
     *  1. items that
     *   - only has items found in rvalue
     *   - where the lvalue already had a value leave the original lvalue item in place.
     *  2. links in the lvalue with any new rvalue links
     *
     *  The equality operator is {@link canonicalOrSelf}.
     *
     * Note: the identity operator does not need to know about {@link StateEnum}
     */
    public static merge<T extends CollectionRepresentation>(
        lvalue: T,
        rvalue: T,
        options?: ResourceAssignOptions): T {

        const { set } = { ...options };
        if (set) {
            // update the links
            // Note: currently does not update other fields from incoming representation
            // TODO: in the odd the case that a collection has attributes
            set(lvalue, 'links', rvalue.links);
        } else {
            Object.assign(lvalue.links, rvalue.links);
        }

        const omitted = this.omitItems(lvalue, rvalue, options);
        return this.extractItems(omitted, rvalue, options);
    }
}
