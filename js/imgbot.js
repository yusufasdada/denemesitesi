// Örnek Node.js sunucu
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.post('/generate-image', async (req, res) => {
    const { prompt } = req.body;
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_API_KEY`
        },
        body: JSON.stringify({
            model: 'dall-e-2',
            prompt,
            n: 1,
            size: '512x512',
            response_format: 'url'
        })
    });
    const data = await response.json();
    res.json(data);
});

app.listen(3000, () => console.log('Sunucu çalışıyor...'));