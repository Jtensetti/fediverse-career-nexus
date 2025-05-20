import { ConnectionDegree } from "@/components/ConnectionBadge";

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
      id: "1",
      username: "alexjohnson",
      displayName: "Alex Johnson",
      headline: "Senior Software Engineer at TechCorp",
      avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      connectionDegree: 1,
      isVerified: true,
      mutualConnections: 12
    },
    {
      id: "2",
      username: "sarahlee",
      displayName: "Sarah Lee",
      headline: "Product Manager | Former UX Designer",
      avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      connectionDegree: 1,
      isVerified: true,
      mutualConnections: 8
    },
    {
      id: "3",
      username: "michaelwu",
      displayName: "Michael Wu",
      headline: "Data Scientist & Machine Learning Engineer",
      avatarUrl: "https://randomuser.me/api/portraits/men/22.jpg",
      connectionDegree: 1,
      isVerified: false,
      mutualConnections: 5
    }
  ],
  suggestions: [
    {
      id: "4",
      username: "emilychen",
      displayName: "Emily Chen",
      headline: "Marketing Director at GrowthX",
      avatarUrl: "https://randomuser.me/api/portraits/women/28.jpg",
      connectionDegree: 2,
      mutualConnections: 3
    },
    {
      id: "5",
      username: "davidpatel",
      displayName: "David Patel",
      headline: "Startup Founder & Angel Investor",
      avatarUrl: "https://randomuser.me/api/portraits/men/53.jpg",
      connectionDegree: 2,
      mutualConnections: 7
    },
    {
      id: "6",
      username: "jenniferlopez",
      displayName: "Jennifer Lopez",
      headline: "Sr. Frontend Engineer | React Specialist",
      avatarUrl: "https://randomuser.me/api/portraits/women/90.jpg",
      connectionDegree: 3,
      mutualConnections: 1
    }
  ]
};
