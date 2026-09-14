const prisma = require("../utills/db");

async function getFaqs(req, res) {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } });
    return res.json(faqs);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function createFaq(req, res) {
  try {
    const { question, answer, order } = req.body;
    if (!question || !answer) return res.status(400).json({ error: "Question and Answer required" });
    const count = await prisma.faq.count();
    const faq = await prisma.faq.create({
      data: {
        question,
        answer,
        order: order !== undefined ? parseInt(order) : count + 1,
      }
    });
    return res.status(201).json(faq);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function updateFaq(req, res) {
  try {
    const { id } = req.params;
    const { question, answer, order } = req.body;
    const updated = await prisma.faq.update({
      where: { id },
      data: {
        ...(question ? { question } : {}),
        ...(answer ? { answer } : {}),
        ...(order !== undefined ? { order: parseInt(order) } : {}),
      }
    });
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function deleteFaq(req, res) {
  try {
    const { id } = req.params;
    await prisma.faq.delete({ where: { id } });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { getFaqs, createFaq, updateFaq, deleteFaq };
