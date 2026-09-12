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
