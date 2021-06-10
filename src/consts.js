const inputTemplate = (startUrl, type, proxyConfiguration, maxPagesPerCrawl, maxConcurrency, saveSnapshots) => {
    return ({
        startUrls: [
            {
                url: `${startUrl}`,
                method: 'GET',
            },
        ],
        type,
        linkSelector: 'a',
        pseudoUrls: [
            {
                purl: `${startUrl.endsWith('/') ? startUrl : `${startUrl}/`}[.*]`,
                method: 'GET',
            },
        ],
        proxyConfiguration,
        maxPagesPerCrawl,
        maxConcurrency,
        headfull: false,
        useChrome: false,
        useGoogleBotHeaders: false,
        saveSnapshots,
    });
};
module.exports = { inputTemplate };
