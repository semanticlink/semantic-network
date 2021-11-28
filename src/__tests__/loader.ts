import { Loader } from '../http/loader';
import { assertThat } from 'mismatched';


describe('Add a request', () => {
    let loader: Loader;

    const action = () => Promise.resolve(true);

    beforeEach(() => {
        loader = new Loader();
        assertThat(Object.keys(loader.requests).length).is(0);
    });

    it('should make a single request passing through the id and config and clear the queue', async () => {
        const id = '1';

        const caller = jest.spyOn(loader.limiter, 'schedule');
        caller.mockResolvedValue(Promise.resolve(true));

        const result = await loader.schedule(id, action);

        assertThat(result).is(true);
        assertThat(caller.mock.calls.length).is(1);
        assertThat(loader.requests[id]).is(undefined);

        caller.mockRestore();

    });

    it('should only make one schedule request across the same id', async () => {
        const id = '1';


        const caller = jest.spyOn(loader.limiter, 'schedule');
        caller.mockImplementation(() => Promise.resolve((resolve: any) => {
            setTimeout(() => resolve(true), 20);
        }));

        const [first, second, third] = await Promise.all(
            [
                loader.schedule(id, action),
                loader.schedule(id, action),
                loader.schedule(id, action),
            ]);
        assertThat(first).isNot(undefined);
        assertThat(second).isNot(undefined);
        assertThat(third).isNot(undefined);
        assertThat(caller.mock.calls.length).is(1);
        assertThat(loader.requests[id]).is(undefined);
        caller.mockRestore();

    });

    it('should make one request per unique id across multiple requests', async () => {

        const caller = jest.spyOn(loader.limiter, 'schedule');
        caller.mockImplementation(() => Promise.resolve((resolve: any) => {
            setTimeout(() => resolve(true), 20);
        }));

        const [first, second, third, fourth, fifth, sixth] = await Promise.all(
            [
                loader.schedule('1', action),
                loader.schedule('1', action),
                loader.schedule('2', action),
                loader.schedule('3', action),
                loader.schedule('3', action),
                loader.schedule('2', action),
            ]);
        assertThat(first).isNot(undefined);
        assertThat(second).isNot(undefined);
        assertThat(third).isNot(undefined);
        assertThat(fourth).isNot(undefined);
        assertThat(fifth).isNot(undefined);
        assertThat(sixth).isNot(undefined);
        assertThat(caller.mock.calls.length).is(3);
        assertThat(loader.requests['1']).is(undefined);
        assertThat(loader.requests['2']).is(undefined);
        assertThat(loader.requests['3']).is(undefined);
        caller.mockRestore();

    });
});
