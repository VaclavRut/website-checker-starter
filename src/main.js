const Apify = require('apify');
const { inputTemplate } = require('./consts');

const { log } = Apify.utils;
const client = Apify.newClient();

Apify.main(async () => {
    const actId = 'lukaskrivka/website-checker';
    const input = await Apify.getValue('INPUT');
    const { startUrls } = input;
    const state = input.state || await Apify.getValue('STATE') || {
        started: {},
        toStart: startUrls,
    };

    Apify.events.on('migrating', async () => {
        await Apify.setValue('STATE', state);
        log.info('Migrating - saved state');
    });

    setInterval(async () => {
        const totalCount = state.toStart.length;
        const started = Object.keys(state.started).length;
        log.info(`Progress: ${started}/${totalCount}`);
        await Apify.setValue('STATE', state);
        log.info('Saved state');
    }, 30 * 1000);

    log.info(`Got ${state.toStart.length} runs to start`);

    // Start runs
    for (const item of state.toStart) {
        if (state.started[item]) continue;

        const info = await Apify.call(actId, inputTemplate(item), { waitSecs: 5 });
        state.started[item] = info;
        log.info(`Started run id ${info.id}`);
        await Apify.utils.sleep(1 * 1000);
    }

    log.info('Everything is started');

    let allFinished = false;
    const totalCount = state.toStart.length;
    // Wait if everything has finished
    let success = 0;
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
                success++;
                state.started[key].finished = true;
                state.started[key].run = run;
            }
        }

        log.info(`Success: ${success}/${totalCount}`);
        await Apify.utils.sleep(5 * 1000);
    }
    log.info('Done');
});
