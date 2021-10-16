import { assertThat } from 'mismatched';
import { FormUtil } from '../utils/formUtil';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { FormItem } from '../interfaces/formItem';
import { DocumentRepresentation } from '../interfaces/document';
import { LinkedRepresentation } from 'semantic-link';

describe('Form util', () => {

    test.each([
        ['empty items', [], [], []],
        ['default only', [], ['c'], ['c']],
        ['one item', [{ name: 'a' }], [], ['a']],
        ['two', [{ name: 'a' }, { name: 'b' }], [], ['a', 'b']],
        ['one and default', [{ name: 'a' }, { name: 'b' }], ['c'], ['c', 'a', 'b']],
        ['distinct - item and default', [{ name: 'a' }], ['a'], ['a']],
        ['distinct - two items', [{ name: 'a' }, { name: 'a' }], [], ['a']],
        ['distinct - two items and default', [{ name: 'a' }, { name: 'a' }], ['a'], ['a']],
    ])('fields to accept, %s', (title: string, items: FormItem[], defaults: string[], expected: string[]) => {
        const form = { items: items } as FormRepresentation;
        const fields = FormUtil.fieldsToAccept(form, defaults) as string[];
        assertThat(fields).is(expected);

    });

    test.each([
        ['empty', {}, [], [], []],
        ['empty, defaults only', {}, [], ['c'], []],
        ['empty, form only', {}, [{ name: 'a' }], [], []],
        ['one item', { a: '' }, [{ name: 'a' }], [], ['a']],
        ['default item', { a: '' }, [], ['a'], ['a']],
        ['two', { a: '', b: '' }, [{ name: 'a' }, { name: 'b' }], [], ['a', 'b']],
    ])('fields to resolve, %s', (title: string, document: DocumentRepresentation, items: FormItem[], defaults: string[], expected: string[]) => {
        const form = { items: items } as FormRepresentation;
        const fields = FormUtil.fieldsToResolve(document, form, defaults);
        assertThat(fields).is(expected);

    });

    test.each([
        ['empty', {}, {}, [], [], []],
        ['empty, defaults only', {}, {}, [], ['c'], []],
        ['empty, form only', {}, {}, [{ name: 'a' }], [], []],
        ['new, one item', {}, { a: 'new' }, [{ name: 'a' }], [], ['a']],
        ['same, one item', { links: [], a: 'existing' }, { a: 'existing' }, [{ name: 'a' }], [], []],
        ['updated, one item', { links: [], a: 'existing' }, { a: 'updated' }, [{ name: 'a' }], [], ['a']],
    ])('fields requiring update, %s', (
        title: string,
        resource: Partial<LinkedRepresentation>,
        document: DocumentRepresentation,
        items: FormItem[],
        defaults: string[],
        expected: string[]) => {
        const form = { items: items } as FormRepresentation;
        const fields = FormUtil.fieldsRequiringUpdate(resource, document, form, defaults) as string[];
        assertThat(fields).is(expected);
    });

    test.each([
        ['empty', { links: [] }, [], {}],
        ['empty, defaults only', {}, [], {}],
        ['empty, form only', {}, [{ name: 'a' }], {}],
        ['new, no links', { links: [] }, [{ name: 'a' }], {}],
        ['new, one item', { links: [], a: 'new' }, [{ name: 'a' }], { a: 'new' }],
        ['new, two items', { links: [], a: 'new', b: 'also' }, [{ name: 'a' }, { name: 'b' }], { a: 'new', b: 'also' }],
        ['new, one ignored', { links: [], ignored: '' }, [{ name: 'a' }], {}],
    ])('fields to return, %s', (
        title: string,
        document: Partial<LinkedRepresentation>,
        items: FormItem[],
        expected: DocumentRepresentation) => {
        const form = { items: items } as FormRepresentation;
        const fields = FormUtil.fieldsToReturnFromForm(document, form);
        assertThat(fields).is(expected);
    });


});
