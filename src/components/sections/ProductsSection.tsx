import Link from "next/link";

const products = [
  { 
    name: "Bamboo Stylus Pen", 
    price: "From £0.58", 
    description: "Eco-friendly bamboo pen with stylus tip",
    image: "/product-pen.jpg"
  },
  { 
    name: "RPET Cooler Bag", 
    price: "From £5.22", 
    description: "Recycled polyester cooler bag",
    image: "/product-bag.jpg"
  },
  { 
    name: "Bamboo Lunch Box", 
    price: "From £6.26", 
    description: "Double stacked sustainable lunch box",
    image: "/product-lunchbox.jpg"
  },
  { 
    name: "Wooden Ball Pen", 
    price: "From £11.81", 
    description: "Premium engraved wood pen",
    image: "/product-woodpen.jpg"
  },
];

export function ProductsSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Custom printed merchandise for your brand</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <div key={product.name} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Product Image</div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                <p className="text-indigo-600 font-semibold mb-4">{product.price}</p>
                <Link 
                  href="/quote" 
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Upload Logo
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link 
            href="/products" 
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
          >
            View All Products
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
