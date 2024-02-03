import { FormType } from '../types/formTypes';
import { Uri } from 'semantic-link';

export interface FormItem {
    /**
     * @see https://developer.mozilla.org/pl/docs/Web/HTML/Element/Input#attr-type
     */
    readonly type?: FormType | string;
    readonly name: string;
    readonly description?: string;
    value?: string;
    /**
     * The selected attribute is a boolean attribute. When present (only on input types select), it specifies that the field
     * should be selected. A read-only input field cannot be modified.
     *
     * In the case of a single select, there should be no more than one selected
     * In the case of a multi select, any number from none to all can be selected
     */
    selected?: boolean;
    label?: string;

    /**
     *  The readonly attribute is a boolean attribute. When present, it specifies that an input field is
     *  read-only. A read-only input field cannot be modified.
     *
     *  Note: A form will still submit an input field that is readonly, but will not submit an input field that is disabled!
     *
     *  see https://www.w3schools.com/tags/att_input_readonly.asp
     */
    readonly readonly?: boolean;

    /**
     *  The disabled attribute is a boolean attribute. When present, it specifies that an input field be disabled.
     *  A disabled input field is unusable and un-clickable.
     *
     *  Note: A form will not submit an input field that is disabled.
     *
     *  see https://www.w3schools.com/tags/att_input_disabled.asp
     */
    readonly disabled?: boolean;
    /**
     * The display when in a collection
     */
    readonly order?: number;
    // html related tags
    readonly multiple?: boolean;
    readonly required?: boolean;

    /**
     *  The mandatory attribute is a boolean attribute. Used currently on group selection, when present, it specifies that an
     *  input field of a group must force a value to be selected
     *
     *  An example is a chip group.
     *  @see https://vuetifyjs.com/en/components/chip-groups/#chip-groups
     */
    readonly mandatory?: boolean;
    /**
     * The maximum (numeric or date-time) value for this item, which must not be less than its minimum (min attribute) value.
     *
     * @see https://developer.mozilla.org/pl/docs/Web/HTML/Element/Input#attr-max
     */
    readonly max?: number;
    /**
     * The minimum (numeric or date-time) value for this item, which must not be greater than its maximum (max attribute) value.
     *
     * @see https://developer.mozilla.org/pl/docs/Web/HTML/Element/Input#attr-min
     */
    readonly min?: number;
    /**
     * If the value of the type attribute is text, email, search, password, tel, or url, this attribute specifies the
     * maximum number of characters (in Unicode code points) that the user can enter; for other control types, it is
     * ignored. It can exceed the value of the size attribute. If it is not specified, the user can enter an
     * unlimited number of characters. Specifying a negative number results in the default behavior; that is, the
     * user can enter an unlimited number of characters. The constraint is evaluated only when the value of the
     * attribute has been changed.
     *
     * @see https://developer.mozilla.org/pl/docs/Web/HTML/Element/Input#attr-maxlength
     */
    readonly maxlength?: number;

    /**
     * If the value of the type attribute is text, email, search, password, tel, or url, this attribute specifies the
     * minimum number of characters (in Unicode code points) that the user can enter; for other control types, it
     * is ignored.
     *
     * @see https://developer.mozilla.org/pl/docs/Web/HTML/Element/Input#attr-minlength
     */
    readonly minlength?: number;
    /**
     * A regular expression that the control's value is checked against. The pattern must match the entire value,
     * not just some subset. Use the title attribute to describe the pattern to help the user. This attribute applies
     * when the value of the type attribute is text, search, tel, url or email; otherwise it is ignored. The regular
     * expression language is the same as JavaScript's. The pattern is not surrounded by forward slashes.
     *
     * @see https://developer.mozilla.org/pl/docs/Web/HTML/Element/Input#attr-pattern
     */
    readonly pattern?: RegExp;
    // related to validations (that may or may not be implemented)
    // aligned in with vee-validate rules
    // eslint-disable-next-line camelcase
    readonly required_if?: string;
    readonly rules?: string;

    // group collection
    readonly additionalInformation?: string;

    /**
     * A {@link FieldType.Select} or {@link FieldType.Collection} may have a set of by-value items for display
     */
    items?: FormItem[];

    /**
     * A {@link FieldType.Collection} may have a set of by-reference collection for populating items for display
     *
     * Note: this link needs to be followed by the client and treated as a {@link FeedRepresentation}
     */
    readonly id?: string | Uri;

    /**
     * A {@link FieldType.Collection} may require re-mapping the {@link FeedItemRepresentation} from title to another
     * field (eg description)
     *
     * Note: this can be passed into the {@link SparseRepresentationFactory} but see {@link SparseRepresentationFactory.defaultMappedFromFeedItemFieldName}
     */
    readonly mappedTitleFrom?: string;

    /**
     * A {@link FieldType.Collection} may require re-mapping the {@link FeedItemRepresentation} from title to another
     * field (eg description)
     *
     * Note: this can be passed into the {@link SparseRepresentationFactory} but see {@link SparseRepresentationFactory.defaultMappedTitleAttributeName}
     */
    readonly mappedTitle?: string;
}
