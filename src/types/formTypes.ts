

/**
 * Known set of field types from the semantic link. Maps the representation types to the known types that
 * can be rendered (input not select at this stage)
 *
 * @see https://bootstrap-vue.js.org/docs/components/form-input
 *
 *      Caveats with input types:
 *      - Not all browsers support all input types, nor do some types render in the same format across browser types/version.
 *      - Browsers that do not support a particular type will fall back to a text input type. As an example,
 *        Firefox desktop doesn't support date, datetime, or time, while Firefox mobile does.
 *      - Chrome lost support for datetime in version 26, Opera in version 15, and Safari in iOS 7. Instead
 *        of using datetime, since support should be deprecated, use date and time as two separate input types.
 *      - For date and time style input, where supported, the displayed value in the GUI may be different than what
 *        is returned by its value.
 *      - Regardless of input type, the value is always returned as a string representation.
 */
export enum FieldType {
    // html field types
    Text = '//types/form/text',
    TextArea = '//types/form/text/area',
    TextHtml = '//types/form/text/html',
    Password = '//types/form/text/password',
    Address = '//types/form/text/address',
    Email = '//types/form/text/email',
    EmailList = '//types/form/text/email/list',
    Uri = '//types/form/text/uri',
    Tel = '//types/form/text/tel',
    Currency = '//types/form/text/currency',
    Number = '//types/form/number',
    Height = '//types/form/number/height',
    Checkbox = '//types/form/check',
    Date = '//types/form/date',
    DateTime = '//types/form/datetime',
    Select = '//types/form/select',
    Hidden = '//types/form/hidden',
    Signature = '//types/form/signature',
    // Non-html field types
    Collection = '//types/form/collection',
    Group = '//types/form/group',
    //
    Enum = '//types/form/enum'
}

/**
 * The current types of form inputs that are supported from semantic link
 *
 * @remarks
 *
 * Note: these are hard coded in {@link ResourceMerger} and have avoided enums because of the mix of typescript and javascript
 */
export type FormType =
    | FieldType.Text
    | FieldType.TextArea
    | FieldType.TextHtml
    | FieldType.Password
    | FieldType.Address
    | FieldType.Email
    | FieldType.EmailList
    | FieldType.Uri
    | FieldType.Currency
    | FieldType.Number
    | FieldType.Height
    | FieldType.Checkbox
    | FieldType.Date
    | FieldType.DateTime
    | FieldType.Select
    | FieldType.Collection
    | FieldType.Group
    | FieldType.Tel
    | FieldType.Signature;
