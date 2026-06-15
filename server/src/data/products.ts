// Simulated e-commerce catalog standing in for live platform data
// (Amazon/Flipkart/Myntra). Same adapter shape real affiliate/scraper APIs
// will implement later — prices in paise, effective price after offers.

export type ShopPlatform = "amazon" | "flipkart" | "myntra" | "croma";

export type ProductOffer = {
  label: string;
  discountPaise: number;
};

export type ProductListing = {
  platform: ShopPlatform;
  basePaise: number;
  deliveryDays: number;
  offers: ProductOffer[];
  inStock: boolean;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: "electronics" | "fashion" | "home" | "appliances";
  keywords: string[];
  rating: number;
  reviews: number;
  tag: string;
  reviewSummary: string;
  listings: ProductListing[];
};

export const products: Product[] = [
  {
    id: "gaming-laptop-rtx",
    name: "Nitro RTX Gaming Laptop",
    brand: "Acer",
    category: "electronics",
    keywords: ["laptop", "gaming", "rtx", "computer"],
    rating: 4.5,
    reviews: 2341,
    tag: "Best Seller",
    reviewSummary:
      "Strong GPU and fast performance; reviewers note average battery life. Great price-to-performance for gaming.",
    listings: [
      {
        platform: "flipkart",
        basePaise: 6949900,
        deliveryDays: 2,
        offers: [{ label: "Axis Bank 10% off", discountPaise: 300000 }],
        inStock: true,
      },
      {
        platform: "amazon",
        basePaise: 7199900,
        deliveryDays: 1,
        offers: [{ label: "HDFC ₹2000 off", discountPaise: 200000 }],
        inStock: true,
      },
      {
        platform: "croma",
        basePaise: 7099900,
        deliveryDays: 4,
        offers: [],
        inStock: true,
      },
    ],
  },
  {
    id: "wireless-earbuds",
    name: "Wireless Noise-Cancelling Earbuds",
    brand: "boAt",
    category: "electronics",
    keywords: ["earbuds", "headphones", "audio", "tws", "wireless"],
    rating: 4.3,
    reviews: 8821,
    tag: "Trending",
    reviewSummary:
      "Punchy bass and solid ANC for the price; mic quality is just okay on calls.",
    listings: [
      {
        platform: "amazon",
        basePaise: 199900,
        deliveryDays: 1,
        offers: [{ label: "Deal of the day", discountPaise: 50000 }],
        inStock: true,
      },
      {
        platform: "flipkart",
        basePaise: 219900,
        deliveryDays: 2,
        offers: [{ label: "SBI 5% off", discountPaise: 11000 }],
        inStock: true,
      },
    ],
  },
  {
    id: "running-shoes",
    name: "UltraBoost Running Shoes",
    brand: "Adidas",
    category: "fashion",
    keywords: ["shoes", "running", "sneakers", "footwear", "sports"],
    rating: 4.6,
    reviews: 5102,
    tag: "Top Rated",
    reviewSummary:
      "Excellent cushioning and true to size; premium feel that holds up over long runs.",
    listings: [
      {
        platform: "myntra",
        basePaise: 1299900,
        deliveryDays: 3,
        offers: [{ label: "Myntra 30% off", discountPaise: 390000 }],
        inStock: true,
      },
      {
        platform: "amazon",
        basePaise: 1199900,
        deliveryDays: 2,
        offers: [{ label: "Coupon SHOE10", discountPaise: 120000 }],
        inStock: true,
      },
      {
        platform: "flipkart",
        basePaise: 1249900,
        deliveryDays: 4,
        offers: [],
        inStock: false,
      },
    ],
  },
  {
    id: "smartwatch",
    name: "AMOLED Fitness Smartwatch",
    brand: "Noise",
    category: "electronics",
    keywords: ["smartwatch", "watch", "fitness", "wearable"],
    rating: 4.1,
    reviews: 12044,
    tag: "Value Pick",
    reviewSummary:
      "Bright display and accurate step tracking; companion app could be smoother.",
    listings: [
      {
        platform: "flipkart",
        basePaise: 299900,
        deliveryDays: 2,
        offers: [{ label: "Big Saving Days", discountPaise: 70000 }],
        inStock: true,
      },
      {
        platform: "amazon",
        basePaise: 319900,
        deliveryDays: 1,
        offers: [{ label: "ICICI ₹500 off", discountPaise: 50000 }],
        inStock: true,
      },
    ],
  },
  {
    id: "cotton-tshirt",
    name: "Premium Cotton Round-Neck T-Shirt",
    brand: "H&M",
    category: "fashion",
    keywords: ["tshirt", "t-shirt", "clothing", "shirt", "apparel"],
    rating: 4.2,
    reviews: 3310,
    tag: "Everyday",
    reviewSummary:
      "Soft, breathable fabric that keeps its shape; colours stay true after washes.",
    listings: [
      {
        platform: "myntra",
        basePaise: 99900,
        deliveryDays: 3,
        offers: [{ label: "Buy 2 get extra 20%", discountPaise: 20000 }],
        inStock: true,
      },
      {
        platform: "amazon",
        basePaise: 109900,
        deliveryDays: 2,
        offers: [],
        inStock: true,
      },
    ],
  },
  {
    id: "air-fryer",
    name: "5.5L Digital Air Fryer",
    brand: "Philips",
    category: "appliances",
    keywords: ["air fryer", "airfryer", "kitchen", "appliance", "cooking"],
    rating: 4.4,
    reviews: 6790,
    tag: "Kitchen Favourite",
    reviewSummary:
      "Crisps food evenly with little oil; large basket is great for families.",
    listings: [
      {
        platform: "croma",
        basePaise: 899900,
        deliveryDays: 4,
        offers: [{ label: "Exchange bonus", discountPaise: 100000 }],
        inStock: true,
      },
      {
        platform: "amazon",
        basePaise: 949900,
        deliveryDays: 2,
        offers: [{ label: "HDFC 10% off", discountPaise: 90000 }],
        inStock: true,
      },
      {
        platform: "flipkart",
        basePaise: 929900,
        deliveryDays: 3,
        offers: [],
        inStock: true,
      },
    ],
  },
];
