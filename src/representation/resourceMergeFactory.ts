import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { MergeOptions } from '../interfaces/mergeOptions';
import { LinkRelation } from '../linkRelation';
import { ResourceResolver } from '../interfaces/resourceResolver';
import anylogger from 'anylogger';
import { DocumentRepresentation } from '../interfaces/document';
import { Tracked } from '../types/types';
import { Resolver } from '../interfaces/resolver';
import { FormUtil } from '../utils/formUtil';
import { FieldResolverUtil } from '../utils/fieldResolverUtil';
import { FieldLinksResolverUtil } from '../utils/fieldLinksResolverUtil';

export const noop = (): void => {
};
export const noopResolver: Resolver = {
    resolve: _ => _,
    remove: noop,
    add: noop,
    update: noop,
};

export const noopResourceResolver: ResourceResolver = () => async () => undefined;

const log = anylogger('ResourceMerger');

/**
 * Processes difference sets (created, update, delete) for between two client-side collections {@Link CollectionRepresentation}
 *
 */
export class ResourceMergeFactory {

    public static async createMerge<T extends DocumentRepresentation>(
        resource: T,
        form: FormRepresentation,
        options?: MergeOptions): Promise<DocumentRepresentation> {
        return await this.merge(resource, form, options);
    }

    /**
     * A three-way merge between a form resource and existing {@link LinkedRepresentation}
     * client-side representation within the api network of data and a new {@Link LinkedRepresentation} document.
     *
     * Use option {@link EditMergeOptions.undefinedWhenNoUpdateRequired} to return undefined
     * when no update is required
     *
     * The basic merge is:
     *      1. remove any fields document representation that are not field items in the form
     *      2. merge the document into the client-side representation
     * @param resource a clean over-the-wire version
     * @param document any updates
     * @param form required to specify the merge fields
     * @param options
     */
    public static async editMerge<T extends Tracked | LinkedRepresentation,
        TForm extends FormRepresentation,
        TField extends Extract<keyof Omit<T, 'links'>, string>>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        form: TForm,
        options?: MergeOptions): Promise<T | undefined> {

        const {
            undefinedWhenNoUpdateRequired = true,
            defaultFields,
        } = { ...options };

        const newDocument = await this.merge(document, form, options);

        // return undefined if the flag is on and there are no updates
        if (undefinedWhenNoUpdateRequired) {
            // now check if the two resources are actually different based on matching only fields that need to be returned
            const fieldsToUpdate = FormUtil.fieldsRequiringUpdate<T, TForm>(resource, newDocument, form, defaultFields as TField[]);

            if (fieldsToUpdate?.length > 0) {
                log.debug(
                    'Update required on \'%s\': [different fields \'%s\']',
                    (newDocument as any).name || LinkUtil.getUri(document as LinkedRepresentation, LinkRelation.Self),
                    fieldsToUpdate.join(',')
                );
                return newDocument as unknown as T;
            } else {
                return undefined;
            }
        } else {
            return newDocument as unknown as T;
        }
    }

    /**
     * Makes the new document with all links and fields resolved.
     * @param document
     * @param form
     * @param {MergeOptions} options?
     * @return {Promise.<*>|Promise} containing the document updates to be merged
     * @private
     */
    private static async resolveLinksAndFields<T extends LinkedRepresentation | Partial<T>>(
        document: T,
        form: FormRepresentation,
        options?: MergeOptions): Promise<DocumentRepresentation> {

        // step : merge links relations into fields
        const resolvedDocument = await FieldResolverUtil.resolveFields(document as DocumentRepresentation, form, options);
        const resolvedLinks = await FieldLinksResolverUtil.resolveLinks(document, form, options);
        // step : merge all fields together as a document
        return { ...resolvedDocument, ...resolvedLinks } as DocumentRepresentation;
    }

    /**
     * A merge between the a form resource and an existing resource. It merges based on
     * both attributes and link relations in a resource
     *
     * Example One:
     *
     * form fields:
     *   'name', 'job', 'relates'
     *
     * resource:
     * {
     *    links: [
     *      { rel: 'Self', href: 'http://example.com/item/1' },
     *      { rel: 'relates', href: 'http://example.com/job/1' },
     *    ],
     *    name: 'this',
     *    job: 'that'
     *    type: '1'
     *  }
     *
     *  result:
     *  {
     *      relates: 'http://example.com/job/1',
     *      name: 'this',
     *      job: 'that'
     *  }
     *
     *
     * The resolver will match against fields and return a value. This is used
     * for example with the 'relates' attribute to return a href reference to the parent resource
     *
     * Example Two: '//types/form/collection'
     *
     * form fields:
     *   {
     *
     *    "links": [
     *        {
     *            "rel": "Self",
     *            "href": "http://localhost:1080/page/form/edit"
     *        }
     *    ],
     *    "items": [
     *        {
     *            "type": "//types/form/text",
     *            "name": "title",
     *            "description": "The title of the survey"
     *        },
     *        {
     *            "type": "//types/form/collection",
     *            "name": "role",
     *            "description": "An optional list of roles to be granted access to the page"
     *        }
     *    ]
     *}
     *
     * resource:
     * {
     *    links: [
     *      { rel: 'Self', href: 'http://example.com/item/1' },
     *      { rel: 'role', href: 'http://example.com/role/1' },
     *      { rel: 'role', href: 'http://example.com/role/2' },
     *    ],
     *    title: 'this',
     *  }
     *
     *  result:
     *  {
     *      role: ['http://example.com/role/1', 'http://example.com/role2']
     *      name: 'this',
     *  }
     * Example Three: '//types/form/group'
     *
     * form fields:
     *   {
     *
     *    "links": [
     *        {
     *            "rel": "Self",
     *            "href": "http://localhost:1080/page/form/edit"
     *        }
     *    ],
     *    "items": [
     *        {
     *            "type": "//types/form/text",
     *            "name": "title",
     *            "description": "The title of the survey"
     *        },
     *        {
     *
     *           "type": "//types/form/group",
     *           "name": "textBox",
     *           "items": [
     *               {
     *                   "type": "//types/form/text",
     *                   "name": "height",
     *                   "description": "The height of the text box in lines"
     *               },
     *               {
     *                   "type": "//types/form/text",
     *                   "name": "width",
     *                   "description": "The width of the text box in characters"
     *               }
     *           ],
     *           "description": "Dimensions for a text box"
     *        }
     *    ]
     *}
     * resource:
     * {
     *    links: [
     *      { rel: 'Self', href: 'http://example.com/item/1' },
     *    ],
     *    textBox: {
     *      height: 5,
     *      width: 20
     *    }
     *  }
     *
     *  result:
     *  {
     *    textBox: {
     *      height: 5,
     *      width: 20
     *    }
     *  }
     * @param resource
     * @param form
     * @param options
     * @return the resource to be created
     */
    private static async merge<T extends LinkedRepresentation,
        TForm extends FormRepresentation>(
        resource: T | DocumentRepresentation<T>,
        form: TForm,
        options?: MergeOptions): Promise<DocumentRepresentation> {
        const resolvedDocument = await this.resolveLinksAndFields(resource, form, options);
        return FormUtil.fieldsToReturnFromForm(resolvedDocument, form, options);
    }


}

