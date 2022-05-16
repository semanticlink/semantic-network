import { RelationshipType } from 'semantic-link';
import anylogger from 'anylogger';

const log = anylogger('RelationshipTypeUtil');

export class RelationshipTypeUtil {

    /**
     * Takes a string or a Regexp and makes camel cased strings.
     *
     * @example
     *
     *      test -> test
     *      /test/ -> test
     *      /test/g -> test
     *      /create-form/ -> createForm
     *
     * @param {RelationshipType} rel
     * @returns {string}
     */
    public static toCamel(rel: RelationshipType): string | undefined | never {
        if (!rel) {
            return;
        }

        // at this stage
        if (Array.isArray(rel)) {
            log.debug('using first rel type from list');
            [rel] = rel;
        }

        if (typeof rel === 'string') {
            return rel;
        }


        return (
            rel
                .toString()
                // remove the regexp aspects eg 'test'' -> test
                .replace(/\/[gi]*/g, '')
                // remove all other non alpha and hyphen chars
                .replace(/[^-a-zA-Z]*/g, '')
                // replace create-form --> createForm
                .replace(/(-[a-z])/g, $1 => $1.toUpperCase().replace('-', ''))
        );

    }

}
