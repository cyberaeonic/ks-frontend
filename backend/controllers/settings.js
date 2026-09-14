const prisma = require("../utills/db");

async function getSettings(req, res) {
  try {
    const list = await prisma.storeSetting.findMany();
    const settings = {};
    for (const item of list) {
      settings[item.key] = item.value;
    }
    return res.json(settings);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function updateSettings(req, res) {
  try {
    const entries = req.body;
    for (const [key, value] of Object.entries(entries)) {
      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return res.json({ success: true, message: "Settings saved successfully" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { getSettings, updateSettings };
