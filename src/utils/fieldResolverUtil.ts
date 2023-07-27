import { instanceOfLinkedRepresentation, LinkedRepresentation, LinkUtil, Uri } from 'semantic-link';
import { DocumentRepresentation } from '../interfaces/document';
import { FormItem } from '../interfaces/formItem';
import { MergeOptions } from '../interfaces/mergeOptions';
import { FieldType } from '../types/formTypes';
import { LinkRelation } from '../linkRelation';
import anylogger from 'anylogger';
import { FormUtil } from './formUtil';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { noopResolver } from '../representation/resourceMergeFactory';
import { instanceOfCollection } from './instanceOf/instanceOfCollection';
import { instanceOfDocumentRepresentationGroup } from './instanceOf/instanceOfDocumentRepresentationGroup';
import { instanceOfDocumentRepresentation } from './instanceOf/instanceOfDocumentRepresentation';
import { instanceOfUriListValue } from './instanceOf/instanceOfUriListValue';
import { instanceOfSimpleValue } from './instanceOf/instanceOfSimpleValue';
import { FieldValue, ResourceValue, UriListValue } from '../interfaces/fieldResolver';

const log = anylogger('FieldResolverUtil');

/**
 * An enumeration across the return type from a form field
 */
enum FieldValueType {
    /**
     * The value is single
     */
    single,
    /**
     * The value is contained in an array
     *
     * Note: this closely aligns with the {@link FormItem.multiple} flag when set of the {@link FieldType.Select}
     */
    multiple,
    /**
     * The value is contained in an object
     */
    group
}

/**
 * Mapping strategy between the across-the-wire field types and internal types
 *
 * TODO: this needs to be injectable/extendable
 */
function formType(formItem: FormItem): FieldValueType {
    switch (formItem.type) {
        case FieldType.Select:
            return FieldValueType.multiple;
        case FieldType.Group:
        case FieldType.Collection:
            return FieldValueType.group;
        case FieldType.Text:
        case FieldType.TextArea:
        case FieldType.Password:
        case FieldType.Address:
        case FieldType.Email:
        case FieldType.Uri:
        case FieldType.Currency:
        case FieldType.Number:
        case FieldType.Height:
        case FieldType.Checkbox:
        case FieldType.Date:
        case FieldType.DateTime:
        case FieldType.Tel:
        case FieldType.EmailList:
        case FieldType.Signature:
        case FieldType.AddressPostal:
        default:
            return FieldValueType.single;
    }
}

export class FieldResolverUtil {


    /**
     * Recursive, resolving merger that adds fields to a document based on a (create or edit) form
     * and the allowed fields with their type.
     *
     * Note: field names are converted to tracked names
     */
    public static async resolveFields<T extends DocumentRepresentation,
        TForm extends FormRepresentation,
        TField extends Extract<keyof T, string>>(
        document: DocumentRepresentation,
        form: TForm,
        options?: MergeOptions): Promise<DocumentRepresentation> {

        const { defaultFields } = { ...options };

        // pick all the fields as specified from the form
        const fieldsToResolve = FormUtil.fieldsToResolve(document, form, defaultFields as TField[]);

        for (const field of fieldsToResolve) {
            // find out whether there is a matching field in the form to the link relation
            const formItem = FormUtil.findByField(form, field as string);
            if (formItem) {
                const fieldValue = await this.resolve(document[field as string] as FieldValue, formItem, options);
                if (fieldValue) {
                    const { fieldResolver } = { ...options };
                    log.debug('resolving field %s', field);
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore TS2538: Type 'Omit ' cannot be used as an index type.
                    (document)[field] = fieldResolver ?
                        fieldResolver(field as string, fieldValue, options) :
                        fieldValue;
                } else {
                    // an undefined result adds 'undefined' to field rather than remove
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore TS2538: Type 'Omit ' cannot be used as an index type.
                    document[field] = fieldValue;
                    // catering 'false' which would log this error (probably do !! on if)
                    if (fieldValue === undefined || fieldValue === null) {
                        log.warn('Field \'%s\' is not resolved', field);
                    }
                }
            } else {
                log.info('Field \'%s\' is not matched in form', field);
            }
        }
        return document;
    }

    /**
     * Takes an incoming polymorphic field ({@link SimpleValue}, {@link UriListValue} or {@link ResourceValue}) and
     * checks if its value is valid against the form. To do this, it will also resolve fields if necessary.
     *
     * Resolutions are performed via injected {@link MergeOptions.resolver} and {@link MergeOptions.resourceResolver}
     *
     * @param fieldValue
     * @param item
     * @param options?
     */
    public static async resolve<T extends FieldValue>(
        fieldValue: T,
        item: FormItem,
        options?: MergeOptions): Promise<T | undefined> {

        const { resolver = noopResolver } = { ...options };

        const field = await this.resolveByType(fieldValue, item, options);
        if (field && instanceOfSimpleValue(field)) {
            return resolver.resolve(field as Uri) as T;
        } else if (instanceOfUriListValue(field)) {
            return field.map(uri => resolver.resolve(uri)) as T;
        }

        // else field was not resolved by type because it is resource
        if (instanceOfLinkedRepresentation(fieldValue)) {
            const resource = await this.resolveResource(fieldValue, item, options);
            if (resource) {
                // resource was found in a pooled collection and return uri (resolved)
                const uri = LinkUtil.getUri(resource, LinkRelation.Self);
                if (uri) {
                    return resolver.resolve(uri) as T;
                }
            }
        }

        log.debug('Field type unknown - returning default value');
        return fieldValue;
    }

    /**
     * Resolves any {@link FormItem.id} as a {@link LinkedRepresentation} when there is a {@link MergeOptions.resourceResolver}.
     *
     * Note:
     *  - current strategy to resolve on the title of the Canonical on the field value.
     *  - there is no placement of the resolution onto the item
     *
     * @param formItem form item to process for resolution
     * @param fieldValue
     * @param options
     */
    public static async resolveResource<T extends ResourceValue>(fieldValue: T, formItem: FormItem, options?: MergeOptions): Promise<T> {

        const {
            resourceResolverRelNameStrategy = this.resourceResolverRelNameStrategy,
            resourceResolver,
        } = { ...options };
        const relName = resourceResolverRelNameStrategy(fieldValue as LinkedRepresentation);

        if (relName) {
            const item = formItem.items?.find(x => x.name === relName);
            if (item) {
                if (item.id) {
                    if (resourceResolver) {
                        log.debug('matching items collection with resolver relName \'%s\' on %s', relName, formItem.id);
                        return await resourceResolver(relName)(fieldValue as LinkedRepresentation, options) as T;
                    } // else no resolver
                } else {
                    log.debug('form item might expected \id\ attribute of resource');
                }
            } // else no matching relName in form item
        } else {
            log.bind('rel name strategy did not return name on %s', LinkUtil.getUri(fieldValue as LinkedRepresentation, LinkRelation.Self));
        }

        return fieldValue;
    }

    /**
     *
     * Strategy is to resolve the lookup key as the title from the Canonical link relation
     * @param resource field resource being resolved
     */
    public static resourceResolverRelNameStrategy(resource: LinkedRepresentation): string | undefined {
        return LinkUtil.getTitle(resource, LinkRelation.Canonical);
    }

    /**
     * If a {@link MergeOptions.resolver} has been provided then there is potentially a pooled resource available
     * requiring resolution
     *
     * @param fieldValue
     * @param item
     * @param options contains the resolver to be used
     */
    public static async resolveByPooled<T extends FieldValue>(fieldValue: T, item: FormItem, options?: MergeOptions): Promise<FieldValue> {
        const { resolver = noopResolver } = { ...options };

        if (instanceOfSimpleValue(fieldValue)) {
            return resolver.resolve(fieldValue as Uri) as T;
        } else if (instanceOfUriListValue(fieldValue)) {
            return fieldValue.map(uri => resolver.resolve(uri)) as T;
        } else if (instanceOfLinkedRepresentation(fieldValue)) {
            const resource = await this.resolveResource(fieldValue, item, options);
            if (resource) {
                // resource was found in a pooled collection and return uri (resolved)
                const uri = LinkUtil.getUri(resource, LinkRelation.Self);
                if (uri) {
                    return await this.resolveByPooled(uri, item, options);
                }
            }
        }

        log.debug('Field type unknown - returning default value');
        return fieldValue;
    }

    /**
     *
     * @param fieldValue
     * @param formItem
     * @param options
     */
    public static async resolveByType<T extends FieldValue>(
        fieldValue: T,
        formItem: FormItem,
        options?: MergeOptions): Promise<T | undefined> {

        switch (formType(formItem)) {
            case FieldValueType.single: // could have checks to ensure this is a 'text' or 'uri' or object (but not array)
                if (fieldValue && !instanceOfSimpleValue(fieldValue) && !(typeof fieldValue === 'object')) {

                    log.warn('Unexpected type \'%s\' on form type %s with \'%s\'', typeof fieldValue, formItem.type, formItem.name);
                    return undefined;
                }
                if (formItem.multiple) {
                    log.warn('Unexpected attribute \'multiple\' on form type %s with \'%s\'', formItem.type, formItem.name);
                }

                return fieldValue;

            /**
             * Type: //types/form/select, moves through the structure
             */
            case FieldValueType.multiple:

                await FormUtil.resolveItemsFromCollection(formItem, options);
                // TODO: all resolutions must be on the outside
                let value = await this.findValueInItems(formItem, fieldValue, options);

                if (!value && instanceOfDocumentRepresentation(fieldValue)) {
                    const { resourceResolver } = { ...options };
                    if (resourceResolver) {
                        value = await resourceResolver(formItem.name)(fieldValue as LinkedRepresentation, options);
                    }
                }

                // check the value returned needs to be an enumeration.
                if (formItem.multiple) {
                    // return back an Uri[] removing all undefined to meet {@link UriListValue}
                    return ((instanceOfSimpleValue(value) ? [value] : value) as Uri[])
                        .filter(x => !!x) as unknown as T;
                    // check that the value is part of the provided items enumeration in the form
                } else {
                    // undefined is acceptable as it is {@link SimpleValue}
                    return value as unknown as T;
                }

            /**
             * Type: //types/form/group, recursively moves through the structure
             *
             * note: groups have an items (but unlike //types/form/select) it is dealt with as part
             *       of the recursion structure of a form item
             */
            case FieldValueType.group:
                if (formItem.multiple) {
                    if (instanceOfDocumentRepresentationGroup(fieldValue)) {
                        return (await Promise.all(
                            fieldValue.map(async value => {
                                if (value) {
                                    return await this.resolveFields(value, formItem as unknown as FormRepresentation, options);
                                } // else return undefined
                            })))
                            // remove any undefined
                            .filter(x => !!x) as T;
                    } else {
                        log.error('Group with multiple must be implemented as an array of Document Representation');
                    }
                } else {
                    if (!instanceOfDocumentRepresentation(fieldValue)) {
                        log.warn('Group must be implemented a DocumentRepresentation');
                    }
                    // otherwise it is a single group and resolve treating the object as a LinkedRepresentation
                    // throw new Error('Group not implemented');
                    return await this.resolveFields(fieldValue as DocumentRepresentation, formItem as unknown as FormRepresentation, options) as T;
                }
                break;
            default:
                log.warn('Unknown form type \'%s\' on \'%s\'', formItem.type, formItem.name);
                return undefined;
        }
    }

    /**
     * Matches a field value against the form items switching across {@link FieldValue} type.
     *
     *  - {@link SimpleValue} - look through the list by value
     *  - {@link UriListValue} - look across the list by value
     *  - {@link ResourceValue} - look into the resource's {@link LinkRelation.Canonical} to locate the 'title'
     *
     * @param formItem a form item (with items eager loaded)
     * @param fieldValue
     * @param options
     */
    private static async findValueInItems(formItem: FormItem, fieldValue: FieldValue, options?: MergeOptions): Promise<FieldValue | undefined> {

        // design here to load items outside of this function
        if (fieldValue && formItem?.items) {
            if (instanceOfSimpleValue(fieldValue)) {
                if (formItem.items.some(item => item.value === fieldValue)) {
                    return fieldValue;
                }
            } else if (instanceOfUriListValue(fieldValue)) {
                return await Promise.all(fieldValue.map(async val => await this.findValueInItems(formItem, val, options)) as unknown as UriListValue);
            } else if (instanceOfDocumentRepresentation(fieldValue)) {

                // a lazy-loaded set of items is currently loaded from a collection
                if (instanceOfCollection(formItem.items)) {
                    if (instanceOfLinkedRepresentation(fieldValue)) {
                        const uri = LinkUtil.getUri(fieldValue as LinkedRepresentation, LinkRelation.Self);
                        if (uri) {
                            if (formItem.items.items.some(item => LinkUtil.getUri(item, LinkRelation.Self) === uri)) {
                                return uri; // return type Uri
                            } // else fall through to return undefined
                        } else {
                            log.warn('Field value not a linked representation');
                        }
                    } // else fall through to return undefined
                } else {
                    if (Array.isArray(formItem.items)){
                        log.debug('Form items already loaded or recursively nothing to load: count \'%s\'', formItem.items?.length);
                    } else {
                        log.warn('Form items type not found \'%s\'', typeof fieldValue);
                    }

                    // else fall through to return undefined
                }
            } else {
                log.error('Field value type not found \'%s\'', typeof fieldValue);
                // else fall through to return undefined
            }
        } else {
            log.warn('No items on form \'%s\'', formItem.name);
            // else fall through to return undefined
        }
        log.debug('Value \'%s\' is not found on \'%s\' - still allowing value', fieldValue, formItem.name);
        return undefined;
    }

}
