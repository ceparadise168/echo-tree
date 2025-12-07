// api/index.js
const serverless = require('serverless-http');
const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const TABLE_NAME = process.env.TABLE_NAME;
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Validate eventCode format
function validateEventCode(eventCode) {
  if (!eventCode || typeof eventCode !== 'string') {
    return false;
  }
  const trimmed = eventCode.trim();
  // 3-50 characters, only alphanumeric, underscore, and hyphen
  return /^[a-zA-Z0-9_-]{3,50}$/.test(trimmed);
}

// CORS Headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
  );
  next();
});

// Handle OPTIONS preflight explicitly
app.options('/cards', (req, res) => {
  res.status(200).end();
});

// Get cards by eventCode
app.get('/cards', async (req, res) => {
  const { eventCode } = req.query;

  if (!eventCode) {
    return res.status(400).json({ error: 'eventCode parameter is required' });
  }

  if (!validateEventCode(eventCode)) {
    return res.status(400).json({ 
      error: 'Invalid eventCode format. Must be 3-50 characters, only alphanumeric, underscore, and hyphen.' 
    });
  }

  const params = {
    TableName: TABLE_NAME,
    IndexName: 'EventCodeIndex',
    KeyConditionExpression: 'eventCode = :code',
    ExpressionAttributeValues: {
      ':code': eventCode,
    },
  };

  try {
    const data = await docClient.send(new QueryCommand(params));
    res.status(200).json(data.Items || []);
  } catch (err) {
    console.error('Error querying DynamoDB', err);
    res.status(500).json({ error: 'Could not retrieve cards' });
  }
});

// Create a new card
app.post('/cards', async (req, res) => {
  const { memory, recipient, authorName, color, date, eventCode } = req.body;

  if (!memory) {
    return res.status(400).json({ error: 'Memory content is required' });
  }

  if (!eventCode) {
    return res.status(400).json({ error: 'eventCode is required' });
  }

  if (!validateEventCode(eventCode)) {
    return res.status(400).json({ 
      error: 'Invalid eventCode format. Must be 3-50 characters, only alphanumeric, underscore, and hyphen.' 
    });
  }

  const cardId = uuidv4();
  const params = {
    TableName: TABLE_NAME,
    Item: {
      cardId,
      eventCode,
      memory,
      recipient: recipient || null,
      authorName: authorName || 'Anonymous',
      color: color || '#FFFFFF',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json(params.Item);
  } catch (err) {
    console.error('Error putting item to DynamoDB', err);
    res.status(500).json({ error: 'Could not create card' });
  }
});

// Handle not found
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports.handler = serverless(app);