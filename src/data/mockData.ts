
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
  networkVisibilityEnabled: true,
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

// Mock network data
export const mockNetworkData = {
  connections: [
    {
      id: "user456",
      username: "janedoe",
      displayName: "Jane Doe",
      headline: "Product Manager | UX Designer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=janedoe",
      connectionDegree: 1,
      isVerified: true,
      mutualConnections: 15
    },
    {
      id: "user789",
      username: "bobsmith",
      displayName: "Bob Smith",
      headline: "Frontend Developer | React Expert",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=bobsmith",
      connectionDegree: 1,
      isVerified: false,
      mutualConnections: 8
    },
    {
      id: "user101",
      username: "alicejohnson",
      displayName: "Alice Johnson",
      headline: "Data Scientist | Machine Learning",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alicejohnson",
      connectionDegree: 1,
      isVerified: true,
      mutualConnections: 5
    },
    {
      id: "user202",
      username: "mikewilson",
      displayName: "Mike Wilson",
      headline: "CTO | Blockchain Enthusiast",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mikewilson",
      connectionDegree: 2,
      isVerified: true,
      mutualConnections: 3
    },
    {
      id: "user303",
      username: "sarahlee",
      displayName: "Sarah Lee",
      headline: "UI/UX Designer | Design Systems",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarahlee",
      connectionDegree: 2,
      isVerified: false,
      mutualConnections: 2
    }
  ],
  suggestions: [
    {
      id: "user404",
      username: "davidbrown",
      displayName: "David Brown",
      headline: "Backend Developer | Node.js Expert",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=davidbrown",
      connectionDegree: 2,
      mutualConnections: 7
    },
    {
      id: "user505",
      username: "emmadavis",
      displayName: "Emma Davis",
      headline: "DevOps Engineer | Cloud Infrastructure",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=emmadavis",
      connectionDegree: 2,
      mutualConnections: 4
    }
  ]
};
