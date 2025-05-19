
// Mock data for development
export const mockUserProfile = {
  id: "user123",
  username: "johndoe",
  displayName: "John Doe",
  headline: "Senior Software Engineer | Web3 | ActivityPub Developer",
  bio: "Building decentralized social networks with a focus on privacy and user autonomy. Passionate about open web standards and federation protocols.",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
  isVerified: true,
  domain: "example.com",
  connections: 342,
  profileViews: 1289,
  contact: {
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA"
  },
  experience: [
    {
      id: "exp1",
      title: "Senior Software Engineer",
      company: "Decentralized Labs",
      isCurrentRole: true,
      startDate: "2020-06",
      endDate: "",
      location: "San Francisco, CA (Remote)",
      description: "Leading development of ActivityPub-based social networking platform.",
      isVerified: true
    },
    {
      id: "exp2",
      title: "Web Developer",
      company: "Tech Solutions Inc",
      isCurrentRole: false,
      startDate: "2016-03",
      endDate: "2020-05",
      location: "Portland, OR",
      description: "Developed and maintained client websites and web applications.",
      isVerified: true
    }
  ],
  education: [
    {
      id: "edu1",
      institution: "University of Technology",
      degree: "Master of Computer Science",
      field: "Distributed Systems",
      startYear: 2014,
      endYear: 2016,
      isVerified: true
    },
    {
      id: "edu2",
      institution: "State College",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startYear: 2010,
      endYear: 2014,
      isVerified: false
    }
  ],
  skills: [
    { id: "skill1", name: "JavaScript", endorsements: 78 },
    { id: "skill2", name: "React", endorsements: 65 },
    { id: "skill3", name: "Node.js", endorsements: 52 },
    { id: "skill4", name: "ActivityPub", endorsements: 43 },
    { id: "skill5", name: "TypeScript", endorsements: 38 },
    { id: "skill6", name: "Web Development", endorsements: 29 }
  ]
};
