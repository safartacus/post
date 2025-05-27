const Category = require('../models/Category');

const checkCategoryOwnership = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Only admin can manage categories
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to perform this action' });
    }

    req.category = category;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const validateCategoryStatus = (allowedStatuses) => {
  return (req, res, next) => {
    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    next();
  };
};

const checkCircularReference = async (req, res, next) => {
  try {
    const { parent } = req.body;
    if (!parent) return next();

    const categoryId = req.params.id;
    let currentParent = parent;

    // Check if the new parent is not a child of the current category
    while (currentParent) {
      if (currentParent.toString() === categoryId) {
        return res.status(400).json({ error: 'Circular reference detected' });
      }
      const parentCategory = await Category.findById(currentParent);
      if (!parentCategory) break;
      currentParent = parentCategory.parent;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  checkCategoryOwnership,
  validateCategoryStatus,
  checkCircularReference
}; 