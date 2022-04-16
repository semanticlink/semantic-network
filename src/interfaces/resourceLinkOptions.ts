import { LinkedRepresentation, MediaType, RelationshipType, Uri } from 'semantic-link';

export interface ResourceLinkOptions {
    rel?: RelationshipType;

    /**
     * Allows for specific implementation to override the default {@link getUri} implementation from semantic link.
     * @param resource
     * @param rel
     */
    readonly getUri?: (resource: LinkedRepresentation, rel: RelationshipType) => Uri;

    readonly mediaType?: MediaType;
    readonly defaultValue?: MediaType;
}
