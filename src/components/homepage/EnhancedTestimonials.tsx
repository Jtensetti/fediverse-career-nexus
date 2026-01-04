import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote, CheckCircle, Star } from "lucide-react";

const testimonials = [
  {
    quote: "Finally, a professional network where I own my data. No more algorithmic manipulation or privacy concerns. This is how networking should work.",
    author: "Sarah Chen",
    role: "Senior Developer at Mozilla",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=b6e3f4",
    handle: "@sarah@fosstodon.org",
    verified: true,
    featured: true,
  },
  {
    quote: "The federation model means my network isn't locked into one platform. I can switch instances without losing connections. True data portability!",
    author: "Marcus Weber",
    role: "Tech Lead at Fairphone",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=d1d4f9",
    handle: "@marcus@mastodon.social",
    verified: true,
  },
  {
    quote: "Transparent, open-source, and community-driven. This is what professional networking should have been from the start.",
    author: "Priya Sharma",
    role: "Open Source Advocate",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya&backgroundColor=ffd5dc",
    handle: "@priya@hachyderm.io",
    verified: false,
  },
  {
    quote: "I found my current role through a connection made on Nolto. The quality of conversations here is leagues above traditional platforms.",
    author: "James Okoro",
    role: "DevOps Engineer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james&backgroundColor=c0aede",
    handle: "@james@tech.lgbt",
    verified: true,
  },
  {
    quote: "As someone who values privacy, Nolto gives me peace of mind. No tracking, no ads, just genuine professional connections.",
    author: "Emma Lindqvist",
    role: "Security Researcher",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma&backgroundColor=b5e8e3",
    handle: "@emma@infosec.exchange",
    verified: true,
  },
  {
    quote: "The job board is incredible - salary transparency on every listing. I wish I had discovered this sooner in my career.",
    author: "Carlos Rivera",
    role: "Product Manager",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos&backgroundColor=ffdfbf",
    handle: "@carlos@social.coop",
    verified: false,
  },
];

// Featured testimonial (larger, highlighted)
const featuredTestimonial = testimonials.find(t => t.featured);
const regularTestimonials = testimonials.filter(t => !t.featured);

const EnhancedTestimonials = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-5 w-5 fill-accent text-accent" />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
            Trusted by Professionals Who Value Freedom
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands of professionals building their networks on their own terms
          </p>
        </motion.div>

        {/* Featured Testimonial */}
        {featuredTestimonial && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                  <Avatar className="h-20 w-20 border-4 border-secondary/30 shadow-lg shrink-0">
                    <AvatarImage src={featuredTestimonial.avatar} alt={featuredTestimonial.author} />
                    <AvatarFallback className="bg-secondary/20 text-secondary text-2xl font-bold">
                      {featuredTestimonial.author.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center md:text-left">
                    <Quote className="h-10 w-10 text-primary/20 mb-4 mx-auto md:mx-0" />
                    <p className="text-xl md:text-2xl text-foreground font-medium leading-relaxed mb-6">
                      "{featuredTestimonial.quote}"
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="font-bold text-foreground">{featuredTestimonial.author}</span>
                      {featuredTestimonial.verified && (
                        <CheckCircle className="h-5 w-5 text-secondary" />
                      )}
                    </div>
                    <p className="text-muted-foreground">{featuredTestimonial.role}</p>
                    <p className="text-sm text-primary font-medium mt-1">{featuredTestimonial.handle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Regular Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {regularTestimonials.slice(0, 5).map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-primary/10 mb-4" />
                  <p className="text-foreground mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.author} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.author.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-sm">{testimonial.author}</span>
                        {testimonial.verified && (
                          <CheckCircle className="h-4 w-4 text-secondary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-primary font-medium">{testimonial.handle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EnhancedTestimonials;
