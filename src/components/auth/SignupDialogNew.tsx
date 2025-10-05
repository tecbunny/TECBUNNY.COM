 'use client';

import { useState, useMemo } from 'react';
import NextDynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { useAuth } from '../../lib/hooks';
import { useToast } from '../../hooks/use-toast';
import { logger } from '../../lib/logger';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  mobile: z.string().min(10, { message: 'Please enter a valid mobile number.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password.' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const captchaDisabled = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DISABLE_CAPTCHA === 'true';
  
  // Debug logging
  logger.debug('CAPTCHA configuration in SignupDialogNew', {
    turnstileSiteKey: !!turnstileSiteKey,
    captchaDisabled,
    shouldShowCaptcha: !!turnstileSiteKey && !captchaDisabled,
  });
  
  const Turnstile = useMemo(
    () => NextDynamic(() => import('react-turnstile').then(m => m.default), { ssr: false }) as unknown as React.ComponentType<any>,
    []
  );

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    // Check CAPTCHA before proceeding if Turnstile is enabled
    if (!!turnstileSiteKey && !captchaDisabled && !captchaToken) {
      toast({
        title: 'Security Verification Required',
        description: 'Please complete the CAPTCHA to continue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const signupResult = await signup({
        firstName: values.name.split(' ')[0] || values.name,
        lastName: values.name.split(' ').slice(1).join(' ') || '',
        email: values.email,
        password: values.password,
        phone: values.mobile,
        captchaToken: captchaToken || undefined
      });

      if (!signupResult.success) {
        toast({
          title: 'Signup Failed',
          description: signupResult.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Verification code sent!',
        description: 'Please check your email for the verification code.',
      });
      setOpen(false);
      form.reset();
      
      // Store signup data for account creation after OTP verification
      const signupData = {
        email: values.email,
        password: values.password, // Store password temporarily for account creation
        name: values.name,
        mobile: values.mobile,
        timestamp: Date.now(),
      };
      
      try {
        localStorage.setItem('signup_session', JSON.stringify(signupData));
      } catch (storageError) {
        logger.error('Error storing signup data in SignupDialogNew', { storageError, email: values.email });
      }
      
      // Redirect to OTP verification page
      window.location.href = `/auth/verify-otp?email=${encodeURIComponent(values.email)}&type=signup`;
    } catch (error) {
      toast({
        title: 'Error creating account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Create your account to start shopping and manage your orders.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Create a password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col space-y-4 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || (!!turnstileSiteKey && !captchaDisabled && !captchaToken)} 
                className="w-full"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>

              {!!turnstileSiteKey && !captchaDisabled && (
                <div className="mt-3">
                  <Turnstile
                    sitekey={turnstileSiteKey}
                    onVerify={(token: string) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                  />
                </div>
              )}
              
              <Separator />
              
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setOpen(false)}
                >
                  Sign in instead
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}