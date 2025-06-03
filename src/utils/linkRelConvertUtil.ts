import { instanceOfLinkSelector, RelationshipType } from 'semantic-link';


export class LinkRelConvertUtil {

    private static NameRegex = /([A-Z])/g;
    private static EMPTY = '';
    private static DASH = '-';

    /**
     * Takes an array of potentially camel-cased strings and only returns those that have a dash in
     * the form
     *
     * @example
     *   [questionType, type] --> [question-type]
     *
     * @param {string[]} array
     * @return {string[]}
     */
    public static filterCamelToDash(array: string[]): string[] {
        return (array || [])
            .filter(item => LinkRelConvertUtil.NameRegex.test(item))
            .map(item => LinkRelConvertUtil.replaceToDash(item));
    }

    /**
     * Takes an array of potentially camel-cased strings and returns all in dash form
     *
     * @example
     *   [questionType, type] --> [question-type, type]
     *
     * @param {string[]} array
     * @return {string[]}
     */
    public static camelToDash(array: string[] | string): string | string[] {
        if (typeof array === 'string') {
            return LinkRelConvertUtil.replaceToDash(array);
        }
        return array.map(item => LinkRelConvertUtil.replaceToDash(item));
    }

    /**
     * Takes a string and returns any dash string as camel-cased string
     *
     * @example
     *   question-type --> questionType
     *   type          --> type
     */
    public static dashToCamel(str: string): string {
        return str.replace(
            /(-[a-z])/g,
            $1 => $1.toUpperCase().replace(LinkRelConvertUtil.DASH, LinkRelConvertUtil.EMPTY));
    }

    /**
     * Takes a string or a Regexp and makes camel cased strings.
     *
     * @example
     *
     *      test -> test
     *      /test/ -> test
     *      /test/g -> test
     *      /create-form/ -> createForm
     *      'create-form' -> createForm
     *
     * @param rel relationship that will become the field name
     * @returns field name
     */
    public static relTypeToCamel(rel: RelationshipType | undefined, includeTitle = false): string {
        const name = LinkRelConvertUtil.relToCamel(rel);

        if (includeTitle && instanceOfLinkSelector(rel) && 'title' in rel) {
            const title = rel.title;
            if (typeof title === 'string') {
                const titleCamelCase = LinkRelConvertUtil.dashToCamel(title);
                return name + titleCamelCase.charAt(0).toUpperCase() + titleCamelCase.slice(1);
            }
        }
        return name;
    }

    private static relToCamel(rel: RelationshipType | undefined): string {
        if (!rel) {
            // broken or at least log an warning
            return '';
        }

        if (instanceOfLinkSelector(rel)) {
            rel = rel.rel;
        }

        if (typeof rel === 'string') {
            // broken. can't cater for 'create-form' - return dashToCamel
            return LinkRelConvertUtil.dashToCamel(rel);
        }

        if (rel instanceof RegExp) {
            // remove the regexp aspects eg /test/gi -> test
            const str = rel.toString().replace(/\/[gi]*/g, LinkRelConvertUtil.EMPTY);
            return LinkRelConvertUtil.dashToCamel(str);
        }

        // User has passed in a set of link rels and without resource which to pick is indeterminate
        throw new Error(`Rel type of array not parsable to be converted: '[${rel}]'`);
    }

    private static replaceToDash(item: string) {
        return item.replace(LinkRelConvertUtil.NameRegex, $1 => LinkRelConvertUtil.DASH + $1.toLowerCase());
    }

}
