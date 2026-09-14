const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

function formatProduct(p) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category ? p.category.name : (p.categoryId || 'Handicrafts'),
    categoryId: p.categoryId,
    price: p.price,
    originalPrice: p.originalPrice || p.price,
    stock: p.inStock,
    inStock: p.inStock,
    description: p.description,
    image: p.mainImage,
    mainImage: p.mainImage,
    badgeTag: p.badgeTag || (p.featured ? 'Featured' : 'Standard'),
    featured: !!p.featured,
    rating: p.rating || 5,
    manufacturer: p.manufacturer || 'Sree Meenakshi Handicrafts',
    merchantId: p.merchantId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function generateSlug(title) {
  return (title || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
}

const getAllProducts = asyncHandler(async (req, res) => {
  const mode = req.query.mode || '';
  const categoryFilter = req.query.category;
  const searchFilter = req.query.search;
  const sort = req.query.sort || 'defaultSort';

  let where = {};

  if (categoryFilter && categoryFilter !== 'All') {
    where.category = {
      name: {
        contains: categoryFilter,
      }
    };
  }

  if (searchFilter) {
    where.OR = [
      { title: { contains: searchFilter } },
      { description: { contains: searchFilter } },
    ];
  }

  let orderBy = { createdAt: 'desc' };
  if (sort === 'lowPrice') orderBy = { price: 'asc' };
  else if (sort === 'highPrice') orderBy = { price: 'desc' };
  else if (sort === 'titleAsc') orderBy = { title: 'asc' };
  else if (sort === 'titleDesc') orderBy = { title: 'desc' };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: true,
    },
  });

  return res.json(products.map(formatProduct));
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id },
        { slug: id }
      ]
    },
    include: {
      category: true,
    }
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return res.json(formatProduct(product));
});

const createProduct = asyncHandler(async (req, res) => {
  const {
    title,
    price,
    originalPrice,
    description,
    image,
    mainImage,
    category,
    categoryId: explicitCategoryId,
    stock,
    inStock,
    badgeTag,
    featured,
    merchantId,
  } = req.body;

  if (!title) throw new AppError("Title is required", 400);
  if (price === undefined || price === null) throw new AppError("Price is required", 400);

  // 1. Resolve Category
  let catId = explicitCategoryId;
  if (!catId && category) {
    let cat = await prisma.category.findUnique({ where: { name: category } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: category } });
    }
    catId = cat.id;
  }
  if (!catId) {
    const defaultCat = await prisma.category.findFirst();
    catId = defaultCat ? defaultCat.id : (await prisma.category.create({ data: { name: 'Handicrafts' } })).id;
  }

  // 2. Resolve Merchant
  let merchId = merchantId;
  if (!merchId) {
    let merch = await prisma.merchant.findFirst();
    if (!merch) {
      merch = await prisma.merchant.create({
        data: {
          id: 'default-merchant',
          name: 'Sree Meenakshi Handicrafts',
          status: 'ACTIVE',
        }
      });
    }
    merchId = merch.id;
  }

  const slug = generateSlug(title);
  const prodImage = image || mainImage || 'Pics/749419433_1052687420627433_4165588852915451748_n.jpg';
  const prodStock = parseInt(stock !== undefined ? stock : inStock) || 10;
  const prodPrice = parseInt(price) || 0;
  const prodOrigPrice = parseInt(originalPrice) || prodPrice;

  const product = await prisma.product.create({
    data: {
      slug,
      title,
      mainImage: prodImage,
      price: prodPrice,
      originalPrice: prodOrigPrice,
      rating: 5,
      description: description || '',
      inStock: prodStock,
      badgeTag: badgeTag || 'Standard',
      featured: !!featured,
      categoryId: catId,
      merchantId: merchId,
    },
    include: {
      category: true,
    }
  });

  return res.status(201).json(formatProduct(product));
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    price,
    originalPrice,
    description,
    image,
    mainImage,
    category,
    categoryId: explicitCategoryId,
    stock,
    inStock,
    badgeTag,
    featured,
    rating
  } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError("Product not found", 404);

  let catId = explicitCategoryId;
  if (!catId && category) {
    let cat = await prisma.category.findUnique({ where: { name: category } });
    if (!cat) cat = await prisma.category.create({ data: { name: category } });
    catId = cat.id;
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (price !== undefined) updateData.price = parseInt(price) || 0;
  if (originalPrice !== undefined) updateData.originalPrice = parseInt(originalPrice) || 0;
  if (description !== undefined) updateData.description = description;
  if (image !== undefined || mainImage !== undefined) updateData.mainImage = image || mainImage;
  if (stock !== undefined || inStock !== undefined) updateData.inStock = parseInt(stock !== undefined ? stock : inStock) || 0;
  if (badgeTag !== undefined) updateData.badgeTag = badgeTag;
  if (featured !== undefined) updateData.featured = !!featured;
  if (rating !== undefined) updateData.rating = parseInt(rating) || 5;
  if (catId) updateData.categoryId = catId;

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: true }
  });

  return res.json(formatProduct(updated));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError("Product not found", 404);

  await prisma.product.delete({ where: { id } });
  return res.json({ success: true, message: "Product deleted successfully" });
});

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
