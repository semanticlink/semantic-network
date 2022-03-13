import { assertThat } from 'mismatched';
import { FormItem } from '../interfaces/formItem';
import { FieldResolverUtil } from '../utils/fieldResolverUtil';
import { FieldType } from '../types/formTypes';
import { MergeOptions } from '../interfaces/mergeOptions';
import { FieldValue } from '../interfaces/fieldResolver';

describe('Form util, resolve', () => {

    describe('resolve by type', () => {

        test.each([
            ['undefined, empty form items', undefined as FieldValue, {} as FormItem, undefined as FieldValue],
            [
                'undefined, no match',
                undefined as FieldValue,
                { name: 'check', type: FieldType.Checkbox },
                undefined as FieldValue,
            ],
            [
                'single, string',
                'string value',
                { name: '', type: FieldType.Text } as FormItem,
                'string value',
            ],
            [
                'single, number',
                1,
                { name: '', type: FieldType.Text } as FormItem,
                1,
            ],
            [
                'single, multiple (form), number (logs errors and returns value)',
                1,
                { name: '', type: FieldType.Text, multiple: true } as FormItem,
                1,
            ],
            [
                'single, multiple (form), string (logs errors and returns value)',
                'a',
                { name: '', type: FieldType.Text, multiple: true } as FormItem,
                'a',
            ],
            [
                'multiple (select), single select (explicit single return result)',
                'a',
                { name: '', type: FieldType.Select, multiple: false, items: [{ value: 'a' }] } as FormItem,
                'a',
            ],
            [
                'multiple (select), single select (implicit single return result)',
                'a',
                { name: '', type: FieldType.Select, items: [{ value: 'a' }] } as FormItem,
                'a',
            ],
            [
                'multiple (select), multi select (convert single to array)',
                'a',
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a'],
            ],
            [
                'multiple (select), multi select (retain array)',
                ['a'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a'],
            ],
            [
                'multiple (select), multi select (multiple values in array)',
                ['a', 'b'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a', 'b'],
            ],
            [
                'multiple (select), multi select, no values in form returns empty array (1)',
                ['a', 'b'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [],
                } as FormItem,
                [],
            ],
            [
                'multiple (select), multi select, no values in form returns empty array (2)',
                'a',
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    // items: [],
                } as FormItem,
                [],
            ],
            [
                'multiple (address postal), multi select, no values in form returns empty array (2)',
                { label: 'a', postalCode: '0624' },
                {
                    name: 'text',
                    type: FieldType.AddressPostal,
                    multiple: false,
                    // items: [],
                } as FormItem,
                { label: 'a', postalCode: '0624' },
            ],
        ])('%s', async (title: string, fieldValue: FieldValue, formItem: FormItem, expected: FieldValue) => {
            const actual = await FieldResolverUtil.resolveByType(fieldValue, formItem);
            assertThat(actual).is(expected);
        });
    });

    describe('resolve by pooled', () => {

        test.each([
            [
                'no options returns field',
                ['a'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a'],
            ],
        ])('%s', async (title: string, fieldValue: FieldValue, formItem: FormItem, expected: FieldValue) => {
            const actual = await FieldResolverUtil.resolveByPooled(fieldValue, formItem);
            assertThat(actual).is(expected);
        });

        test.each([
            [
                'no options returns field',
                ['a'],
                {
                    name: '',
                    type: FieldType.Select,
                    multiple: true,
                    items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
                } as FormItem,
                ['a'],
            ],
        ])('%s', async (title: string, fieldValue: FieldValue, formItem: FormItem, expected: FieldValue) => {
            const actual = await FieldResolverUtil.resolveByPooled(fieldValue, formItem);
            assertThat(actual).is(expected);
        });

    });


    it('resolve resource', async () => {

        const relName = 'question';
        /** this resource requires a Canonical relation with title to resolve against */
        const fieldValue = {
            'links': [
                {
                    'rel': 'self',
                    'href': 'https://api.example.com/question/cf6c4b9c7f',
                },
                {
                    'rel': 'canonical', // <<-- resolves to this link rel
                    'href': 'https://api.example.com/question/cf6c4b9c7f',
                    'title': relName,
                },
            ],
            'name': 'Please tell me about yourself (AgainXXXXX)',
            'type': '//enum/question/text',
        };

        const formItem = {
            'type': '//types/form/select',
            'name': 'field',
            'label': 'Type',
            'items': [
                {
                    'id': 'https://api.example.com/organisation/a656927b0f/question',
                    'type': '//types/form/collection',
                    'multiple': true,
                    'name': relName,  // <-- this field is matched against
                    'label': 'Questions',
                    'items': null,
                },
            ],
        } as unknown as FormItem;

        const mockResolverRelName = jest.fn();
        const mockResolverResource = jest.fn();
        const options = {
            resourceResolver: relName => {
                mockResolverRelName(relName);
                return async resource => {
                    mockResolverResource(resource);
                    return null;
                };
            },
        } as MergeOptions;
        await FieldResolverUtil.resolveResource(fieldValue, formItem, options);
        expect(mockResolverRelName).toHaveBeenCalledWith(relName);
        expect(mockResolverResource).toHaveBeenCalledWith(fieldValue);
    });

});
