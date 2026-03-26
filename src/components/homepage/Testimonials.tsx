import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Äntligen ett professionellt nätverk där vi äger vår data. Ingen algoritmisk manipulation eller integritetsproblem.",
    author: "Anna Lindström",
    role: "IT-chef, Göteborgs kommun",
    avatar: "AL",
    instance: "nolto.se"
  },
  {
    quote: "Federationsmodellen innebär att vårt nätverk inte är inlåst i en plattform. Vi kan byta instans utan att förlora kontakter.",
    author: "Erik Johansson",
    role: "Digitaliseringsstrateg, Region Skåne",
    avatar: "EJ",
    instance: "nolto.se"
  },
  {
    quote: "Transparent, öppen källkod och community-drivet. Det här är vad professionell nätverksbyggande borde ha varit från början.",
    author: "Maria Bergström",
    role: "Verksamhetsutvecklare, Arbetsförmedlingen",
    avatar: "MB",
    instance: "nolto.se"
  }
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
            Betrodd av yrkesverksamma som värdesätter frihet
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gå med tusentals yrkesverksamma som bygger sina nätverk på egna villkor
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
