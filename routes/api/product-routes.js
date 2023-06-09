const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  // find all products
  // be sure to include its associated Category and Tag data
  await Product.findAll({
    attributes: ['id', 'product_name', 'price', 'stock'],
    include: [
      { model: Category, attributes: ['category_name'] },
      { model: Tag, attributes: ['tag_name']}
    ]
  })
  .then(products => {
    res.json(products);
  })
  .catch(err => {
    console.log(err);
    res.status(500).json(err);
  });
});

// get one product
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

  // find a single product by its `id`
  // be sure to include its associated Category and Tag data
  const product = await Product.findOne({
    where: {id: productId },
    attributes: ['id', 'product_name', 'price', 'stock'],
    include: [
      { model: Category, attributes: ['category_name'] },
      { model: Tag, attributes: ['tag_name']}
    ]
  });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.json(product);
    }
  }
  catch(err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// create new product
router.post('/', async (req, res) => {
  const { product_name, price, stock, category_id, tagIds } = req.body

  await Product.create({
    product_name: product_name,
    price: price,
    stock: stock,
    category_id: category_id,
    tagIds: tagIds,
  })
    .then((product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds.length) {
        const productTagIdArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productTagIdArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((productTagIds) => res.status(200).json(productTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// update product
// update product data
router.put('/:id', (req, res) => {

  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {
      // find all associated tags from ProductTag
      return ProductTag.findAll({ where: { product_id: req.params.id } });
    })
    .then((productTags) => {
      // get list of current tag_ids
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);

      // run both actions
      return Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', async (req, res) => {
  try{
    const deleteId = req.params.id
    // delete one product by its `id` value
   const deleteProduct = await Product.destroy({
      where: { id: deleteId },
    });
    if (!deleteProduct) {
      return res.status(404).json({ error: "Product not found"})
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
