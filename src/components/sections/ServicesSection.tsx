import Link from "next/link";

const services = [
  { title: "Merchandise", description: "Custom printed apparel, accessories, and promotional items.", href: "/products" },
  { title: "Large Format", description: "Banners, posters, signage, and display materials.", href: "/products" },
  { title: "Print", description: "Business cards, flyers, brochures, and stationery.", href: "/products" },
];

export function ServicesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Everything you need to promote your brand</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="group p-8 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
