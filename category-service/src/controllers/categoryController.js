const Category = require('../models/Category');
const { Kafka } = require('kafkajs');
const Redis = require('redis');

// Initialize Kafka producer
const kafka = new Kafka({
  clientId: 'category-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      parent,
      icon,
      image,
      order,
      metadata
    } = req.body;

    const category = new Category({
      name,
      description,
      parent,
      icon,
      image,
      order,
      metadata
    });

    await category.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'category-created',
      messages: [
        { value: JSON.stringify(category) }
      ]
    });

    // Clear cache
    await redis.del('categories:all');
    await redis.del('categories:tree');

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    // Try to get from cache first
    const cacheKey = includeInactive ? 'categories:all:with-inactive' : 'categories:all';
    const cachedCategories = await redis.get(cacheKey);
    
    if (cachedCategories) {
      return res.json({
        success: true,
        data: JSON.parse(cachedCategories)
      });
    }

    const query = includeInactive ? {} : { isActive: true };
    const categories = await Category.find(query)
      .sort({ order: 1, name: 1 })
      .populate('parent', 'name slug');

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(categories), {
      EX: 3600 // Cache for 1 hour
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
};

// Get category tree
exports.getCategoryTree = async (req, res) => {
  try {
    // Try to get from cache first
    const cachedTree = await redis.get('categories:tree');
    
    if (cachedTree) {
      return res.json({
        success: true,
        data: JSON.parse(cachedTree)
      });
    }

    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 });

    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent?.toString() === parentId?.toString())
        .map(item => ({
          ...item.toObject(),
          children: buildTree(items, item._id)
        }));
    };

    const tree = buildTree(categories);

    // Cache the result
    await redis.set('categories:tree', JSON.stringify(tree), {
      EX: 3600 // Cache for 1 hour
    });

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error getting category tree:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get category tree'
    });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get from cache first
    const cachedCategory = await redis.get(`category:${id}`);
    
    if (cachedCategory) {
      return res.json({
        success: true,
        data: JSON.parse(cachedCategory)
      });
    }

    const category = await Category.findById(id)
      .populate('parent', 'name slug')
      .populate('path', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Cache the result
    await redis.set(`category:${id}`, JSON.stringify(category), {
      EX: 3600 // Cache for 1 hour
    });

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get category'
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      parent,
      icon,
      image,
      isActive,
      order,
      metadata
    } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Update fields
    Object.assign(category, {
      name,
      description,
      parent,
      icon,
      image,
      isActive,
      order,
      metadata
    });

    await category.save();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'category-updated',
      messages: [
        { value: JSON.stringify(category) }
      ]
    });

    // Clear cache
    await redis.del('categories:all');
    await redis.del('categories:tree');
    await redis.del(`category:${id}`);

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has children
    const hasChildren = await Category.exists({ parent: id });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories'
      });
    }

    await category.deleteOne();

    // Send event to Kafka
    await producer.connect();
    await producer.send({
      topic: 'category-deleted',
      messages: [
        { value: JSON.stringify({ id }) }
      ]
    });

    // Clear cache
    await redis.del('categories:all');
    await redis.del('categories:tree');
    await redis.del(`category:${id}`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
}; 