import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Wifi,
  Shield,
  Zap,
  Users,
  BarChart3,
  CreditCard,
  Clock,
  Check,
  ArrowRight,
  Phone,
  Globe,
  Server,
  Smartphone,
  ChevronRight,
  Star,
} from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { MnetiFiLogo } from "@/components/mnetifi-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Wifi,
    title: "Hotspot Management",
    description: "Full control over hotspot users with automated billing and session management.",
  },
  {
    icon: Server,
    title: "PPPoE & Static IP",
    description: "Manage PPPoE and Static IP customers with monthly billing cycles.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa Integration",
    description: "Seamless M-Pesa STK Push for instant payments and automatic activation.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Monitor revenue, user activity, and network performance in real-time.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime guarantee.",
  },
  {
    icon: Users,
    title: "Multi-Tenant",
    description: "Complete tenant isolation with role-based access control.",
  },
];

const pricingPlans = [
  {
    name: "Trial",
    price: "Free",
    duration: "24 hours",
    description: "Try all features risk-free",
    features: [
      "Full platform access",
      "Hotspot management",
      "PPPoE/Static billing",
      "M-Pesa integration",
      "Basic support",
    ],
    highlighted: false,
  },
  {
    name: "Tier 1",
    price: "Ksh 500",
    duration: "/month",
    description: "For small ISPs",
    setup: "Ksh 500 setup fee",
    features: [
      "Hotspot OR PPPoE/Static",
      "Up to 500 users",
      "M-Pesa integration",
      "Email support",
      "Basic analytics",
    ],
    highlighted: false,
  },
  {
    name: "Tier 2",
    price: "Ksh 1,500",
    duration: "/month",
    description: "For growing ISPs",
    features: [
      "All features included",
      "Unlimited users",
      "SMS notifications",
      "Priority support",
      "Advanced analytics",
      "White-labeling",
      "API access",
    ],
    highlighted: true,
  },
];

const testimonials = [
  {
    name: "James Kamau",
    role: "CEO, FastNet ISP",
    content: "MnetiFi transformed our billing operations. We've seen 40% reduction in payment collection time.",
    rating: 5,
  },
  {
    name: "Mary Wanjiku",
    role: "Operations Manager, ConnectKE",
    content: "The M-Pesa integration is seamless. Our customers love the instant activation.",
    rating: 5,
  },
  {
    name: "Peter Ochieng",
    role: "Technical Director, WifiZone",
    content: "Best WiFi billing platform in Kenya. The support team is exceptional.",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <>
      <MeshBackground />
      <div className="min-h-screen relative z-10">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              <MnetiFiLogo size="sm" />
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-sm text-muted-foreground hover:text-white transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">
                  Pricing
                </a>
                <a href="#testimonials" className="text-sm text-muted-foreground hover:text-white transition-colors">
                  Testimonials
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="button-nav-login">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="gradient-btn" data-testid="button-nav-register">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-6">
                <Zap size={14} className="mr-1" />
                Kenya's Leading WiFi Billing Platform
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Automate Your <span className="gradient-text">WiFi Business</span> With Smart Billing
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Complete ISP management solution with M-Pesa integration, hotspot management, 
                PPPoE/Static billing, and real-time analytics.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="gradient-btn min-w-[200px]" data-testid="button-hero-start">
                    Start Free Trial
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="min-w-[200px] border-white/20">
                    Learn More
                    <ChevronRight size={18} className="ml-2" />
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-cyan-400" />
                  24-hour free trial
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-cyan-400" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-cyan-400" />
                  M-Pesa ready
                </div>
              </div>
            </motion.div>

            {/* Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-16 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
              <div className="glass-panel p-4 md:p-8 max-w-5xl mx-auto">
                <div className="aspect-video bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl flex items-center justify-center border border-white/10">
                  <div className="text-center p-8">
                    <Wifi size={64} className="text-cyan-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-white">Powerful Dashboard</p>
                    <p className="text-muted-foreground">Real-time insights at your fingertips</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 border-y border-white/10 bg-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "500+", label: "Active ISPs" },
                { value: "100K+", label: "End Users" },
                { value: "99.9%", label: "Uptime" },
                { value: "24/7", label: "Support" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-4">
                Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need to Run Your ISP
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From hotspot management to PPPoE billing, we've got all the tools you need to grow your business.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel glass-panel-hover p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                    <feature.icon size={24} className="text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 bg-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-4">
                Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Start with a free trial and upgrade as you grow. No hidden fees.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`glass-panel p-6 relative ${
                    plan.highlighted ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : ""
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white">
                      Most Popular
                    </Badge>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                      <span className="text-muted-foreground mb-1">{plan.duration}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    {plan.setup && (
                      <p className="text-xs text-cyan-400 mt-1">{plan.setup}</p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check size={16} className="text-cyan-400 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button
                      className={`w-full ${plan.highlighted ? "gradient-btn" : ""}`}
                      variant={plan.highlighted ? "default" : "outline"}
                      data-testid={`button-pricing-${plan.name.toLowerCase().replace(' ', '-')}`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-4">
                Testimonials
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Trusted by ISPs Across Kenya
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                See what our customers have to say about MnetiFi.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel p-6"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8 md:p-12 text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your ISP Business?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join hundreds of ISPs who have automated their billing with MnetiFi. 
                Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="gradient-btn min-w-[200px]" data-testid="button-cta-start">
                    Start Free Trial
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="min-w-[200px] border-white/20">
                    Sign In
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <MnetiFiLogo size="md" className="mb-4" />
                <p className="text-sm text-muted-foreground max-w-sm">
                  Kenya's leading WiFi billing platform for ISPs. Automate your business 
                  with M-Pesa integration, hotspot management, and real-time analytics.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#features" className="text-muted-foreground hover:text-white transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="text-muted-foreground hover:text-white transition-colors">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <Link href="/login" className="text-muted-foreground hover:text-white transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-muted-foreground hover:text-white transition-colors">
                      Register
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Contact</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} />
                    +254 700 000 000
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Globe size={14} />
                    support@mnetifi.com
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} MnetiFi. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
