const prisma = require("../utills/db");

async function getEnquiries(req, res) {
  try {
    const list = await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function createEnquiry(req, res) {
  try {
    const { name, phone, interest, message } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Name and Phone are required" });
    const enquiry = await prisma.enquiry.create({
      data: {
        name,
        phone,
        interest: interest || '',
        message: message || '',
      }
    });
    return res.status(201).json(enquiry);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { getEnquiries, createEnquiry };
