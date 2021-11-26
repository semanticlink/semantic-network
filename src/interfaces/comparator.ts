import { LinkedRepresentation } from 'semantic-link';

export type ComparableRepresentation = LinkedRepresentation & { name?: string, id? : string }

/**
 * A set of comparators for matching resources in the network of data differencer (@link Differencer}
 *
 * @example
 *
 * Specific maters for role-filters on a report template. It requires that both the role and the filter match
 * from the link relations:
 *
 * {
 *
 *    "links": [
 *        {
 *            "rel": "Self",
 *            "href": "http://localhost:1080/role/filter/408"
 *        },
 *        {
 *            "rel": "up",
 *            "href": "http://localhost:1080/report/template/4991"
 *        },
 *        {
 *            "rel": "filter",
 *            "href": "http://localhost:1080/filter/1"
 *        },
 *        {
 *            "rel": "role",
 *            "href": "http://localhost:1080/role/11"
 *
 *    ]
 * }
 *
 *  byLinkRelation(lvalue, rvalue) {
 *      return link.matches(lvalue, /^role$/) === link.matches(rvalue, /^role$/) &&
 *          link.matches(lvalue, /^filter$/) === link.matches(rvalue, /^filter$/);
 *  }
 *
 */
export interface Comparator<T> {
    (lvalue: T, rvalue: T): boolean;
}
