import { FormRepresentation } from '../interfaces/formRepresentation';
import RepresentationUtil from './representationUtil';
import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { FormItem } from '../interfaces/formItem';
import { DocumentRepresentation } from '../interfaces/document';
import { MergeOptions } from '../interfaces/mergeOptions';
import { noopResolver } from '../representation/resourceMergeFactory';
import SparseRepresentationFactory from '../representation/sparseRepresentationFactory';
import LinkRelation from '../linkRelation';
import anylogger from 'anylogger';
import LinkRelConvertUtil from './linkRelConvertUtil';
import { FieldType } from '../types/formTypes';
import { instanceOfCollection } from './instanceOf';

const log = anylogger('FormUtil');

export class FormUtil {
    /**
     * Returns the fields that the server is willing to accept. Current it defaults to finding
     * value of the key of the field {@link FormItem.name}.
     *
     * Note: the form is of the format - the `items` list the fields that the server will accept
     * <pre>
     * {
     *  links: [],
     *  items:
     *    [
     *      {
     *          type: "",
     *          name: "",
     *          description: ""
     *      }
     *    ]
     * }
     * </pre>
     */
    public static fieldsToAccept<T, P extends keyof T = keyof T>(
        form: FormRepresentation,
        defaultFields: (P | string)[] = []): P[] {

        const fieldsFromForm = (form.items || []).map(x => x.name);
        const allFields = defaultFields?.concat(fieldsFromForm);
        const distinctFields = new Set<string>(allFields as Iterable<string>);
        return Array.from(distinctFields) as P[];
    }

    /**
     * Pick all the fields to resolve in the document at that (a) exist in the form AND (b) exist on the document itself
     * or are defaults
     * @param document
     * @param form
     * @param defaultFields
     */
    public static fieldsToResolve<T extends LinkedRepresentation | Partial<T>,
        TForm extends FormRepresentation,
        P extends keyof T = keyof T>(
        document: T,
        form: TForm,
        defaultFields: (P | string)[] = []): P[] {

        // preparation: get all the fields to return back to the API
        const fieldsToReturn = FormUtil.fieldsToAccept<T>(form, defaultFields);

        // pick all the fields as specified from the form
        const fields = RepresentationUtil.fields(document);

        // resolve
        return (fieldsToReturn ?
            fields.filter(fieldName => fieldsToReturn.includes(fieldName)) :
            fields) as P[];

    }

    /**
     * Pick all the fields to resolve in the document at that (a) exist in the form AND (b) exist on the document itself
     * or are defaults
     * @param document
     * @param form
     * @param defaultFields
     * @returns
     *
     */
    public static linksToResolve<T extends LinkedRepresentation | Partial<T>,
        TForm extends FormRepresentation,
        P extends keyof T = keyof T>(
        document: T,
        form: TForm,
        defaultFields: (P | string)[] = []): P[] {

        // preparation: get all the fields to return back to the API
        // pick only link rels that exist in the form
        // const relsToReturn = fieldsToReturn.map(field => LinkRelConvertUtil.camelToDash(field as string));
        // link relations exist as a dashed form and fields/create forms use camel case
        // return (relsToReturn ?
        //     relsToReturn.filter(fieldName => LinkUtil.matches(document as LinkedRepresentation, fieldName)) :
        //     []) as P[];

        return FormUtil.fieldsToAccept<T>(form, defaultFields)
            .map(field => LinkRelConvertUtil.camelToDash(field as string))
            .filter(fieldName => LinkUtil.matches(document as LinkedRepresentation, fieldName)) as P[];
    }

    /**
     * Find a {@link FormItem} by matching its {@link FormItem.name} against a field name. A fieldname strategy
     * is camel cased
     *
     * @see LinkRelConvertUtil.dashToCamel
     *
     * TODO: field could accept RelationshipType {@see LinkRelConvertUtil.relTypeToCamel}
     *
     * @param form
     * @param field
     */
    public static findByField(form: FormRepresentation, field: string): FormItem | undefined {
        return form.items?.find(item => item.name === field);
    }


    /**
     * A basic dirty check type function comparing an original resource with a new document.
     * @param resource original document
     * @param document updates to be made
     * @param form
     * @param defaultFields that require update
     * @returns fields to merge that actually requiring updating based on being a different value
     */
    public static fieldsRequiringUpdate<T extends LinkedRepresentation | Partial<T>,
        TForm extends FormRepresentation,
        P extends keyof T = keyof T>(
        resource: T,
        document: DocumentRepresentation<T>,
        form: TForm,
        defaultFields: (P | string)[] = []): P[] {

        const fieldsToCheck = FormUtil.fieldsToAccept<T>(form, defaultFields);

        // only return fields that are different
        return fieldsToCheck
            .filter(field => {
                // omit any fields that match
                // WARNING: This might have problems if the field is a 'multiple'    <<<<<<<<<<<<<<<< ---- please review
                return !(RepresentationUtil.getProperty(resource, field) === RepresentationUtil.getProperty(document, field as string));
            }) as P[];
    }

    /**
     * Returns a new object with only fields explicitly set in the form or default values
     * @param document
     * @param form
     * @param options
     */
    public static fieldsToReturnFromForm<T extends LinkedRepresentation | Partial<T>>(
        document: T,
        form: FormRepresentation,
        options?: MergeOptions): DocumentRepresentation {


        const { defaultFields } = { ...options };
        const fieldsToResolve = FormUtil.fieldsToResolve(document, form, defaultFields);

        const doc = {} as DocumentRepresentation;
        for (const field of fieldsToResolve) {
            doc[field as string] = RepresentationUtil.getProperty(document, field);
        }
        return doc;
    }

    /**
     * A {@link FormItem} can have a lazy loaded {@link FieldType.Collection} on a {@link FieldType.Select} where the
     * {@link FormItem.id} is set to the uri of the collection that is resolved via an optional {@link MergeOptions.resourceResolver}.
     * This collection may or may not be resolved at the same time via an optional {@link MergeOptions.resolver}.
     *
     * Note: there is a current implicit polymorphism to be resolved. The {@link FormItem.items} can be both a {@link FormItem[]}
     *       and a {@link CollectionRepresentation} where the code looks through to the Collection items.
     *
     * @param item form item that may optionally have a lazy loaded items collection
     * @param options contains the optional resolvers
     */
    public static async resolveItemsFromCollection(item: FormItem, options?: MergeOptions): Promise<void> {

        if (item.type !== FieldType.Select) {
            log.warn('Only selects form type should be called but have called %s', item.type);
        }

        // const { id, items = [], name } = item;

        if (item.id) {
            //
            const { resourceResolver = undefined, resolver = noopResolver } = { ...options };
            if (resourceResolver) {

                const uri = resolver.resolve(item.id);
                const representation = SparseRepresentationFactory.make({ uri });
                log.debug('matching items collection with resolver type \'%s\' on %s', item.name, item.id);
                const resource = await resourceResolver(item.name)(representation, options);

                if (instanceOfCollection(resource)) {
                    // put the collection onto the items.
                    // TODO: merge onto existing items
                    // TODO: workout how to deal with Collection versus FormItem[]
                    if (item.items) {
                        log.warn('Potential conflict between existing form items and merged collection');
                    }
                    item['items'] = resource as unknown as FormItem[];
                } else {
                    if (resource) {
                        log.error('Only a collection may be lazy loaded onto form items: %s', LinkUtil.getUri(resource, LinkRelation.Self));
                    } // do nothing to the items
                }
            } // else no resolver
        } // else no 'id' is just fine and do nothing

        // on a FormItem, items is optional but it is easier if instead of null, items is an empty list where the form type
        // is select
        if (!item.items) {
            item.items = [];
        }
    }


}
