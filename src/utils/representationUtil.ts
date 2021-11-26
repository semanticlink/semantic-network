import {
    CollectionRepresentation,
    instanceOfLinkedRepresentation,
    LinkedRepresentation,
    LinkUtil,
    Uri,
} from 'semantic-link';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import anylogger from 'anylogger';
import { NamedRepresentationFactory } from '../representation/namedRepresentationFactory';
import { instanceOfCollection } from './instanceOf/instanceOfCollection';
import { Nullable, TrackedRepresentation } from '../types/types';

const log = anylogger('RepresentationUtil');

/**
 * internal type for {@link properties}
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ObjectConstructor {
    keys<T>(o: T): Extract<keyof T, string>[]
}

/**
 * Return the list of keys as a typed array from a representation.
 *
 *  see https://fettblog.eu/typescript-better-object-keys/
 *  see https://stackoverflow.com/questions/52856496/typescript-object-keys-return-string
 *
 * @param representation representation object
 * @returns array of all the field property keys
 */
export function properties<T extends LinkedRepresentation | Partial<T>,
    TField extends Omit<Extract<keyof T, string>, 'links'>>(representation: T): TField[] {
    return Object.keys(representation)
        .filter(x => x !== 'links') as unknown as TField[];
}

export function getProperty<T, K extends Extract<keyof T, string>>(o: T, propertyName: K | string): T[K] {
    return o[propertyName as K];
}

/*

export function properties<T extends LinkedRepresentation | Partial<T>, K extends Exclude<keyof T, 'links'>>(representation: T): K[] {
    return Object.keys(representation)
        .map(x => x as K)
        .filter(x => x !== 'links');
}

export function getProperty<T extends LinkedRepresentation | Partial<T>, K extends keyof Omit<T, 'links'>>(o: T, propertyName: K): T[K] {
    return o[propertyName];
}


export function getProperty22<T extends LinkedRepresentation,
    TField extends Omit<Extract<keyof T, string>, "links">>(o: T, propertyName: TField): T[TField] {
    return o[propertyName];
}
*/


type NoUndefinedOrEmptyProperties<T> = {
    [P in keyof T]-?: Exclude<T[P], null | undefined | ''>
};

/**
 * Remove fields that have empty and undefined values from the object.
 */
export function compact<T extends LinkedRepresentation>(representation: T): NoUndefinedOrEmptyProperties<T> {

    for (const field of properties(representation)) {
        // eslint-disable-next-line
        // @ts-ignore can't work out index types with Omit
        const prop = RepresentationUtil.getProperty(representation, field);
        if (prop && typeof prop === 'object' && (/*prop === '' ||*/ prop === undefined || prop === null)) {
            // eslint-disable-next-line
            // @ts-ignore really unsure how to get typing here (LinkedRepresentation need index type)
            delete representation[field];
        }
    }
    return representation as NoUndefinedOrEmptyProperties<T>;
}

/**
 * Remove fields that have empty and undefined values from the object.
 */
export function omit<T extends LinkedRepresentation,
    TField extends Extract<keyof T, string>>(representation: T, properties: TField[]): Omit<T, TField> {

    for (const property of properties) {
        delete representation[property];
    }
    return representation;
}

/**
 * Finds (by OR) a resource item in a collection identified through a found link relation or resource attribute
 * that matches an item in the collection items.
 *
 * It looks for items:
 *
 *   1. matching link relation (default: Self) by uri
 *   2. field attribute (default: name ({@link TrackedRepresentationFactory.mappedTitleAttributeName}) on a resource by string
 *
 */
export function findInCollection<T extends LinkedRepresentation>(
    collection: CollectionRepresentation<T>,
    options?: ResourceQueryOptions): Nullable<T> {

    if (!collection || !instanceOfCollection(collection)) {
        log.error(`find resource in collection failed: not an instance of collection — '${LinkUtil.getUri(collection, LinkRelation.Self, undefined)}'`);
        return undefined;
    }

    const { rel = undefined, where = undefined } = { ...options };

    let resourceIdentifier: Uri;

    if (typeof where === 'string' /* Uri */) {
        // treat predicate as Uri
        resourceIdentifier = where;
    } else if (instanceOfLinkedRepresentation(where)) {
        const uri = LinkUtil.getUri(where, rel || LinkRelation.Self);
        if (uri) {
            resourceIdentifier = uri;
        } else {
            log.error('find resource in collection failed: no \'where\' and \'rel\' options that combine to create resource identifier');
            return undefined;
        }
    } else if (Array.isArray(where)) {
        log.warn('find resource in collection failed: array cannot be assigned to where');
    } else {
        log.warn('find resource in collection failed: unknown where');
    }

    // attribute look up strategy. Used for fallback strategy 2.
    // TODO: allow for multiple link relations in underlying function
    const name = NamedRepresentationFactory.defaultNameStrategy(rel);

    // title will only exist where a resource is passed in AND there is a mapped title. Used for fallback strategy 3.
    const mappedTitleAttributeName = SparseRepresentationFactory.mappedTitleAttributeName;

    /** internal helper function to return comparable string from the property of a resource */
    function getResourceTitle(obj?: any, prop: string = mappedTitleAttributeName) {
        return obj?.[prop]?.toLowerCase();
    }

    const resourceTitle = getResourceTitle(where);

    // go through the collection and match the URI against either a link relation or attribute
    return collection
        .items
        .find(item =>
            // strategy 1: Self link of item matches
            LinkUtil.getUri(item, LinkRelation.Self) === resourceIdentifier ||
            // strategy 2: the attribute on the resource is a uri that matches
            (name && getResourceTitle(item, name) === resourceIdentifier) ||
            // strategy 3: fallback to mapped title values matching (not uris but titles)
            (resourceTitle && getResourceTitle(item) === resourceTitle)
        );
}


// TODO: inline methods
export class RepresentationUtil {
    public static fields = properties;
    public static compact = compact;
    public static omit = omit;
    public static getProperty = getProperty;
    public static findInCollection = findInCollection;

    /**
     * Removes the item from the collection by matching its Self link. If not found, it returns undefined.
     */
    public static removeItemFromCollection<T extends LinkedRepresentation>(
        collection: CollectionRepresentation<T> | TrackedRepresentation<CollectionRepresentation<T>>,
        item: T): T | undefined {

        const resourceUri = LinkUtil.getUri(item, LinkRelation.Self);
        const indexOfItemToBeRemoved = collection.items.findIndex(item => LinkUtil.getUri(item, LinkRelation.Self) === resourceUri);

        if (indexOfItemToBeRemoved >= 0) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [head, _] = collection.items.splice(indexOfItemToBeRemoved, 1);
            return head;
        }
        return undefined;
    }

    /**
     * Removes the item from the collection by matching its Self link. If not found, it returns undefined.
     */
    public static addItemToCollection<T extends LinkedRepresentation>(
        collection: CollectionRepresentation<T>,
        item: T): CollectionRepresentation<T> {

        if (collection.items) {
            collection.items.splice(collection.items.length, 0, item);
        } else {
            log.warn('Collection adding new items array, reactive bindings may fail');
            collection.items = [item];
        }
        return collection;
    }

    /**
     * Returns the first item from a collection
     *
     * TODO: this should never be used but rather look for the 'current' on links and return
     */
    public static current<T extends LinkedRepresentation>(collection: Nullable<CollectionRepresentation<T>>): T | undefined {

        if (!collection){
            return undefined;
        }

        if (instanceOfCollection(collection)) {

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [head, ...tail] = collection.items;
            return head;
        }

        return undefined;
    }
}
