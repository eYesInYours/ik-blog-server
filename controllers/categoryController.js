const Category = require('../models/Category');
const Article = require('../models/Article');
const { SUCCESS, CLIENT_ERROR, SERVER_ERROR } = require('../constants/httpStatus');
const { success, error } = require('../utils/responseHandler');

// 创建分类
exports.createCategory = async (req, res) => {
    try {
        const { name, description, parentId, image } = req.body;

        // 检查分类名是否已存在
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json(
                error(CLIENT_ERROR.BAD_REQUEST, '分类已存在')
            );
        }

        // 如果有父分类ID，检查父分类是否存在
        if (parentId) {
            const parentCategory = await Category.findById(parentId);
            if (!parentCategory) {
                return res.status(400).json(
                    error(CLIENT_ERROR.BAD_REQUEST, '父分类不存在')
                );
            }
        }

        const category = new Category({
            name,
            description,
            parentId,
            image,
            createdBy: req.user._id
        });

        await category.save();

        res.status(SUCCESS.CREATED).json(
            success(category, '分类创建成功')
        );
    } catch (err) {
        console.error('创建分类错误:', err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '创建分类失败')
        );
    }
};

// 获取分类列表
exports.getCategories = async (req, res) => {
    try {
        // 获取所有分类
        const categories = await Category.find()
            .select('name description image parentId')
            .lean();  // 转换为普通对象，便于修改

        // 构建分类树并计算文章总数
        const categoryMap = new Map();
        const rootCategories = [];

        // 首先构建一个 Map 用于快速查找
        categories.forEach(category => {
            categoryMap.set(category._id.toString(), {
                ...category,
                children: [],
                articleCount: 0  // 初始化文章计数
            });
        });

        // 获取每个分类的直接文章数量
        const articleCounts = await Article.aggregate([
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);

        // 设置每个分类的直接文章数量
        articleCounts.forEach(({ _id, count }) => {
            if (_id) {
                const category = categoryMap.get(_id.toString());
                if (category) {
                    category.articleCount = count;
                }
            }
        });

        // 构建树形结构
        categories.forEach(category => {
            const categoryWithChildren = categoryMap.get(category._id.toString());
            if (category.parentId) {
                // 如果有父分类，添加到父分类的 children 中
                const parent = categoryMap.get(category.parentId.toString());
                if (parent) {
                    parent.children.push(categoryWithChildren);
                }
            } else {
                // 没有父分类的作为根节点
                rootCategories.push(categoryWithChildren);
            }
        });

        // 递归计算每个分类的总文章数（包含子分类的文章数）
        const calculateTotalArticles = (category) => {
            let total = category.articleCount || 0;
            if (category.children && category.children.length > 0) {
                category.children.forEach(child => {
                    total += calculateTotalArticles(child);
                });
            }
            category.articleCount = total;
            return total;
        };

        // 计算每个根分类的总文章数
        rootCategories.forEach(category => {
            calculateTotalArticles(category);
        });

        res.json(success({
            categories: rootCategories
        }));
    } catch (err) {
        console.error('获取分类列表错误:', err);
        res.status(500).json(
            error(SERVER_ERROR.INTERNAL_ERROR, '获取分类列表失败')
        );
    }
};

// 获取分类详情
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parentId', 'name')
            .populate('createdBy', 'username');

        if (!category) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '分类不存在'
            });
        }

        res.json({
            code: SUCCESS.OK,
            data: category
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取分类详情失败'
        });
    }
};

// 更新分类
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, parentId, image } = req.body;
        const categoryId = req.params.id;

        // 检查分类是否存在
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '分类不存在'
            });
        }

        // 如果更改了名称，检查新名称是否已存在
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                    code: CLIENT_ERROR.BAD_REQUEST,
                    message: '分类名称已存在'
                });
            }
        }

        // 如果更改了父分类，检查父分类是否存在
        if (parentId && parentId !== category.parentId?.toString()) {
            const parentCategory = await Category.findById(parentId);
            if (!parentCategory) {
                return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                    code: CLIENT_ERROR.BAD_REQUEST,
                    message: '父分类不存在'
                });
            }
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { name, description, parentId, image },
            { new: true }
        ).populate('parentId', 'name');

        res.json({
            code: SUCCESS.OK,
            message: '分类更新成功',
            data: updatedCategory
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '更新分类失败'
        });
    }
};

// 删除分类
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        // 检查分类是否存在
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '分类不存在'
            });
        }

        // 检查是否有子分类
        const hasChildren = await Category.exists({ parentId: categoryId });
        if (hasChildren) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '请先删除子分类'
            });
        }

        // 检查分类下是否有文章
        const hasArticles = await Article.exists({ categoryId });
        if (hasArticles) {
            return res.status(CLIENT_ERROR.BAD_REQUEST).json({
                code: CLIENT_ERROR.BAD_REQUEST,
                message: '该分类下存在文章，无法删除'
            });
        }

        await Category.findByIdAndDelete(categoryId);

        res.json({
            code: SUCCESS.OK,
            message: '分类删除成功'
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '删除分类失败'
        });
    }
};

// 获取分类下的文章
exports.getCategoryArticles = async (req, res) => {
    try {
        const { 
            page = 1, 
            pageSize = 10, 
            sort = '-createdAt' 
        } = req.query;
        const categoryId = req.params.id;

        // 检查分类是否存在
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(CLIENT_ERROR.NOT_FOUND).json({
                code: CLIENT_ERROR.NOT_FOUND,
                message: '分类不存在'
            });
        }

        // 查询该分类下的文章
        const query = { categoryId };
        const total = await Article.countDocuments(query);

        const articles = await Article.find(query)
            .sort(sort)
            .skip((page - 1) * pageSize)
            .limit(parseInt(pageSize))
            .populate('author', 'username avatar');

        res.json({
            code: SUCCESS.OK,
            data: {
                articles,
                pagination: {
                    total,
                    page: parseInt(page),
                    pageSize: parseInt(pageSize),
                    totalPages: Math.ceil(total / pageSize)
                }
            }
        });
    } catch (error) {
        res.status(SERVER_ERROR.INTERNAL_ERROR).json({
            code: SERVER_ERROR.INTERNAL_ERROR,
            message: '获取分类文章列表失败'
        });
    }
}; 