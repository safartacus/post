const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://mongodb:27017/vlog-service', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Kafka Configuration
const kafka = new Kafka({
  clientId: 'vlog-service',
  brokers: ['kafka:29092']
});

const producer = kafka.producer();

// Vlog Schema
const vlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  tags: [String],
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Vlog = mongoose.model('Vlog', vlogSchema);

// Routes
// Create Vlog
app.post('/vlogs', async (req, res) => {
  try {
    const vlog = new Vlog(req.body);
    await vlog.save();
    
    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-created',
      messages: [
        { value: JSON.stringify(vlog) }
      ]
    });
    
    res.status(201).json(vlog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Vlogs
app.get('/vlogs', async (req, res) => {
  try {
    const vlogs = await Vlog.find().sort({ createdAt: -1 });
    res.json(vlogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Vlog
app.get('/vlogs/:id', async (req, res) => {
  try {
    const vlog = await Vlog.findById(req.params.id);
    if (!vlog) {
      return res.status(404).json({ error: 'Vlog not found' });
    }
    res.json(vlog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Vlog
app.put('/vlogs/:id', async (req, res) => {
  try {
    const vlog = await Vlog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!vlog) {
      return res.status(404).json({ error: 'Vlog not found' });
    }
    
    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-updated',
      messages: [
        { value: JSON.stringify(vlog) }
      ]
    });
    
    res.json(vlog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Vlog
app.delete('/vlogs/:id', async (req, res) => {
  try {
    const vlog = await Vlog.findByIdAndDelete(req.params.id);
    if (!vlog) {
      return res.status(404).json({ error: 'Vlog not found' });
    }
    
    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-deleted',
      messages: [
        { value: JSON.stringify({ id: req.params.id }) }
      ]
    });
    
    res.json({ message: 'Vlog deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like Vlog
app.post('/vlogs/:id/like', async (req, res) => {
  try {
    const vlog = await Vlog.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    
    if (!vlog) {
      return res.status(404).json({ error: 'Vlog not found' });
    }
    
    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-liked',
      messages: [
        { value: JSON.stringify({ vlogId: req.params.id, likes: vlog.likes }) }
      ]
    });
    
    res.json(vlog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Vlog Service is running on port ${PORT}`);
}); 