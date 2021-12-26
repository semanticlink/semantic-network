import { LinkRelation } from '../linkRelation';
import { LinkedRepresentation } from 'semantic-link';
import { RepresentationUtil } from '../utils/representationUtil';

describe('Representation utils', () => {

    describe('collection', () => {


        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'http://api.example.com/role/1',
                },
                {
                    rel: 'alt',
                    href: 'http://api.example.com/role/2',
                },
                {
                    rel: 'via',
                    href: 'http://api.example.com/role/6',
                },
                {
                    rel: 'alt-no-match',
                    href: 'http://api.example.com/role/2',
                },
            ],
            name: 'Admin',
            alt: 'http://api.example.com/role/2',
            altNoMatch: 'http://api.example.com/role/3',
        };

        const collection = {
            links: [
                { rel: 'self', href: 'http://api.example.com/role/' },
                { rel: 'current', href: 'http://api.example.com/role/1' },
            ],
            items: [resource],
        };

        test.each([
            [collection, {}, false],
            [collection, undefined, false],
            [collection, { where: resource }, true],
            [collection, { where: 'http://api.example.com/role/1' }, true],
            [collection, { where: 'http://api.example.com/role/2' }, false],
            [collection, { where: resource }, true],
            [collection, { where: resource, rel: LinkRelation.Self }, true],
            [collection, { where: resource, rel: LinkRelation.Alternate }, false],
            [collection, { where: { name: 'Admin' } as unknown as LinkedRepresentation }, true],
            [collection, { where: { name: 'No Match' } as unknown as LinkedRepresentation }, false],
            [collection, { where: resource, rel: 'alt' }, true],
            [collection, { where: 'http://api.example.com/role/6', rel: 'via' }, true],
            [collection, { where: resource, rel: 'alt-no-match' }, true], // find on name
            [collection, { where: { ...resource, name: '' }, rel: 'alt-no-match' }, true],
            [collection, { where: { rel: 'first' } }, false],
            [collection, { where: { rel: 'current' } }, true],
            // [collection, { where: { ...resource, name: '' }, rel: 'alt-no-match' }, false], // remove name, rel has wrong value
        ])('findResourceInCollection %#', (collection, options, found) => {

            const actual = RepresentationUtil.findInCollection(collection, options);
            if (found) {
                expect(actual).toBeDefined();
            } else {
                expect(actual).toBeUndefined();
            }
        });
    });
});
