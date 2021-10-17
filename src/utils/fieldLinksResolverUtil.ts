import { LinkedRepresentation, LinkUtil, Uri } from 'semantic-link';
import { FormItem } from '../interfaces/formItem';
import { MergeOptions } from '../interfaces/mergeOptions';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { LinkRelation } from '../linkRelation';
import { FormUtil } from './formUtil';
import { LinkRelConvertUtil } from './linkRelConvertUtil';
import { noopResolver } from '../representation/resourceMergeFactory';
import anylogger from 'anylogger';
import { FieldValue } from '../interfaces/fieldResolver';

const log = anylogger('FieldLinksResolverUtil');

export class FieldLinksResolverUtil {

    /**
     * On a resource, iterate through all the link relations that match the form items and resolve the reference
     * to a value and attach onto the original resource.
     *
     * Note: while this treats a link rel as a uri-list, it doesn't current support multiple resolutions
     */
    public static async resolveLinks<T extends LinkedRepresentation | Partial<T>,
        TForm extends FormRepresentation,
        TField extends Extract<keyof Omit<T, 'links'>, string>>(
        resource: T,
        form: TForm,
        options?: MergeOptions): Promise<T | undefined> {

        if (!resource) {
            log.warn('Document does not exist for form %s', LinkUtil.getUri(form, LinkRelation.Self));
            return undefined;
        }

        const { defaultFields } = { ...options };
        const linksToResolve = FormUtil.linksToResolve<T, TForm>(resource, form, defaultFields as TField[]);

        const { resourceResolver } = { ...options };
        for (const rel of linksToResolve) {
            if (resourceResolver && rel) {
                // throw new Error('Resource resolver not implemented');
                await resourceResolver(rel as string)(resource as LinkedRepresentation, options);
            }
            const fieldName = LinkRelConvertUtil.dashToCamel(rel as string);
            const formItem = FormUtil.findByField(form, fieldName);
            if (formItem) {
                const fieldValue = this.resolveFormItemToUri(resource, formItem, rel as string, options);
                if (fieldValue) {
                    (resource as any)[fieldName] = fieldValue;
                }
            }
        }
    }

    /**
     * Filters all the links on the document based on the link relations and makes into a uri-list. However, based on the
     * {@link FormItem.multiple} the uri-list may be a single (text) or multiple (array) return type.
     *
     * All uris are also resolved via optional {@link MergeOptions.resolver}
     *
     * Note: the {@link FormItem.multiple} overrides the single versus multiple and will pick the head of the array to
     * return a single uri
     *
     * @param document
     * @param formItem
     * @param rel
     * @param options?
     * @returns the resolved {@link UriListValue}
     */
    private static resolveFormItemToUri<T extends LinkedRepresentation | Partial<T>>(
        document: T,
        formItem: FormItem,
        rel: string,
        options?: MergeOptions): FieldValue {

        const { resolver = noopResolver } = { ...options };

        const links = LinkUtil.filter(document as LinkedRepresentation, rel);
        const values = links.map(link => resolver.resolve(link.href) as Uri);

        if (formItem.multiple) {
            return values;
        } else { // single
            if (values.length > 1) {
                log.warn('More than one in array, returning first');
            }
            return values[0];
        }
    }

}
