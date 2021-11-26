

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
    Text = 'http://types/text',
    TextArea = 'http://types/text/area',
    TextHtml = 'http://types/text/html',
    Password = 'http://types/text/password',
    Address = 'http://types/text/address',
    Email = 'http://types/text/email',
    EmailList = 'http://types/text/email/list',
    Uri = 'http://types/text/uri',
    Tel = 'http://types/text/tel',
    Currency = 'http://types/text/currency',
    Number = 'http://types/number',
    Height = 'http://types/number/height',
    Checkbox = 'http://types/check',
    Date = 'http://types/date',
    DateTime = 'http://types/datetime',
    Select = 'http://types/select',
    Hidden = 'http://types/hidden',
    Signature = 'http://types/signature',
    // Non-html field types
    Collection = 'http://types/collection',
    Group = 'http://types/group',
    //
    Enum = 'http://types/enum'
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
