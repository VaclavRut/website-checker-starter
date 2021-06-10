const Apify = require('apify');
const { inputTemplate } = require('./consts');

const { log } = Apify.utils;
const client = Apify.newClient();

async function startRuns(state, actId) {
    // Start runs
    for (const item of state.toStart) {
        if (state.running <= 10 && !state.started[item]) {
            const info = await Apify.call(actId, inputTemplate(item), { waitSecs: 5 });
            state.started[item] = info;
            log.info(`Started run id ${info.id} for ${item}`);
            await Apify.utils.sleep(1 * 1000);
            state.running++;
        }
    }
}

Apify.main(async () => {
    const actId = 'lukaskrivka/website-checker';
    const input = await Apify.getValue('INPUT');
    const { startUrls } = input;

    const state = input.state || await Apify.getValue('STATE') || {
        started: {},
        toStart: startUrls,
        running: 0,
        success: 0,
    };

    // persist state
    Apify.events.on('migrating', async () => {
        await Apify.setValue('STATE', state);
        log.info('Migrating - saved state');
    });

    // persist state
    setInterval(async () => {
        const totalCount = state.toStart.length;
        const started = Object.keys(state.started).length;
        log.info(`Progress: ${started}/${state.toStart.length}`);
        log.info(`Success: ${state.success}/${state.toStart.length}`);
        await Apify.setValue('STATE', state);
        log.info('Saved state');
    }, 30 * 1000);

    log.info(`Got ${state.toStart.length} runs to start`);
    // initial starting
    await startRuns(state, actId);

    let allFinished = false;
    // Wait if everything has finished
    while (!allFinished) {
        allFinished = true;
        for (const key of Object.keys(state.started)) {
            const item = state.started[key];
            const run = await client.run(item.id).get();
            if (run.status === 'RUNNING') {
                allFinished = false;
            } else if (!state.started[key].finished) {
                const store = await Apify.openKeyValueStore(run.defaultKeyValueStoreId);
                const output = await store.getValue('OUTPUT');
                output.url = key;
                output.detailedOutput = `https://api.apify.com/v2/key-value-stores/${run.defaultKeyValueStoreId}/records/DETAILED-OUTPUT`;
                output.simplifiedOutput = `https://api.apify.com/v2/key-value-stores/${run.defaultKeyValueStoreId}/records/OUTPUT`;
                output.kvStore = run.defaultKeyValueStoreId;
                output.runStatus = run.status;
                await Apify.pushData(output);
                state.success++;
                state.started[key].finished = true;
                state.started[key].run = run;
                state.running--;
                // start more
                await startRuns(state, actId);
            }
        }
        await Apify.utils.sleep(5 * 1000);
    }
    log.info('Done');
});
