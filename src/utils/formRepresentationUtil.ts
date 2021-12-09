import { FormRepresentation } from '../interfaces/formRepresentation';
import { ApiOptions } from '../interfaces/apiOptions';
import anylogger from 'anylogger';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { FieldType } from '../types/formTypes';
import { ApiUtil } from '../apiUtil';

const log = anylogger('FormRepresentationUtil');

export class FormRepresentationUtil {
    /**
     *  Walks a form (items) and loads any collections
     *
     *  @example
     *
     *   {
     *     "links": [
     *       {
     *         "rel": "self",
     *         "href": "http://localhost:5000/field/o/a656927b0f/form/create"
     *       }
     *     ],
     *     "items": [
     *       {
     *         "type": "http://types/select",
     *         "name": "field",
     *         "label": "Template Field",
     *         "required": true,
     *         "items": [
     *           {
     *             id: "http://localhost:5000/organisation/4ed8e42224/information/listing/template"
     *             label: "Listing"
     *             type: "http://types/collection"
     *             items: null -->
     *                [
     *                    "links": [{
     *                      ...
     *                    }],
     *                    "name": "GivenName",
     *                    "label": Given name (Listing),
     *                    "order": 1,
     *                    categories: ['listing']
     *                  },
     *                ]
     *       },
     *     ]
     *   }
     */
    public static async getFieldCollection(form: FormRepresentation, options?: ApiOptions): Promise<FormRepresentation> {

        if (form.items){

            for (const formItem of form.items) {
                // 1. loop through all the selects inside the original select
                if (formItem.type === FieldType.Select && formItem.items) {
                    for (let field of formItem.items) {
                        // 4. on each select retrieve the 'link' collection and ensure hydrated
                        if (field.type === FieldType.Collection && field.id) {
                            // set up a field ready to retrieved via semantic network
                            const sparseFieldCollection = SparseRepresentationFactory.make({
                                uri: field.id,
                                sparseType: 'collection',
                            });

                            const fieldCollection = await ApiUtil.get(sparseFieldCollection, {
                                ...options,
                                includeItems: true,
                            });
                            // mutate original field to splice collection
                            field = Object.assign(field, fieldCollection);
                        } else {
                            log.debug('no link on %s', formItem.name);
                        }
                    }
                } else {
                    log.debug('no select on %s', formItem.name);
                }
            }
        } else {
            log.debug('form items not found');
        }


        return form
    }
}
