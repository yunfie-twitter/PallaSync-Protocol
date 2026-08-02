const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ type: ['application/json', 'application/vnd.palleria.sync+json'] }));

// In-memory store for events. Format: { chainId: [event1, event2, ...] }
const chainEvents = {};

// Push Event
app.post('/pallasync/v1/events', (req, res) => {
    const event = req.body;
    const chainId = event.chain_id;

    if (!chainId) {
        return res.status(400).json({ error: 'chain_id is required' });
    }

    if (!chainEvents[chainId]) {
        chainEvents[chainId] = [];
    }

    chainEvents[chainId].push(event);
    console.log(`[POST] Event received for chain ${chainId}. Total events: ${chainEvents[chainId].length}`);
    
    res.status(200).json({ status: 'ok' });
});

// Fetch Events
app.get('/pallasync/v1/events/:chainId', (req, res) => {
    const chainId = req.params.chainId;
    const since = req.query.since || "0";

    if (!chainEvents[chainId]) {
        return res.status(200).json([]);
    }

    // In a real implementation, we'd filter by sequence or lamport clock using 'since'
    // For this prototype, we'll just return all events.
    res.status(200).json(chainEvents[chainId]);
});

app.listen(port, () => {
    console.log(`PallaSync Signaling Server running on http://localhost:${port}`);
    console.log(`Set your Palleria app Server URL to http://10.0.2.2:${port} if using Android Emulator`);
});
