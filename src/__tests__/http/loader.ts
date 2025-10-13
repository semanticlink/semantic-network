import { BottleneckLoader } from '../../http/bottleneckLoader';
import { assertThat, match } from 'mismatched';
import { LoaderOptions } from '../../interfaces/loader';

describe('BottleneckLoader - schedule GET then stop', () => {

    // helpers
    function delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function nextTick(): Promise<void> {
        return delay(0);
    }

    function createUnblocker(): { promise: Promise<void>; resolve: () => void } {
        let resolver!: () => void;
        const promise = new Promise<void>(r => (resolver = r));
        return { promise, resolve: resolver };
    }

    const makeLoader = (opts?: Partial<LoaderOptions>) =>
        new BottleneckLoader({
            maxConcurrent: 1,
            minTime: 0,
            ...opts,
        });


    it('schedules a single GET and resolves', async () => {
        const loader = makeLoader();

        const action = jest.fn(async () => {
            await delay(10);
            return 'ok';
        });

        const result = await loader.schedule<string>('id-1', action);
        assertThat(loader.requests.size).is(0);

        assertThat(result).is('ok');
        assertThat(action).is(match.predicate(fn => fn.mock.calls.length === 1, 'called once'));
        assertThat(loader.getRequest('id-1')).is(undefined);
    });

    it('deduplicates concurrent GETs by id and resolves all with same value', async () => {
        const loader = makeLoader();

        const action = jest.fn(async () => {
            await delay(20);
            return 'shared';
        });

        const p1 = loader.schedule<string>('same-id', action);
        const p2 = loader.schedule<string>('same-id', action);
        const p3 = loader.schedule<string>('same-id', action);

        assertThat(loader.requests.size).is(1);
        const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
        assertThat(loader.requests.size).is(0);

        assertThat([r1, r2, r3]).is(['shared', 'shared', 'shared']);
        assertThat(action).is(match.predicate(fn => fn.mock.calls.length === 1, 'called once'));
        assertThat(loader.getRequest('same-id')).is(undefined);
    });


    it('stop with empty queues is a no-op', async () => {
        const loader = makeLoader();
        await loader.clearAll();

        assertThat(loader.requests.size).is(0);
        const result = await loader.schedule('id', async () => 'ok');
        assertThat(loader.requests.size).is(0);

        assertThat(result).is('ok');
    });


    xit('stop clears queued work and resets limiter', async () => {
        const loader = makeLoader({ maxConcurrent: 1 });


        // The first job blocks the limiter
        const unblock = createUnblocker();
        const blocking = loader.schedule(
            'blocker',
            async () => {
                await unblock.promise;
                return 'first';
            });

        // Queue some GETs that should be dropped on stop
        const lateAction = jest.fn(async () => 'late');
        const p2 = loader.schedule('id-2', lateAction);
        const p3 = loader.schedule('id-3', lateAction);

        assertThat(loader.requests.size).is(3);

        // await nextTick();

        assertThat(loader.limiter.counts()).is({ QUEUED: 0, RECEIVED: 3, RUNNING: 0, EXECUTING: 0 });

        await loader.clearAll();

        assertThat(loader.limiter.counts()).is({ QUEUED: 0, RECEIVED: 0, RUNNING: 0, EXECUTING: 0 });
        assertThat(loader.requests.size).is(0);


        // Unblock the first so it can resolve

        // unblock.resolve();
        // const first = await blocking;
        // assertThat(first).is('first');

        // After stop, queued jobs should not execute and their promises should reject
        await expect(p2).rejects.toBeDefined();
        await expect(p3).rejects.toBeDefined();
        assertThat(lateAction).is(match.predicate(fn => fn.mock.calls.length === 0, 'not called'));

    });

});

