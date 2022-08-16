

/**
 * Known set of field types from the semantic link. Maps the representation types to the known types that
 * can be rendered (input not select at this stage)
 *
 * @see https://bootstrap-vue.js.org/docs/components/form-input
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
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
    Password = '//types/form/text/password',
    Email = '//types/form/text/email',
    Uri = '//types/form/text/uri',
    Tel = '//types/form/text/tel',
    Currency = '//types/form/text/currency',
    Color = '//types/form/color',
    Number = '//types/form/number',
    Height = '//types/form/number/height',
    Checkbox = '//types/form/check',
    Date = '//types/form/date',
    DateTime = '//types/form/datetime',
    DateRange = '//types/form/date/range',
    Week = '//types/form/date/week',
    Month = '//types/form/date/month',
    Range = '//types/form/range',
    Time = '//types/form/time',
    Select = '//types/form/select',
    Hidden = '//types/form/hidden',
    File = '//types/form/file',
    // Non-html field types
    Address = '//types/form/text/address',
    AddressPostal = '//types/form/text/address/postal',
    EmailList = '//types/form/text/email/list',
    Signature = '//types/form/signature',
    TextArea = '//types/form/text/area',
    TextHtml = '//types/form/text/html',
    // grouping field types
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
    | FieldType.AddressPostal
    | FieldType.Email
    | FieldType.EmailList
    | FieldType.Uri
    | FieldType.Currency
    | FieldType.Number
    | FieldType.Height
    | FieldType.Checkbox
    | FieldType.Date
    | FieldType.DateTime
    | FieldType.DateRange
    | FieldType.Time
    | FieldType.Select
    | FieldType.Collection
    | FieldType.Group
    | FieldType.Tel
    | FieldType.Signature;
