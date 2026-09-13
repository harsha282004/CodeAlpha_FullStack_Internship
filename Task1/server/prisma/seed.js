import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const products = [
  {
    name: 'Classic Cotton T-Shirt',
    slug: 'classic-cotton-t-shirt',
    description: 'A soft, breathable everyday t-shirt made from 100% combed cotton.',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    category: 'apparel',
    stock: 120,
  },
  {
    name: 'Slim Fit Denim Jeans',
    slug: 'slim-fit-denim-jeans',
    description: 'Durable stretch-denim jeans with a modern slim fit.',
    price: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    category: 'apparel',
    stock: 75,
  },
  {
    name: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    description: 'Over-ear headphones with active noise cancellation and 30-hour battery life.',
    price: 89.99,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    category: 'electronics',
    stock: 40,
  },
  {
    name: 'Smart Fitness Watch',
    slug: 'smart-fitness-watch',
    description: 'Track your workouts, heart rate, and sleep with this everyday smart watch.',
    price: 129.99,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    category: 'electronics',
    stock: 30,
  },
  {
    name: 'Stainless Steel Water Bottle',
    slug: 'stainless-steel-water-bottle',
    description: 'Double-walled insulated bottle that keeps drinks cold for 24 hours.',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800',
    category: 'home',
    stock: 200,
  },
  {
    name: 'Ceramic Coffee Mug Set',
    slug: 'ceramic-coffee-mug-set',
    description: 'Set of 4 handcrafted ceramic mugs, dishwasher and microwave safe.',
    price: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800',
    category: 'home',
    stock: 90,
  },
  {
    name: 'Leather Laptop Backpack',
    slug: 'leather-laptop-backpack',
    description: 'Water-resistant backpack with padded laptop compartment, fits up to 15".',
    price: 74.99,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    category: 'accessories',
    stock: 55,
  },
  {
    name: 'Polarized Sunglasses',
    slug: 'polarized-sunglasses',
    description: 'UV400-protected polarized sunglasses with a lightweight aluminum frame.',
    price: 39.99,
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
    category: 'accessories',
    stock: 110,
  },

  // --- Clothing (apparel) ---
  {
    name: 'Fleece Pullover Hoodie',
    slug: 'fleece-pullover-hoodie',
    description: 'Cozy midweight fleece hoodie with a kangaroo pocket and adjustable drawstring hood.',
    price: 44.99,
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
    category: 'apparel',
    stock: 85,
  },
  {
    name: 'Classic White Crewneck Sweatshirt',
    slug: 'classic-white-crewneck-sweatshirt',
    description: 'A heavyweight cotton-blend crewneck sweatshirt with ribbed cuffs and hem.',
    price: 39.99,
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
    category: 'apparel',
    stock: 70,
  },
  {
    name: 'Faux Leather Moto Jacket',
    slug: 'faux-leather-moto-jacket',
    description: 'Water-resistant faux leather moto jacket with asymmetric zip and snap lapels.',
    price: 94.99,
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
    category: 'apparel',
    stock: 45,
  },
  {
    name: 'Chambray Casual Button-Down Shirt',
    slug: 'chambray-casual-button-down-shirt',
    description: 'Lightweight chambray button-down with a relaxed fit, perfect for everyday wear.',
    price: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    category: 'apparel',
    stock: 95,
  },
  {
    name: 'Elegant Red Evening Gown',
    slug: 'elegant-red-evening-gown',
    description: 'Flowing floor-length satin evening gown with a fitted bodice and full skirt.',
    price: 129.99,
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    category: 'apparel',
    stock: 25,
  },
  {
    name: 'Everyday Canvas Sneakers',
    slug: 'everyday-canvas-sneakers',
    description: 'Low-top sneakers with a durable canvas and leather upper and a cushioned sole.',
    price: 64.99,
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    category: 'apparel',
    stock: 100,
  },

  // --- Electronics ---
  {
    name: 'Portable Bluetooth Speaker',
    slug: 'portable-bluetooth-speaker',
    description: 'Rugged, waterproof Bluetooth speaker with rich bass and 12-hour battery life.',
    price: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    category: 'electronics',
    stock: 80,
  },
  {
    name: 'RGB Mechanical Keyboard',
    slug: 'rgb-mechanical-keyboard',
    description: 'Compact 65% mechanical keyboard with hot-swappable switches and RGB backlighting.',
    price: 89.99,
    imageUrl: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800',
    category: 'electronics',
    stock: 50,
  },
  {
    name: 'Ergonomic Wireless Mouse',
    slug: 'ergonomic-wireless-mouse',
    description: 'Contoured wireless mouse with silent clicks and adjustable DPI settings.',
    price: 27.99,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
    category: 'electronics',
    stock: 130,
  },
  {
    name: '7-in-1 USB-C Hub',
    slug: '7-in-1-usb-c-hub',
    description: 'Compact USB-C hub with HDMI, USB-A, SD card and fast-charging pass-through ports.',
    price: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1760376789487-994070337c76?w=800',
    category: 'electronics',
    stock: 100,
  },
  {
    name: '20000mAh Portable Power Bank',
    slug: '20000mah-portable-power-bank',
    description: 'High-capacity power bank with dual USB output for charging multiple devices on the go.',
    price: 32.99,
    imageUrl: 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?w=800',
    category: 'electronics',
    stock: 140,
  },
  {
    name: 'True Wireless Earbuds',
    slug: 'true-wireless-earbuds',
    description: 'Compact true wireless earbuds with a charging case and touch controls.',
    price: 59.99,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
    category: 'electronics',
    stock: 90,
  },

  // --- Accessories ---
  {
    name: 'Genuine Leather Bifold Wallet',
    slug: 'genuine-leather-bifold-wallet',
    description: 'Slim bifold wallet crafted from genuine leather with multiple card slots.',
    price: 29.99,
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800',
    category: 'accessories',
    stock: 150,
  },
  {
    name: 'Minimalist Analog Watch',
    slug: 'minimalist-analog-watch',
    description: 'Slim-profile analog watch with a leather strap and a clean, minimalist dial.',
    price: 79.99,
    imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
    category: 'accessories',
    stock: 65,
  },
  {
    name: 'Full-Grain Leather Belt',
    slug: 'full-grain-leather-belt',
    description: 'Classic full-grain leather belt with a polished metal buckle.',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800',
    category: 'accessories',
    stock: 120,
  },
  {
    name: 'Structured Baseball Cap',
    slug: 'structured-baseball-cap',
    description: 'Adjustable structured baseball cap with a curved brim and breathable mesh back.',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800',
    category: 'accessories',
    stock: 200,
  },
  {
    name: 'Quilted Crossbody Bag',
    slug: 'quilted-crossbody-bag',
    description: 'Compact quilted crossbody bag with an adjustable strap and zip closure.',
    price: 44.99,
    imageUrl: 'https://images.unsplash.com/photo-1620786514684-ff35b5aae55e?w=800',
    category: 'accessories',
    stock: 70,
  },

  // --- Home ---
  {
    name: 'Adjustable LED Desk Lamp',
    slug: 'adjustable-led-desk-lamp',
    description: 'Articulating LED desk lamp with adjustable brightness and a matte metal finish.',
    price: 32.99,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
    category: 'home',
    stock: 90,
  },
  {
    name: 'Striped Linen Throw Pillow',
    slug: 'striped-linen-throw-pillow',
    description: 'Soft linen-blend throw pillow cover with a hidden zipper closure.',
    price: 22.99,
    imageUrl: 'https://images.unsplash.com/photo-1616627561950-9f746e330187?w=800',
    category: 'home',
    stock: 110,
  },
  {
    name: 'Wall-Mounted Storage Cabinet',
    slug: 'wall-mounted-storage-cabinet',
    description: 'Wood-finish wall-mounted storage cabinet with open cubbies for towels and toiletries.',
    price: 149.99,
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
    category: 'home',
    stock: 25,
  },
  {
    name: 'Handmade Ceramic Vase',
    slug: 'handmade-ceramic-vase',
    description: 'Hand-thrown ceramic vase with a matte glaze, perfect for dried or fresh arrangements.',
    price: 29.99,
    imageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800',
    category: 'home',
    stock: 80,
  },
  {
    name: 'Soy Wax Scented Candle',
    slug: 'soy-wax-scented-candle',
    description: 'Hand-poured soy wax candle in a reusable glass jar with a 40-hour burn time.',
    price: 16.99,
    imageUrl: 'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=800',
    category: 'home',
    stock: 160,
  },

  // --- Fitness ---
  {
    name: 'Non-Slip Yoga Mat',
    slug: 'non-slip-yoga-mat',
    description: 'Extra-thick non-slip yoga mat with a lightweight, easy-to-carry design.',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800',
    category: 'fitness',
    stock: 130,
  },
  {
    name: 'Resistance Bands Set',
    slug: 'resistance-bands-set',
    description: 'Set of 5 latex resistance bands in varying strengths for strength and mobility training.',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1584827386916-b5351d3ba34b?w=800',
    category: 'fitness',
    stock: 150,
  },
  {
    name: '5kg Rubber Hex Dumbbell Set',
    slug: '5kg-rubber-hex-dumbbell-set',
    description: 'Pair of 5kg rubber-coated hex dumbbells with a chrome grip handle.',
    price: 79.99,
    imageUrl: 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=800',
    category: 'fitness',
    stock: 40,
  },
  {
    name: 'Fitness Tracker Band',
    slug: 'fitness-tracker-band',
    description: 'Slim fitness tracker band with heart-rate monitoring and sleep tracking.',
    price: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1557935728-e6d1eaabe558?w=800',
    category: 'fitness',
    stock: 95,
  },

  // --- Outdoor ---
  {
    name: '2-Person Camping Tent',
    slug: '2-person-camping-tent',
    description: 'Lightweight 2-person dome tent with a rainfly, ideal for backpacking and weekend trips.',
    price: 129.99,
    imageUrl: 'https://images.unsplash.com/photo-1550957886-ac45931e5779?w=800',
    category: 'outdoor',
    stock: 35,
  },
  {
    name: 'Insulated Cooler Bag',
    slug: 'insulated-cooler-bag',
    description: 'Leakproof insulated cooler bag with a reflective liner to keep food and drinks cold.',
    price: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1787074657878-f03844be1025?w=800',
    category: 'outdoor',
    stock: 75,
  },
  {
    name: 'Adjustable Trekking Poles (Pair)',
    slug: 'adjustable-trekking-poles-pair',
    description: 'Collapsible aluminum trekking poles with adjustable height and cushioned grips.',
    price: 39.99,
    imageUrl: 'https://images.unsplash.com/photo-1776006534692-2c35e298732a?w=800',
    category: 'outdoor',
    stock: 60,
  },

  // --- Lifestyle ---
  {
    name: 'Ultrasonic Aromatherapy Diffuser',
    slug: 'ultrasonic-aromatherapy-diffuser',
    description: 'Whisper-quiet ultrasonic diffuser that fills a room with mist and essential oil scent.',
    price: 28.99,
    imageUrl: 'https://images.unsplash.com/photo-1768471569643-717e823b5f9a?w=800',
    category: 'lifestyle',
    stock: 85,
  },
  {
    name: 'Chunky Knit Throw Blanket',
    slug: 'chunky-knit-throw-blanket',
    description: 'Oversized chunky knit throw blanket, hand-woven from soft chenille yarn.',
    price: 54.99,
    imageUrl: 'https://images.unsplash.com/photo-1674475760738-8c7af859f821?w=800',
    category: 'lifestyle',
    stock: 55,
  },
  {
    name: 'Leather-Bound Journal Notebook',
    slug: 'leather-bound-journal-notebook',
    description: 'Refillable leather-bound journal with a wraparound strap and unlined pages.',
    price: 18.99,
    imageUrl: 'https://images.unsplash.com/photo-1672256019300-9589d730bedd?w=800',
    category: 'lifestyle',
    stock: 140,
  },
]

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    })
  }

  const adminPasswordHash = await bcrypt.hash('Admin123!', 12)

  await prisma.user.upsert({
    where: { email: 'admin@shopsphere.dev' },
    update: {},
    create: {
      email: 'admin@shopsphere.dev',
      passwordHash: adminPasswordHash,
      name: 'ShopSphere Admin',
      role: 'admin',
    },
  })

  console.log(`Seeded ${products.length} products and 1 admin user.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
