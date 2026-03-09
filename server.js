const express = require('express');
const https = require('https');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Clean URLs middleware for local dev
app.use((req, res, next) => {
    if (req.path.indexOf('.') === -1 && req.path !== '/') {
        const file = `.${req.path}.html`;
        res.sendFile(file, { root: './' }, (err) => {
            if (err) next();
        });
    } else {
        next();
    }
});

app.use(express.static('./'));

app.get('/api/clinics', (req, res) => {
    const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, AIRTABLE_VIEW_NAME } = process.env;
    const allRecords = [];

    const fetchPage = (offset = '') => {
        const path = `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?view=${encodeURIComponent(AIRTABLE_VIEW_NAME)}${offset ? `&offset=${offset}` : ''}`;

        const options = {
            hostname: 'api.airtable.com',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            },
            timeout: 10000
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
                    console.error('[Server] Failed to parse Airtable response. Body:', data.substring(0, 500));
                    res.status(500).json({ error: 'Failed to parse Airtable response', body: data.substring(0, 500) });
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
