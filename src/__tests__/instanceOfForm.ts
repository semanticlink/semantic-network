import { instanceOfForm } from '../utils/instanceOf/instanceOfForm';
import { assertThat } from 'mismatched';
import { LinkRelation } from '../linkRelation';

describe('instance of form', () => {

    test.each([
        ['nothing', {}, false],
        ['empty', { links: [], items: [] }, false],
        ['valid link, no item', {
            links: [{ rel: LinkRelation.Self, href: 'https://schema.example.com/create-form' }],
        }, false],
        ['valid link, empty item', {
            links: [{ rel: LinkRelation.Self, href: 'https://schema.example.com/create-form' }],
            items: [],
        }, false],
        ['valid item, no link', { links: [], items: [{ type: 'text' }] }, false],
        ['requires link with form and valid item, create', {
            links: [{ rel: LinkRelation.Self, href: 'https://schema.example.com/create-form' }],
            items: [{ type: 'text' }],
        }, true],
        ['requires link with form and valid item, edit', {
            links: [{ rel: LinkRelation.Self, href: 'https://schema.example.com/edit-form' }],
            items: [{ type: 'text' }],
        }, true],
        ['requires link with form and valid item, search', {
            links: [{ rel: LinkRelation.Self, href: 'https://schema.example.com/search-form' }],
            items: [{ type: 'text' }],
        }, true],
        ['requires form in self link href', {
            links: [{ rel: LinkRelation.Self, href: 'https://schema.example.com/create' }],
            items: [{ type: 'text' }],
        }, false],
    ])('%s', (title: string, obj: any, expected: boolean) => {
        assertThat(instanceOfForm(obj)).is(expected);
    });


});
