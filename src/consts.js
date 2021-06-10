const inputTemplate = (startUrl) => {
    return ({
        startUrls: [
            {
                url: `${startUrl}`,
                method: 'GET',
            },
        ],
        type: 'cheerio',
        linkSelector: 'a',
        pseudoUrls: [
            {
                purl: `${startUrl.endsWith('/') ? startUrl : `${startUrl}/`}[.*]`,
                method: 'GET',
            },
        ],
        proxyConfiguration: {
            useApifyProxy: true,
        },
        maxPagesPerCrawl: 400,
        maxConcurrency: 10,
        headfull: false,
        useChrome: false,
        useGoogleBotHeaders: false,
        saveSnapshots: true,
    });
};
module.exports = { inputTemplate };
