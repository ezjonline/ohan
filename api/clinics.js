const https = require('https');

module.exports = async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, AIRTABLE_VIEW_NAME } = process.env;
    const allRecords = [];

    const fetchAllData = (offset = '') => {
        return new Promise((resolve, reject) => {
            const path = `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?view=${encodeURIComponent(AIRTABLE_VIEW_NAME)}${offset ? `&offset=${offset}` : ''}`;

            const options = {
                hostname: '35.171.68.61', // api.airtable.com (IPv4)
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Host': 'api.airtable.com'
                },
                timeout: 10000,
                rejectUnauthorized: false
            };

            const airtableReq = https.request(options, (airtableRes) => {
                let data = '';
                airtableRes.on('data', (chunk) => data += chunk);
                airtableRes.on('end', async () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.records) {
                            allRecords.push(...json.records);
                            if (json.offset) {
                                try {
                                    await fetchAllData(json.offset);
                                    resolve();
                                } catch (err) {
                                    reject(err);
                                }
                            } else {
                                resolve();
                            }
                        } else {
                            reject({ statusCode: airtableRes.statusCode, json });
                        }
                    } catch (e) {
                        reject({ statusCode: 500, error: 'Failed to parse Airtable response' });
                    }
                });
            });

            airtableReq.on('error', (e) => {
                reject({ statusCode: 500, error: e.message });
            });

            airtableReq.end();
        });
    };

    try {
        await fetchAllData();
        res.status(200).json({ records: allRecords });
    } catch (err) {
        console.error('[API] Error:', err);
        res.status(err.statusCode || 500).json(err.error ? { error: err.error } : err.json);
    }
};
