export const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Pepperoni Feast",
    description: "Generous layers of premium beef pepperoni, melted mozzarella cheese, and our signature slow-simmered tomato sauce on a hand-tossed crust.",
    price: 1499,
    category: "Pizzas",
    image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 2,
    name: "Veggie Delight",
    description: "A colorful garden mix of fresh bell peppers, red onions, mushrooms, black olives, and juicy tomatoes on a mozzarella bed.",
    price: 1299,
    category: "Pizzas",
    image_url: "https://images.unsplash.com/photo-1571066811602-716837d681de?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 3,
    name: "BBQ Chicken Pizza",
    description: "Tender grilled chicken chunks, smoky barbecue sauce, thinly sliced red onions, and fresh cilantro, topped with gooey mozzarella.",
    price: 1599,
    category: "Pizzas",
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 4,
    name: "Kukooo Double Smash",
    description: "Two smashed beef patties, double melted cheddar cheese, caramelized onions, pickles, and our secret Mr. Kukooo burger sauce on a toasted brioche bun.",
    price: 849,
    category: "Burgers",
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 5,
    name: "Spicy Crispy Chicken",
    description: "Crispy, golden-fried buttermilk chicken breast, spicy house mayo, shredded lettuce, and pickles on a toasted bun.",
    price: 799,
    category: "Burgers",
    image_url: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 6,
    name: "Cheesy Garlic Bread",
    description: "Toasted baguette slices smothered in rich garlic butter, topped with melted mozzarella and fresh parsley.",
    price: 399,
    category: "Sides",
    image_url: "https://images.unsplash.com/photo-1573145959956-e9fae6b8bd4f?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 7,
    name: "Golden Fries",
    description: "Crispy on the outside, fluffy on the inside. Perfectly salted and served hot with ketchup.",
    price: 249,
    category: "Sides",
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 8,
    name: "Coca-Cola",
    description: "Refreshing 500ml ice-cold bottle of classic Coca-Cola.",
    price: 120,
    category: "Drinks",
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 9,
    name: "Mango Smoothie",
    description: "Rich and creamy tropical blend made with 100% real ripe mangoes and Greek yogurt.",
    price: 350,
    category: "Drinks",
    image_url: "https://images.unsplash.com/photo-1536746803623-cef87080bfc8?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 10,
    name: "Kukooo Smash Deal",
    description: "Enjoy our signature Kukooo Double Smash burger with a side of Golden Fries and a chilled Coca-Cola.",
    price: 1099,
    category: "Burgers",
    image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
    is_available: true,
    quantity: 5, 
    is_deal: true,
    deal_items: [
      { product_id: "4", quantity: 1 }, 
      { product_id: "7", quantity: 1 }, 
      { product_id: "8", quantity: 1 }  
    ]
  }
,
  {
    id: 11,
    name: 'Mighty Zinger Burger',
    description: 'A colossal crispy chicken burger.',
    price: 399,
    category: 'Burgers',
    image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 12,
    name: 'Crispy Hot Wings',
    description: 'One piece of hot and crispy wing.',
    price: 60,
    category: 'Sides',
    image_url: 'https://images.unsplash.com/photo-1569691899455-88464f6d3ab1?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 13,
    name: 'Chicken Shawarma',
    description: 'Juicy chicken wrapped in a soft pita.',
    price: 199,
    category: 'Burgers',
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 14,
    name: 'Small Pizza',
    description: 'A delicious small pizza.',
    price: 499,
    category: 'Pizzas',
    image_url: 'https://images.unsplash.com/photo-1571066811602-716837d681de?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 15,
    name: 'Medium Pizza',
    description: 'A delicious medium pizza.',
    price: 899,
    category: 'Pizzas',
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 16,
    name: 'Large Pizza',
    description: 'A delicious large pizza.',
    price: 1299,
    category: 'Pizzas',
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 17,
    name: 'Half Cheesy Pasta',
    description: 'A half serving of our signature cheesy pasta.',
    price: 299,
    category: 'Sides',
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 18,
    name: '1 Liter Drink',
    description: '1 Liter bottle of chilled soda.',
    price: 199,
    category: 'Drinks',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
    is_available: true,
    quantity: 5,
    is_deal: false,
    deal_items: []
  },
  {
    id: 19,
    name: 'Mighty Deal',
    description: '1 Mighty Zinger Burger, 5 Hot Wings',
    price: 499,
    category: 'Azadi Deals',
    image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500',
    is_available: true,
    quantity: 5,
    is_deal: true,
    deal_items: [{ product_id: 11, quantity: 1 }, { product_id: 12, quantity: 5 }]
  },
  {
    id: 20,
    name: 'Shawarma Deal',
    description: '4 Chicken Shawarma',
    price: 649,
    category: 'Azadi Deals',
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
    is_available: true,
    quantity: 5,
    is_deal: true,
    deal_items: [{ product_id: 13, quantity: 4 }]
  },
  {
    id: 21,
    name: 'Family Combo',
    description: '1 Small Pizza, 1 Medium Pizza',
    price: 1149,
    category: 'Azadi Deals',
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
    is_available: true,
    quantity: 5,
    is_deal: true,
    deal_items: [{ product_id: 14, quantity: 1 }, { product_id: 15, quantity: 1 }]
  },
  {
    id: 22,
    name: 'Mega Feast',
    description: 'Large Pizza, Mighty Zinger Burger, 5 Crispy Wings, Half Cheesy Pasta, 1 liter Drink',
    price: 1947,
    category: 'Azadi Deals',
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
    is_available: true,
    quantity: 5,
    is_deal: true,
    deal_items: [
      { product_id: 16, quantity: 1 },
      { product_id: 11, quantity: 1 },
      { product_id: 12, quantity: 5 },
      { product_id: 17, quantity: 1 },
      { product_id: 18, quantity: 1 }
    ]
  }
];

export const INITIAL_OFFERS = [
  {
    id: 1,
    title: "Burger Festival - 20% Off All Burgers!",
    promo_image_url: "/banner_burger.png",
    active_status: true
  },
  {
    id: 2,
    title: "Pizza Madness - Buy 1 Get 1 Free Wednesday!",
    promo_image_url: "/banner_pizza.png",
    active_status: true
  }
];

export const INITIAL_ORDERS = [
  {
    order_id: "K0109-001",
    customer_name: "Alice Smith",
    customer_phone: "+92 300 1234567",
    customer_address: "Apartment 4B, Foodie Heights, Central Block",
    order_type: "Delivery",
    items: [
      {
        product_id: 1,
        name: "Pepperoni Feast",
        quantity: 5,
        price: 1499
      }
    ],
    total_amount: 2998,
    status: "Pending",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString() // 30 mins ago
  },
  {
    order_id: "K0109-002",
    customer_name: "Bob Jones",
    customer_phone: "+92 333 9876543",
    customer_address: "",
    order_type: "Pickup",
    items: [
      {
        product_id: 4,
        name: "Kukooo Double Smash",
        quantity: 5,
        price: 849
      },
      {
        product_id: 7,
        name: "Golden Fries",
        quantity: 5,
        price: 249
      }
    ],
    total_amount: 1098,
    status: "Preparing",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString() // 15 mins ago
  }
];

export const INITIAL_ADDONS = [
  { id: "add-coke", name: "Coca-Cola 350ml", price: 120, type: "drinks" },
  { id: "add-sprite", name: "Sprite 350ml", price: 120, type: "drinks" },
  { id: "add-fanta", name: "Fanta 350ml", price: 120, type: "drinks" },
  { id: "add-garlic-mayo", name: "Garlic Mayo Dip", price: 60, type: "sauces" },
  { id: "add-chili-garlic", name: "Chili Garlic Dip", price: 60, type: "sauces" },
  { id: "add-cheese-sauce", name: "Cheese Sauce Dip", price: 90, type: "sauces" },
  { id: "add-extra-cheese", name: "Extra Mozzarella Cheese", price: 150, type: "extras" },
  { id: "add-extra-patty", name: "Extra Beef Patty", price: 350, type: "extras" },
  { id: "add-extra-pepperoni", name: "Extra Pepperoni", price: 200, type: "extras" }
];

export const AVAILABLE_ADDONS = {
  drinks: [
    { id: "add-coke", name: "Coca-Cola 350ml", price: 120 },
    { id: "add-sprite", name: "Sprite 350ml", price: 120 },
    { id: "add-fanta", name: "Fanta 350ml", price: 120 }
  ],
  sauces: [
    { id: "add-garlic-mayo", name: "Garlic Mayo Dip", price: 60 },
    { id: "add-chili-garlic", name: "Chili Garlic Dip", price: 60 },
    { id: "add-cheese-sauce", name: "Cheese Sauce Dip", price: 90 }
  ],
  extras: [
    { id: "add-extra-cheese", name: "Extra Mozzarella Cheese", price: 150 },
    { id: "add-extra-patty", name: "Extra Beef Patty", price: 350 },
    { id: "add-extra-pepperoni", name: "Extra Pepperoni", price: 200 }
  ]
};

export const INITIAL_INGREDIENTS = [
  { id: "ing-bun", name: "Burger Buns", quantity: 50 },
  { id: "ing-pizza-dough", name: "Pizza Dough", quantity: 40 },
  { id: "ing-zinger", name: "Zinger Pieces", quantity: 60 },
  { id: "ing-wings", name: "Chicken Wings", quantity: 100 },
  { id: "ing-pepperoni", name: "Beef Pepperoni", quantity: 30 },
  { id: "ing-beef-patty", name: "Beef Patty", quantity: 50 },
  { id: "ing-pasta", name: "Pasta", quantity: 20 },
  { id: "ing-shawarma-bread", name: "Shawarma Bread", quantity: 40 },
  { id: "ing-coca-cola", name: "Coca-Cola 500ml", quantity: 100 },
  { id: "ing-coca-cola-1l", name: "Coca-Cola 1L", quantity: 80 }
];
