const express = require('express');
const router = express.Router();
const { getEnquiries, createEnquiry } = require('../controllers/enquiries');

router.route('/')
  .get(getEnquiries)
  .post(createEnquiry);

module.exports = router;
