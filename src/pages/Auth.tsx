
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { signIn, signUp } from "@/services/authService";

// Login form schema
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Signup form schema
const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine which tab to show based on URL path
  const defaultTab = location.pathname.includes("signup") ? "signup" : "login";
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Handle login
  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle signup
  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    
    try {
      await signUp(values.email, values.password);
      toast.success("Account created! Please check your email to confirm.");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bondy-background">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="container max-w-md px-4">
          <Card className="border-gray-200 shadow-lg bg-white">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 w-12 h-12 bg-bondy-primary/10 rounded-full flex items-center justify-center">
                <img 
                  src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                  alt="Bondy" 
                  className="w-8 h-8" 
                />
              </div>
              <CardTitle className="text-2xl font-display text-bondy-primary">
                Welcome to Bondy
              </CardTitle>
              <CardDescription>
                The professional network built for you
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="login" onClick={() => navigate("/auth/login", { replace: true })}>Sign In</TabsTrigger>
                  <TabsTrigger value="signup" onClick={() => navigate("/auth/signup", { replace: true })}>Create Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 animate-fade-in">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">
                                  <Mail size={16} />
                                </span>
                                <Input placeholder="you@example.com" {...field} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">
                                  <Lock size={16} />
                                </span>
                                <Input type="password" placeholder="•••••••" {...field} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full bg-bondy-primary" disabled={isLoading}>
                        {isLoading ? "Signing In..." : "Sign In"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4 animate-fade-in">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">
                                  <Mail size={16} />
                                </span>
                                <Input placeholder="you@example.com" {...field} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">
                                  <Lock size={16} />
                                </span>
                                <Input type="password" placeholder="•••••••" {...field} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">
                                  <Lock size={16} />
                                </span>
                                <Input type="password" placeholder="•••••••" {...field} className="pl-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full bg-bondy-primary" disabled={isLoading}>
                        {isLoading ? "Creating Account..." : "Create Account"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex flex-col border-t p-6 pt-4">
              <p className="text-sm text-center text-gray-500">
                By continuing, you agree to Bondy's Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Auth;
