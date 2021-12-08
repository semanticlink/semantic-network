import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { State } from '../representation/state';
import { FormRepresentation } from '../interfaces/formRepresentation';

/**
 * @see https://flaviocopes.com/http-request-headers/
 */
export type StandardResponseHeader =
    'A-IM' |
    'Accept' |
    'Accept-Charset' |
    'Accept-Encoding' |
    'Accept-Language' |
    'Accept-Datetime' |
    'Access-Control-Request-Method' |
    'Access-Control-Request-Headers' |
    'Authorization' |
    'Cache-Control' |
    'Connection' |
    'Content-Length' |
    'Content-Type' |
    'Cookie' |
    'Date' |
    'ETag' |
    'Expect' |
    'Expires' |
    'Forwarded' |
    'From' |
    'Host' |
    'If-Match' |
    'If-Modified-Since' |
    'If-None-Match' |
    'If-Range' |
    'If-Unmodified-Since' |
    'Last-Modified' |
    'Max-Forwards' |
    'Origin' |
    'Pragma' |
    'Proxy-Authorization' |
    'Range' |
    'Referer' |
    'Server' |
    'Status' |
    'Strict-Transport-Security' |
    'TE' |
    'User-Agent' |
    'Upgrade' |
    'Vary' |
    'Via' |
    'Warning' |
    'WWW-Authenticate';


export const state = Symbol('state');

/**
 * The state object allows for an application cache of the network of data.
 */
type LocalState = { [state]: State };

/**
 * Singleton representation is a resource with indexed attributes and link relations.
 *
 * @remarks this is an alias as it is equivalent to {@link LinkedRepresentation} that everything is subclassed from.
 * @alias LinkedRepresentation
 */
export type SingletonRepresentation = LinkedRepresentation;

/**
 * Any linked representation is only ever one of the three types.
 *
 * @remarks this is used rarely
 */
export type Representation = SingletonRepresentation | CollectionRepresentation | FormRepresentation;

/**
 * A {@link Representation} that may be from across the wire or JSON file, or even constructed from memory
 */
export type Document = Representation | Partial<Representation>;

/**
 * A representation that has the state tracking object attached onto it. The state object allows for an application
 * cache of the network of data.
 */
export type TrackedRepresentation<T extends LinkedRepresentation = LinkedRepresentation> = T & LocalState;

export type Unbox<T extends LinkedRepresentation = LinkedRepresentation> =
    T extends TrackedRepresentation<CollectionRepresentation<infer U>> ?
    U :
    T extends TrackedRepresentation<infer U> ?
        U :
        T extends CollectionRepresentation<infer U> ?
            U :
        T extends LinkedRepresentation ?
            T :
            never;

/**
 * A field (key) from the form 'name' is matched to the value in the form representation items field
 */
export type FormFieldName<T extends FormRepresentation = FormRepresentation> = T['items'][number]['name'];

/**
 * A field return type should be the match the field name as the key of the field on the representation and return
 * the representations type
 */
export type FormFieldReturnType<T, K> = K extends (keyof (T)) ? T[K] : never;

export type Nullable<T> = T | undefined;


