const express = require('express');
const https = require('https');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static('./'));

app.get('/api/clinics', (req, res) => {
    const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, AIRTABLE_VIEW_NAME } = process.env;
    const allRecords = [];

    const fetchPage = (offset = '') => {
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

        console.log(`[Server] Fetching page with offset: ${offset || 'none'}`);

        const airtableReq = https.request(options, (airtableRes) => {
            let data = '';
            airtableRes.on('data', (chunk) => data += chunk);
            airtableRes.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.records) {
                        allRecords.push(...json.records);
                        if (json.offset) {
                            fetchPage(json.offset);
                        } else {
                            console.log(`[Server] Success: Fetched all ${allRecords.length} records.`);
                            res.json({ records: allRecords });
                        }
                    } else {
                        res.status(airtableRes.statusCode).json(json);
                    }
                } catch (e) {
                    res.status(500).json({ error: 'Failed to parse Airtable response' });
                }
            });
        });

        airtableReq.on('error', (e) => {
            console.error('[Server] IPv4 Proxy Error:', e.message);
            res.status(500).json({ error: e.message });
        });

        airtableReq.end();
    };

    fetchPage();
});

app.listen(PORT, () => console.log(`Proxy on ${PORT}`));
