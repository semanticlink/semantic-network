import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { LinkRelConvertUtil } from '../utils/linkRelConvertUtil';
import { LinkRelation } from '../linkRelation';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { TrackedRepresentationFactory } from './trackedRepresentationFactory';
import anylogger from 'anylogger';
import { ResourceAssignOptions } from '../interfaces/resourceAssignOptions';
import { SparseRepresentationFactory } from './sparseRepresentationFactory';
import { RepresentationUtil } from '../utils/representationUtil';
import { Nullable, TrackedRepresentation } from '../types/types';
import { LoaderJobOptions } from '../interfaces/loader';

const log = anylogger('NamedRepresentationFactory');

/**
 *
 */
type NameStrategy = (rel: RelationshipType | undefined, representation?: LinkedRepresentation) => string;

/**
 * Where the rel is multiple pick the first matched link to be converted as the name, otherwise use the given rel
 * @param rel
 * @param representation
 */
function firstLinkNameStrategy(rel: RelationshipType | undefined, representation?: LinkedRepresentation): string {
    if (representation && Array.isArray(rel)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [first, _] = LinkUtil.filter(representation, rel);
        if (first) {
            return LinkRelConvertUtil.relTypeToCamel(first);
        }
    }
    return LinkRelConvertUtil.relTypeToCamel(rel);
}

export class NamedRepresentationFactory {

    public static defaultNameStrategy: NameStrategy = firstLinkNameStrategy;

    /**
     * Manages the loading (returning) of a named resource (sub-resource collection or singleton) on a context based on
     * the {@link ResourceQueryOptions.rel}.
     *
     * Note: the naming strategy is currently not injectable but the value can be overridden {@link ResourceQueryOptions.name}
     * @see LinkRelConvertUtil.relTypeToCamel
     *
     * @see TrackedRepresentationFactory
     * @param resource context resource that has the sub-resource added (and is tracked {@link State.collection} and {@link State.singleton})
     * @param options specify the {@link ResourceQueryOptions.rel} to pick the name resource
     */
    public static async load<TReturn extends LinkedRepresentation,
        T extends LinkedRepresentation | TReturn = LinkedRepresentation,
        TResult extends TReturn = T extends TReturn ? T : TReturn>(
        resource: T,
        options?: ResourceQueryOptions & ResourceAssignOptions & LoaderJobOptions): Promise<Nullable<TrackedRepresentation<TResult>>> {
        const {
            rel = undefined,
            name = NamedRepresentationFactory.defaultNameStrategy(rel, resource),
        } = { ...options };

        if (rel && name) {
            if (TrackedRepresentationUtil.isTracked(resource, name)) {
                const namedResource = RepresentationUtil.getProperty(resource, name) as unknown as LinkedRepresentation;
                if (namedResource) {
                    log.debug('')
                    // don't just return value but ensure it has loading rules respected (eg expires)
                    return await TrackedRepresentationFactory.load(
                        namedResource,
                        { ...options, rel: LinkRelation.Self }) as TrackedRepresentation<TResult>;
                } // else fall through to undefined
                // if the resource is tracked it is very unlikely that this resource doesn't exist
                log.warn('Named resource \'%s\' on %s is undefined', name, LinkUtil.getUri(resource, LinkRelation.Self));
            } else {
                const uri = LinkUtil.getUri(resource, rel);
                if (uri) {
                    const sparse = SparseRepresentationFactory.make({ uri });
                    const namedResource = await TrackedRepresentationFactory.load(
                        sparse,
                        { ...options, rel: LinkRelation.Self });
                    if (namedResource) {
                        TrackedRepresentationUtil.add(resource, name, namedResource);
                    }
                    return namedResource as TrackedRepresentation<TResult>;
                } // else fall through to undefined
            }
        } else {
            log.warn('Named resource \'%s\' not found on %s', name, LinkUtil.getUri(resource, LinkRelation.Self));
            return Promise.reject('No named resource (or rel) specified');

        }
        return undefined;
    }
}
