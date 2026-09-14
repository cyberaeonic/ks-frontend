const express = require('express');
const router = express.Router();
const { getFaqs, createFaq, updateFaq, deleteFaq } = require('../controllers/faqs');

router.route('/')
  .get(getFaqs)
  .post(createFaq);

router.route('/:id')
  .put(updateFaq)
  .delete(deleteFaq);

module.exports = router;
