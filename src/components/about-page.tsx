'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Styles */}
      <style jsx>{`
        .smooth-transition { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .fade-in { animation: fadeIn 0.8s ease-in-out; }
        .slide-up { animation: slideUp 0.6s ease-out; }
        .hover-lift:hover { transform: translateY(-8px); }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }
        
        .team-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .team-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 25px 50px rgba(59, 130, 246, 0.15);
        }
        
        .timeline-item {
          position: relative;
        }
        
        .timeline-item::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 60px;
          bottom: -20px;
          width: 2px;
          background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
        }
        
        .timeline-item:last-child::before {
          display: none;
        }
        
        .value-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(29, 78, 216, 0.05) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
      `}</style>

      {/* Hero Section */}
      <section className="gradient-bg py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 fade-in">
            About <span className="text-blue-200">TecBunny</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90 slide-up">
            Empowering innovation through cutting-edge technology solutions since 2025
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center slide-up">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:shadow-xl smooth-transition hover-lift">
              Our Story
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-600 smooth-transition">
              Our Values
            </button>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From a small startup to a leading technology retailer, discover how we've grown to serve thousands of customers across India.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="timeline-item">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 gradient-bg rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg leading-tight">
                    <span className="text-sm">Aug</span>
                    <span className="text-xs opacity-90">2025</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Incorporated</h3>
                    <p className="text-gray-600">Formally incorporated in Goa with a mission to bring cutting-edge technology to every corner of India.</p>
                  </div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 gradient-bg rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg leading-tight">
                    <span className="text-sm">Sep</span>
                    <span className="text-xs opacity-90">2025</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Building</h3>
                    <p className="text-gray-600">Assembled a world-class team of trained service professionals and technology experts.</p>
                  </div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 gradient-bg rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg leading-tight">
                    <span className="text-sm">Oct</span>
                    <span className="text-xs opacity-90">2025</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Platform Launch</h3>
                    <p className="text-gray-600">Launched our cutting-edge e-commerce platform with enhanced customer service capabilities.</p>
                  </div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 gradient-bg rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg leading-tight">
                    <span className="text-sm">Nov</span>
                    <span className="text-xs opacity-90">2025</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Rapid Growth</h3>
                    <p className="text-gray-600">Achieved remarkable growth with thousands of satisfied customers and industry recognition.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 shadow-2xl">
                <div className="text-center">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    To democratize access to cutting-edge technology by providing high-quality products, 
                    exceptional customer service, and competitive pricing. We believe technology should 
                    enhance lives and empower businesses to reach their full potential.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision & Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do and shape our company culture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="value-card rounded-2xl p-8 text-center hover-lift smooth-transition">
              <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Quality First</h3>
              <p className="text-gray-600 leading-relaxed">
                We never compromise on quality. Every product we sell meets our rigorous standards for performance, durability, and value.
              </p>
            </div>

            <div className="value-card rounded-2xl p-8 text-center hover-lift smooth-transition">
              <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Centric</h3>
              <p className="text-gray-600 leading-relaxed">
                Our customers are at the heart of everything we do. We listen, adapt, and continuously improve to exceed expectations.
              </p>
            </div>

            <div className="value-card rounded-2xl p-8 text-center hover-lift smooth-transition">
              <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Innovation</h3>
              <p className="text-gray-600 leading-relaxed">
                We embrace change and continuously seek new ways to improve our products, services, and customer experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose TecBunny?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover what sets us apart in the competitive world of technology retail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition border">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Fast Delivery</h3>
              <p className="text-gray-600">Get your orders delivered quickly across India with our reliable logistics network.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition border">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Warranty Protection</h3>
              <p className="text-gray-600">Comprehensive warranty coverage and hassle-free returns to ensure your complete satisfaction.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition border">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Expert Support</h3>
              <p className="text-gray-600">Our trained professionals provide expert support and personalized assistance 24/7.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition border">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Best Prices</h3>
              <p className="text-gray-600">Competitive pricing with regular deals and discounts to give you the best value for money.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition border">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Genuine Products</h3>
              <p className="text-gray-600">All products are authentic, certified, and sourced directly from authorized manufacturers.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition border">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Latest Technology</h3>
              <p className="text-gray-600">Stay ahead with the newest releases and cutting-edge technology products in the market.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to connect? We're here to help you with all your technology needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">WhatsApp Us</h3>
              <p className="text-gray-600 mb-6">Quick responses for urgent queries</p>
              <a 
                href="https://wa.me/919429694995" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 smooth-transition inline-block"
              >
                Chat Now
              </a>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Email Us</h3>
              <p className="text-gray-600 mb-6">For detailed inquiries and support</p>
              <a 
                href="mailto:support@tecbunny.com"
                className="bg-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-600 smooth-transition inline-block"
              >
                Send Email
              </a>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift smooth-transition text-center">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Visit Us</h3>
              <p className="text-gray-600 mb-4">Parcem, Pernem, Goa - 403512</p>
              <p className="text-sm text-gray-500 mb-6">GST No: 30AAMCT1608G1ZO</p>
              <a 
                href="https://maps.google.com/?q=Parcem,+Pernem,+Goa+403512" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-red-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-red-600 smooth-transition inline-block"
              >
                Get Directions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 gradient-bg text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Experience the Difference?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of satisfied customers who trust TecBunny for their technology needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/products"
              className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:shadow-xl smooth-transition hover-lift inline-block"
            >
              Shop Now
            </Link>
            <Link 
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-600 smooth-transition inline-block"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
} 
