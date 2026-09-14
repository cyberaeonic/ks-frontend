const prisma = require('../utills/db');

async function main() {
  console.log('🌱 Starting Krishika Store database seeding...');

  // 1. Merchant
  const merchant = await prisma.merchant.upsert({
    where: { id: 'default-merchant' },
    update: {},
    create: {
      id: 'default-merchant',
      name: 'Sree Meenakshi Handicrafts',
      description: 'Generational Kanyakumari artisans offering authentic handcrafted stone, wood, and brass sculptures.',
      email: 'info@sreemeenakshihandicrafts.com',
      phone: '+919944910653',
      address: 'Main Beach Road, Near Sunset Point, Kanyakumari, Tamil Nadu, 629702',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Merchant initialized:', merchant.name);

  // 2. Categories
  const categoryNames = ['Wood & Brass', 'Stone & Marble', 'Resin & Fiber', 'Spiritual & Temple'];
  const categoryMap = {};

  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap[name] = cat.id;
  }
  console.log('✅ Categories created:', Object.keys(categoryMap));

  // 3. Products
  const seedProducts = [
    {
      id: 'prod_ganesha_teak',
      slug: 'authentic-carved-wooden-ganesha-idol',
      title: 'Authentic Carved Wooden Ganesha Idol',
      mainImage: 'Pics/carved_wooden_ganesha.jpg',
      price: 4499,
      originalPrice: 5999,
      rating: 5,
      description: 'Masterfully hand-carved Teak wood Lord Ganesha idol by generational Kanyakumari artisans. Features intricate mukut details, floral pedestal, and natural protective oil finish.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 15,
      badgeTag: 'Best Seller',
      featured: true,
      categoryName: 'Wood & Brass',
    },
    {
      id: 'prod_brass_diya',
      slug: 'antique-heritage-brass-peacock-diya',
      title: 'Antique Heritage Brass Peacock Diya',
      mainImage: 'Pics/brass_diya_lamp.jpg',
      price: 2899,
      originalPrice: 3499,
      rating: 5,
      description: 'Solid brass traditional south Indian peacock hanging oil lamp (Mayil Vilakku). Crafted with high-grade virgin brass, bringing auspicious temple serenity into your living sanctuary.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 20,
      badgeTag: 'Exclusive',
      featured: true,
      categoryName: 'Wood & Brass',
    },
    {
      id: 'prod_soapstone_elephant',
      slug: 'soapstone-elephant-with-internal-jali-baby',
      title: 'Soapstone Elephant with Internal Jali Baby',
      mainImage: 'Pics/749419433_1052687420627433_4165588852915451748_n.jpg',
      price: 1899,
      originalPrice: 2499,
      rating: 5,
      description: 'Single-stone hand-chiseled Gorara soapstone elephant figurine showcasing breathtaking fretwork (jali carving) revealing an inner baby elephant.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 12,
      badgeTag: 'New Arrival',
      featured: true,
      categoryName: 'Stone & Marble',
    },
    {
      id: 'prod_temple_bell',
      slug: 'handcrafted-spiritual-temple-bell-and-stand',
      title: 'Handcrafted Spiritual Temple Bell & Stand',
      mainImage: 'Pics/749440358_1558153105664914_614682669612727368_n.jpg',
      price: 3299,
      originalPrice: 3999,
      rating: 5,
      description: 'Resonant temple ghanti forged with 5 sacred alloys (Panchaloha tone) mounted on an ornately engraved brass arched stand.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 8,
      badgeTag: 'Standard',
      featured: false,
      categoryName: 'Spiritual & Temple',
    },
    {
      id: 'prod_kamadhenu_cow',
      slug: 'sacred-cow-and-calf-kamadhenu-sculpture',
      title: 'Sacred Cow & Calf (Kamadhenu) Sculpture',
      mainImage: 'Pics/751914491_1350047553952715_5654833482815811500_n.jpg',
      price: 3799,
      originalPrice: 4799,
      rating: 5,
      description: 'Handmade brass Kamadhenu idol adorned with divine celestial motifs symbolizing abundance, prosperity, and peace for home mandirs.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 10,
      badgeTag: 'Featured',
      featured: true,
      categoryName: 'Wood & Brass',
    },
    {
      id: 'prod_nataraja_statue',
      slug: 'artisan-hand-carved-dancing-nataraja',
      title: 'Artisan Hand-Carved Dancing Nataraja',
      mainImage: 'Pics/752681929_2032440537380929_2070747995649624809_n.jpg',
      price: 6999,
      originalPrice: 8999,
      rating: 5,
      description: 'The cosmic dance of Shiva rendered in exquisite brass casting with fiery Prabhamandala halo and lotus pedestal.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 6,
      badgeTag: 'Exclusive',
      featured: true,
      categoryName: 'Spiritual & Temple',
    },
    {
      id: 'prod_sunset_conch',
      slug: 'kanyakumari-sunset-conch-and-stand',
      title: 'Kanyakumari Sunset Conch & Stand',
      mainImage: 'Pics/753857112_1733854944406453_8567350919718920667_n.jpg',
      price: 1499,
      originalPrice: 1999,
      rating: 5,
      description: 'Polished natural right-handed sea shell (Dakshinavarti shankh) on a hand-cast brass base.',
      manufacturer: 'Sree Meenakshi Handicrafts',
      inStock: 25,
      badgeTag: 'Standard',
      featured: false,
      categoryName: 'Resin & Fiber',
    }
  ];

  for (const item of seedProducts) {
    const categoryId = categoryMap[item.categoryName] || Object.values(categoryMap)[0];
    await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        mainImage: item.mainImage,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        description: item.description,
        inStock: item.inStock,
        badgeTag: item.badgeTag,
        featured: item.featured,
        categoryId: categoryId,
        merchantId: merchant.id,
      },
      create: {
        id: item.id,
        slug: item.slug,
        title: item.title,
        mainImage: item.mainImage,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        description: item.description,
        inStock: item.inStock,
        badgeTag: item.badgeTag,
        featured: item.featured,
        categoryId: categoryId,
        merchantId: merchant.id,
      },
    });
  }
  console.log('✅ Seeded', seedProducts.length, 'products');

  // 4. Default Store Settings
  const defaultSettings = {
    storeName: 'Sree Meenakshi Handicrafts',
    storeSubtitle: 'Handicrafts • Kanyakumari',
    whatsappNumber: '919944910653',
    storeEmail: 'info@sreemeenakshihandicrafts.com',
    storeAddress: 'Main Beach Road, Near Sunset Point, Kanyakumari, Tamil Nadu, 629702',
    currency: '₹',
    razorpayKey: 'rzp_test_placeholder_key',
    shippingFee: '150',
    freeShippingThreshold: '2999',
    adminPin: 'admin123',
    topBannerText1: '✨ Complimentary FREE Delivery on orders above ₹2,999',
    topBannerHighlight: '🎉 Use Coupon HERITAGE10 for 10% OFF',
    couponCode: 'HERITAGE10',
    couponDiscountPct: '10',
    welcomeCouponCode: 'WELCOME5',
    welcomeDiscountPct: '5'
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  console.log('✅ Store settings initialized');

  // 5. Default FAQs
  const defaultFaqs = [
    {
      id: 'faq_1',
      question: 'Are all sculptures genuinely handmade?',
      answer: 'Yes, 100%! Every single piece is carved, polished, and finished by generational artisans at our Kanyakumari workshop using traditional Indian tools and natural materials.',
      order: 1,
    },
    {
      id: 'faq_2',
      question: 'What payment methods do you accept?',
      answer: 'We support all major online payment modes including UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, and NetBanking via secure Razorpay checkout, as well as direct WhatsApp 1-click order confirmation.',
      order: 2,
    },
    {
      id: 'faq_3',
      question: 'How are items packed to prevent transit breakage?',
      answer: 'We use 4-tier reinforced packaging: moisture-barrier bubble wrap, heavy-duty molded thermocol foam casing, double-walled corrugated outer carton, and fragile wooden bracing for high-value stone and wood pieces.',
      order: 3,
    },
    {
      id: 'faq_4',
      question: 'Can I place bulk or custom gifting orders?',
      answer: 'Absolutely! We specialize in custom corporate gifts, wedding favors, and wholesale gallery shipments. Please use the contact form below or message us directly on WhatsApp.',
      order: 4,
    }
  ];

  for (const faq of defaultFaqs) {
    await prisma.faq.upsert({
      where: { id: faq.id },
      update: { question: faq.question, answer: faq.answer, order: faq.order },
      create: faq,
    });
  }
  console.log('✅ FAQs initialized');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
