const Vlog = require('../models/Vlog');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'vlog-service',
  brokers: ['kafka:29092']
});

const producer = kafka.producer();

const createVlog = async (req, res) => {
  try {
    const vlog = new Vlog({
      ...req.body,
      author: req.user.id
    });

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
};

const getVlogs = async (req, res) => {
  try {
    const { status, category, author, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (author) query.author = author;

    // Only show published vlogs to regular users
    if (req.user.role === 'user') {
      query.status = 'published';
    }

    const vlogs = await Vlog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('author', 'username')
      .populate('category', 'name');

    const total = await Vlog.countDocuments(query);

    res.json({
      vlogs,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getVlog = async (req, res) => {
  try {
    const vlog = await Vlog.findById(req.params.id)
      .populate('author', 'username')
      .populate('category', 'name');

    if (!vlog) {
      return res.status(404).json({ error: 'Vlog not found' });
    }

    // Increment views
    vlog.views += 1;
    await vlog.save();

    res.json(vlog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateVlog = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'content', 'category', 'tags', 'status', 'featuredImage'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates' });
    }

    updates.forEach(update => req.vlog[update] = req.body[update]);
    
    if (req.body.status === 'published') {
      req.vlog.publishedAt = Date.now();
    }

    await req.vlog.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-updated',
      messages: [
        { value: JSON.stringify(req.vlog) }
      ]
    });

    res.json(req.vlog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteVlog = async (req, res) => {
  try {
    await req.vlog.remove();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-deleted',
      messages: [
        { value: JSON.stringify({ id: req.vlog._id }) }
      ]
    });

    res.json({ message: 'Vlog deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const likeVlog = async (req, res) => {
  try {
    req.vlog.likes += 1;
    await req.vlog.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-liked',
      messages: [
        { value: JSON.stringify({ vlogId: req.vlog._id, likes: req.vlog.likes }) }
      ]
    });

    res.json(req.vlog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const approveVlog = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve vlogs' });
    }

    req.vlog.status = 'published';
    req.vlog.publishedAt = Date.now();
    await req.vlog.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-approved',
      messages: [
        { value: JSON.stringify(req.vlog) }
      ]
    });

    res.json(req.vlog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const rejectVlog = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reject vlogs' });
    }

    req.vlog.status = 'rejected';
    await req.vlog.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'vlog-rejected',
      messages: [
        { value: JSON.stringify(req.vlog) }
      ]
    });

    res.json(req.vlog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createVlog,
  getVlogs,
  getVlog,
  updateVlog,
  deleteVlog,
  likeVlog,
  approveVlog,
  rejectVlog
}; 