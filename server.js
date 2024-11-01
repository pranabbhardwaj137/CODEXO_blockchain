// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// const ledger = []; // Array to hold the ledger entries

// // Middleware to validate keys
// const validateKeys = {
//     isValidPublicKey: (publicKey) => {
//         // Simple validation for public key format
//         return typeof publicKey === 'string' && publicKey.length > 0;
//     },
//     isValidSecretKey: (secretKey) => {
//         // Simple validation for secret key format
//         return typeof secretKey === 'string' && secretKey.length > 0;
//     }
// };

// app.post('/store-text', (req, res) => {
//     const { senderSecret, senderPublic, key, text } = req.body;

//     // Validate input
//     if (!senderSecret || !senderPublic || !key || !text) {
//         return res.status(400).json({ error: 'Missing required fields: senderSecret, senderPublic, key, and text are required.' });
//     }

//     // Validate keys
//     if (!validateKeys.isValidPublicKey(senderPublic)) {
//         return res.status(400).json({ error: 'Invalid public key format.' });
//     }
//     if (!validateKeys.isValidSecretKey(senderSecret)) {
//         return res.status(400).json({ error: 'Invalid secret key format.' });
//     }

//     // Store the entry in the ledger
//     const entry = { senderPublic, key, text, timestamp: new Date() };
//     ledger.push(entry);

//     res.json({ message: 'Text data stored successfully!', entry });
//     console.log(`Stored entry:`, entry);
// });

// // Endpoint to get the whole ledger
// app.get('/ledger', (req, res) => {
//     res.json(ledger);
// });

// const PORT = 3001;
// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Keypair, TransactionBuilder, Operation, Networks } = require('diamante-base');
const { Horizon } = require('diamante-sdk-js');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3001;

// Middleware to validate keys
const validateKeys = {
    isValidPublicKey: (publicKey) => {
        // Simple validation for public key format
        return typeof publicKey === 'string' && publicKey.length > 0;
    },
    isValidSecretKey: (secretKey) => {
        // Simple validation for secret key format
        return typeof secretKey === 'string' && secretKey.length > 0;
    }
};

// Array to hold the ledger entries for demonstration (optional, can be removed)
const ledger = [];

// Store Text Data on Diamante Blockchain
app.post('/store-text', async (req, res) => {
    const { senderSecret, senderPublic, key, text } = req.body;

    // Validate input
    if (!senderSecret || !senderPublic || !key || !text) {
        return res.status(400).json({ error: 'Missing required fields: senderSecret, senderPublic, key, and text are required.' });
    }

    // Validate keys
    if (!validateKeys.isValidPublicKey(senderPublic)) {
        return res.status(400).json({ error: 'Invalid public key format.' });
    }
    if (!validateKeys.isValidSecretKey(senderSecret)) {
        return res.status(400).json({ error: 'Invalid secret key format.' });
    }

    try {
        const senderKeypair = Keypair.fromSecret(senderSecret);
        const server = new Horizon.Server('https://testnetexplorer.diamante.io/');

        // Load the sender's account
        const account = await server.loadAccount(senderPublic);

        // Create the transaction to store text data
        const transaction = new TransactionBuilder(account, {
            fee: await server.fetchBaseFee(),
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(Operation.manageData({
                name: key,
                value: text || null,
            }))
            .setTimeout(30)
            .build();

        // Sign the transaction
        transaction.sign(senderKeypair);

        // Submit the transaction
        const result = await server.submitTransaction(transaction);
        
        // Optionally store the result in a local ledger array
        ledger.push({ senderPublic, key, text, timestamp: new Date().toISOString() });

        res.json({ 
            message: `Text data stored successfully with key: ${key}`,
            transactionHash: result.hash
        });
    } catch (error) {
        console.error('Error storing text data:', error);
        res.status(500).json({ 
            error: 'Failed to store text data',
            details: error.message 
        });
    }
});

// Endpoint to get the whole ledger
app.get('/ledger', (req, res) => {
    res.json(ledger);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
