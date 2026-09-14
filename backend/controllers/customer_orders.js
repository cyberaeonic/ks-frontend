const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

async function createCustomerOrder(req, res) {
  try {
    const {
      name,
      lastname,
      phone,
      email,
      company,
      adress,
      address,
      apartment,
      postalCode,
      pincode,
      city,
      country,
      orderNotice,
      total,
      subtotal,
      shipping,
      discount,
      paymentMethod,
      paymentStatus,
      status,
      items,
      products
    } = req.body;

    const custName = name || 'Valued Customer';
    const custPhone = phone || '';
    const custEmail = email || '';
    const custAddress = adress || address || '';
    const custPostalCode = postalCode || pincode || '';
    const custCity = city || '';
    const orderTotal = parseInt(total) || 0;

    const order = await prisma.customer_order.create({
      data: {
        name: custName,
        lastname: lastname || '',
        phone: custPhone,
        email: custEmail,
        company: company || '',
        adress: custAddress,
        apartment: apartment || '',
        postalCode: custPostalCode,
        status: status || 'Pending',
        paymentMethod: paymentMethod || 'razorpay',
        paymentStatus: paymentStatus || 'Pending',
        subtotal: parseInt(subtotal) || orderTotal,
        shipping: parseInt(shipping) || 0,
        discount: parseInt(discount) || 0,
        city: custCity,
        country: country || 'India',
        orderNotice: orderNotice || '',
        total: orderTotal,
        dateTime: new Date(),
      }
    });

    const orderItems = items || products || [];
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      for (const item of orderItems) {
        const prodId = item.id || item.productId;
        if (prodId) {
          const existingProd = await prisma.product.findUnique({ where: { id: prodId } });
          if (existingProd) {
            await prisma.customer_order_product.create({
              data: {
                customerOrderId: order.id,
                productId: prodId,
                quantity: parseInt(item.quantity) || 1,
              }
            });
            const newStock = Math.max(0, existingProd.inStock - (parseInt(item.quantity) || 1));
            await prisma.product.update({
              where: { id: prodId },
              data: { inStock: newStock }
            });
          }
        }
      }
    }

    const fullOrder = await prisma.customer_order.findUnique({
      where: { id: order.id },
      include: {
        products: {
          include: { product: true }
        }
      }
    });

    return res.status(201).json(fullOrder);
  } catch (err) {
    console.error("Order creation error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function getAllOrders(req, res) {
  try {
    const orders = await prisma.customer_order.findMany({
      orderBy: { dateTime: 'desc' },
      include: {
        products: {
          include: { product: true }
        }
      }
    });

    // Format for easy consumption by admin table
    const formatted = orders.map(o => ({
      orderId: o.id,
      id: o.id,
      date: o.dateTime ? o.dateTime.toISOString() : new Date().toISOString(),
      customer: {
        name: o.name + (o.lastname ? ' ' + o.lastname : ''),
        email: o.email,
        phone: o.phone,
        address: o.adress,
        city: o.city,
        pincode: o.postalCode,
        notes: o.orderNotice,
      },
      name: o.name,
      phone: o.phone,
      email: o.email,
      address: o.adress,
      city: o.city,
      total: o.total,
      subtotal: o.subtotal,
      shipping: o.shipping,
      discount: o.discount,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      items: o.products.map(p => ({
        id: p.productId,
        title: p.product ? p.product.title : 'Sculpture',
        price: p.product ? p.product.price : 0,
        quantity: p.quantity,
        image: p.product ? p.product.mainImage : '',
      })),
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Get orders error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function getCustomerOrder(req, res) {
  const { id } = req.params;
  const order = await prisma.customer_order.findUnique({
    where: { id },
    include: {
      products: {
        include: { product: true }
      }
    }
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.json(order);
}

async function updateCustomerOrder(req, res) {
  try {
    const { id } = req.params;
    const { status, paymentStatus, orderNotice } = req.body;
    const updated = await prisma.customer_order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(orderNotice ? { orderNotice } : {}),
      },
      include: {
        products: {
          include: { product: true }
        }
      }
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteCustomerOrder(req, res) {
  try {
    const { id } = req.params;
    await prisma.customer_order_product.deleteMany({ where: { customerOrderId: id } });
    await prisma.customer_order.delete({ where: { id } });
    return res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCustomerOrder,
  getAllOrders,
  getCustomerOrder,
  updateCustomerOrder,
  deleteCustomerOrder,
};
