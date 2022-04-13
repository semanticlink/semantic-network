import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { update } from '../representation/update';
import { DocumentRepresentation } from '../interfaces/document';
import { LinkedRepresentation } from 'semantic-link';
import { LinkRelation } from '../linkRelation';
import { FormRepresentation } from '../interfaces/formRepresentation';
import * as apiGet from '../representation/get';
import { ResourceUpdateOptions } from '../interfaces/resourceUpdateOptions';

jest.mock('../representation/trackedRepresentationFactory');
const trackedRepresentationFactory = TrackedRepresentationFactory as jest.Mocked<typeof TrackedRepresentationFactory>;

describe('resource, update', () => {

    const uri = 'https://api.example.com';

    test.each([
        ['throws ', {}],
    ])('Collection, %s', async (title: string, document: DocumentRepresentation) => {

        const resource = SparseRepresentationFactory.make({ uri, sparseType: 'collection' });

        try {
            await update(resource, document);
        } catch (e) {
            await expect(e).toBeInstanceOf(Error);
        }
    });

    test.each([
        ['with form, no error', true, true, false, 1, 1, 1],
        ['no form, no error', false, true, false, 0, 1, 0],
        ['with form, with error', true, true, true, 1, 1, 1],
        ['no form, with error', false, true, true, 0, 1, 0],
    ])('%s', async (
        title: string,
        withForm: boolean, returnsForm: boolean, errorOnUpdate: boolean,
        formCalled: number, updateCalled: number, mergeCalled: number) => {

        const mergeMock = jest.fn();
        mergeMock.mockImplementation(async () => ({}));

        const updateMock = trackedRepresentationFactory.update;
        updateMock.mockImplementation(async () => {
            if (errorOnUpdate) {
                throw new Error();
            }
        });

        // return an edit form targeting the version value
        const getMock = jest.spyOn(apiGet, 'get');
        getMock.mockImplementation(async () => {
            if (returnsForm) {
                return {
                    links: [{ rel: LinkRelation.Self, href: 'edit-form' }],
                    items: [{ type: 'text', name: 'version' }],
                } as FormRepresentation;
            } else {
                return {
                    links: [{ rel: LinkRelation.Self, href: 'edit-form' }],
                } as FormRepresentation;
            }
        });

        const resource = SparseRepresentationFactory.make({ uri });
        if (withForm) {
            resource.links.push({ rel: LinkRelation.EditForm, href: 'edit-form/url' });
        }
        try {
            await update(
                resource,
                {} as LinkedRepresentation,
                { makePutRepresentationStrategy: mergeMock } as ResourceUpdateOptions);
        } catch (e) {
            if (!errorOnUpdate) {
                fail('error thrown');
            }
        } finally {
            expect(getMock).toHaveBeenCalledTimes(formCalled);
            expect(updateMock).toHaveBeenCalledTimes(updateCalled);
            expect(mergeMock).toHaveBeenCalledTimes(mergeCalled);

            mergeMock.mockRestore();
            updateMock.mockRestore();
            getMock.mockRestore();
        }

    });

});
