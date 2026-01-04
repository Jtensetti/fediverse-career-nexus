import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Finally, a professional network where I own my data. No more algorithmic manipulation or privacy concerns.",
    author: "Sarah Chen",
    role: "Senior Developer at Mozilla",
    avatar: "SC",
    instance: "fosstodon.org"
  },
  {
    quote: "The federation model means my network isn't locked into one platform. I can switch instances without losing connections.",
    author: "Marcus Weber",
    role: "Tech Lead at Fairphone",
    avatar: "MW",
    instance: "mastodon.social"
  },
  {
    quote: "Transparent, open-source, and community-driven. This is what professional networking should have been from the start.",
    author: "Priya Sharma",
    role: "Open Source Advocate",
    avatar: "PS",
    instance: "hachyderm.io"
  }
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
            Trusted by Professionals Who Value Freedom
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of professionals building their networks on their own terms
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/20 mb-4" />
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-primary">@{testimonial.instance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
