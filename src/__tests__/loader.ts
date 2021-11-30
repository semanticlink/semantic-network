import { bottleneckLoader, BottleneckLoader } from '../http/bottleneckLoader';
import { assertThat } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { LinkRelation } from '../linkRelation';
import { get as apiGet } from '../representation/get';
import { LinkedRepresentation } from 'semantic-link';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import Bottleneck from 'bottleneck';


const promiseDelay = (ms: number): Promise<any> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

describe('Add a request', () => {
    let loader: BottleneckLoader;

    const action = () => Promise.resolve(true);

    beforeEach(() => {
        loader = new BottleneckLoader();
        assertThat(Object.keys(loader.requests).length).is(0);
    });

    it('should make a single request passing through the id and config and clear the queue', async () => {
        const id = '1';

        const caller = jest.spyOn(loader.limiter, 'schedule');
        caller.mockResolvedValue(Promise.resolve(true));

        const result = await loader.schedule(id, action);

        assertThat(result).is(true);
        assertThat(caller.mock.calls.length).is(1);
        assertThat(loader.getRequest(id)).is(undefined);

        caller.mockRestore();

    });

    it('poc, bottleneck raw', async () => {

        interface ApiRepresentation extends LinkedRepresentation {
            version: string;
        }

        const post = jest.fn();
        const get = jest.fn();
        const put = jest.fn();
        const del = jest.fn();

        HttpRequestFactory.Instance(
            { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del, loader: bottleneckLoader }, true);
        const uri = 'https://api.example.com';
        const id = uri;

        get
            .mockResolvedValueOnce(
                {
                    data: {
                        links: [
                            {
                                rel: LinkRelation.Self,
                                href: uri,
                            },
                        ],
                        version: '56',
                    },
                    headers: { x: 'test' },
                    status: 200,
                    statusText: '',
                    config: {},
                }
            );

        const resource = SparseRepresentationFactory.make<ApiRepresentation>({ uri });
        const options = { rel: LinkRelation.Self };
        const bottleneck = new Bottleneck({ maxConcurrent: 1 });

        const result = await bottleneck.schedule({ id }, () => apiGet<ApiRepresentation>(resource, options));

        assertThat(result).isNot(undefined);
        if (result) {
            assertThat(result.version).is('56');
        }
    });

    it('should only make one schedule request across the same id', async () => {

        interface ApiRepresentation extends LinkedRepresentation {
            version: string;
        }

        const post = jest.fn();
        const get = jest.fn();
        const put = jest.fn();
        const del = jest.fn();

        HttpRequestFactory.Instance(
            { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del, loader: bottleneckLoader }, true);
        const uri = 'https://api.example.com';
        const id = uri;

        const value = {
            data: {
                links: [
                    {
                        rel: LinkRelation.Self,
                        href: uri,
                    },
                ],
                version: '56',
            },
            headers: { x: 'test' },
            status: 200,
            statusText: '',
            config: {},
        };
        get
            .mockResolvedValueOnce({ ...value, version: '56' })
            .mockResolvedValueOnce({ ...value, version: '60' })
            .mockResolvedValueOnce({ ...value, version: '70' });

        const resource = SparseRepresentationFactory.make<ApiRepresentation>({ uri });
        const options = { rel: LinkRelation.Self };

        const [first, second, third] = await Promise.all(
            [
                loader.schedule(id, () => apiGet<ApiRepresentation>(resource, options)),
                loader.schedule(id, () => apiGet<ApiRepresentation>(resource, options)),
                loader.schedule(id, () => apiGet<ApiRepresentation>(resource, options)),
            ]);
        assertThat(first?.version).is('56');
        assertThat(second?.version).is('56');
        assertThat(third?.version).is('56');
        assertThat(get.mock.calls.length).is(1);
        assertThat(loader.getRequest(id)).is(undefined);
        get.mockRestore();

    });



    describe('promiseDelay', () => {

        beforeEach(() => { jest.useFakeTimers(); });
        afterEach(() => { jest.useRealTimers(); });
        it('should not resolve until timeout has elapsed', async () => {

            const spy = jest.fn();
            promiseDelay(100).then(spy);  // <= resolve after 100ms

            jest.advanceTimersByTime(20);  // <= advance less than 100ms
            await Promise.resolve();  // let any pending callbacks in PromiseJobs run
            assertThat(spy.mock.calls.length).is(0);  // SUCCESS

            jest.advanceTimersByTime(75);  // <= advance the rest of the time
            await Promise.resolve();  // let any pending callbacks in PromiseJobs run
            expect(spy).not.toHaveBeenCalled();  // SUCCESS

            jest.advanceTimersByTime(5);  // <= advance the rest of the time
            await Promise.resolve();  // let any pending callbacks in PromiseJobs run
            expect(spy).toHaveBeenCalled();  // SUCCESS

        });

        xit('should make one request per unique id across multiple requests', async () => {

            interface Test {
                id: number
            }

            const spy = jest.fn();

            spy
                .mockResolvedValueOnce({ id: 1 })
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce({ id: 3 });

            const action = () => {
                return promiseDelay(0).then(spy) as Promise<Test>;
            };

            const first = await loader.schedule('1', action);
            jest.advanceTimersByTime(100);  // <= advance less than 100ms
            await Promise.resolve();
            expect(spy).not.toHaveBeenCalled();

            // const second = await loader.schedule('1', action);
            expect(spy).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);  // <= advance less than 100ms
            await Promise.resolve();
            expect(spy).toHaveBeenCalled();
            assertThat(first.id).is(1);
            // assertThat(second.id).is(1);


            // const sixth = await loader.schedule('1', action);
            // assertThat(sixth.id).is(2);

            assertThat(spy.mock.calls.length).is(2);

            assertThat(loader.getRequest('1')).is(undefined);
            assertThat(loader.getRequest('2')).is(undefined);
        });

    });
});
