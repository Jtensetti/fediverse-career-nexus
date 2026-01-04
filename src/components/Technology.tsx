
import { Separator } from "@/components/ui/separator";

const Technology = () => {
  const techStack = [
    {
      category: "Frontend",
      technologies: ["React + TypeScript", "Tailwind CSS", "SSR Fallback"]
    },
    {
      category: "API",
      technologies: ["GraphQL Facade", "ActivityPub Endpoints"]
    },
    {
      category: "Backend",
      technologies: ["Elixir/Phoenix", "TypeScript/Node", "ActivityPub Protocol"]
    },
    {
      category: "Database",
      technologies: ["PostgreSQL", "JSONB Objects", "Neo4j Graph Cache"]
    },
    {
      category: "Jobs & Caching",
      technologies: ["Redis", "Sidekiq/BullMQ", "CDN for Media"]
    },
    {
      category: "Media & Live",
      technologies: ["PeerTube", "Jitsi WebRTC", "nginx-RTMP"]
    },
    {
      category: "Scalability",
      technologies: ["DB Read-Replicas", "Sharded Federation", "Stateless Web Pods"]
    }
  ];

  return (
    <section id="technology" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Built with Modern Technology
          </h2>
          <p className="text-lg text-muted-foreground">
            Federation is designed from the ground up for scalability, performance, and interoperability through the ActivityPub protocol.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-md overflow-hidden border">
          <div className="p-6">
            <h3 className="text-xl font-medium mb-6 text-primary">Technology Stack</h3>
            
            <div className="space-y-8">
              {techStack.map((tech, index) => (
                <div key={index}>
                  <h4 className="text-lg font-medium text-primary mb-3">{tech.category}</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tech.technologies.map((item, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                  {index < techStack.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-display font-bold mb-6 text-center">
            Scalability & Security
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h4 className="text-lg font-medium text-primary mb-4">Horizontal Scaling</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>Stateless web nodes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>Sharded queues for federation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>PostgreSQL read replicas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>CDN-ready asset pipeline</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h4 className="text-lg font-medium text-primary mb-4">Advanced Media Solutions</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>PeerTube integration for video hosting</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>RTMP server farm for live streaming</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>Neo4j graph database for connection analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                  <span>WebRTC for real-time communication</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Technology;
