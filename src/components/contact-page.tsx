'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Globe
} from 'lucide-react';

import { logger } from '../lib/logger';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { createClient } from '../lib/supabase/client';
import { usePageContent } from '../hooks/use-page-content';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

const SUBJECT_OPTIONS = ['general', 'support', 'sales', 'billing', 'partnership', 'feedback'] as const;
const SUBJECT_LABELS: Record<(typeof SUBJECT_OPTIONS)[number], string> = {
  general: 'General Inquiry',
  support: 'Technical Support',
  sales: 'Sales Question',
  billing: 'Billing Issue',
  partnership: 'Partnership',
  feedback: 'Feedback',
};

const SUBJECT_SELECT_OPTIONS = SUBJECT_OPTIONS.map(value => ({
  value,
  label: SUBJECT_LABELS[value],
}));

const contactSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  subject: z.enum(SUBJECT_OPTIONS, { errorMap: () => ({ message: 'Please select a subject.' }) }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const businessHours = [
  { day: 'Monday - Friday', hours: '9:00 AM - 8:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 8:00 PM' },
  { day: 'Sunday', hours: '10:00 AM - 6:00 PM' },
  { day: 'Public Holidays', hours: 'Closed' }
];

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [companyInfo, setCompanyInfo] = React.useState<{supportEmail?: string; supportPhone?: string; registeredAddress?: string}>({});
  const [socialMediaLinks, setSocialMediaLinks] = React.useState<{[key: string]: string}>({});
  const supabase = createClient();
  const { content, loading } = usePageContent('contact_us');

  // Icon mapping for dynamic content
  const iconMap: Record<string, React.ComponentType<any>> = {
    MapPin,
    Phone,
    Mail,
    Clock,
    MessageCircle
  };

  // Load social media links
  React.useEffect(() => {
    // Load static business info extracted from PDFs
    fetch('/company-info.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setCompanyInfo(data))
      .catch(() => {});

  }, []);

  const loadSocialMediaLinks = React.useCallback(async () => {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'facebookUrl', 
          'twitterUrl', 
          'instagramUrl', 
          'linkedinUrl', 
          'youtubeUrl', 
          'websiteUrl'
        ]);

      if (error) {
        logger.error('Error loading social media settings', { error });
        return;
      }

      const links: {[key: string]: string} = {};
      settings?.forEach((setting) => {
        if (setting.value) {
          links[setting.key] = setting.value;
        }
      });
      
      setSocialMediaLinks(links);
    } catch (error) {
      logger.error('Error loading social media links', { error });
    }
  }, [supabase]);

  React.useEffect(() => {
    loadSocialMediaLinks();
  }, [loadSocialMediaLinks]);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: SUBJECT_OPTIONS[0],
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      const normalizedSubject = SUBJECT_LABELS[values.subject] ?? values.subject;
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        subject: normalizedSubject,
        message: values.message.trim(),
      };

      const response = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'We could not send your message. Please try again later.';
        try {
          const data = await response.json();
          if (typeof data?.error === 'string' && data.error.length > 0) {
            errorMessage = data.error;
          }
        } catch (parseError) {
          logger.warn('contact_message_response_parse_failed', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'Message sent!',
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });

      form.reset({
        name: '',
        email: '',
        phone: '',
        subject: SUBJECT_OPTIONS[0],
        message: '',
      });
    } catch (error) {
      logger.error('contact_message_submit_failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'We could not send your message. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="min-h-screen">
          {/* Header with fallback content */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading contact information...</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              {content?.content?.hero?.title || 'Contact Us'}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {content?.content?.hero?.description || "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Contact Information */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
                <div className="space-y-4">
                  {((content?.content?.contactInfo as any[]) || [
                    {
                      icon: 'MapPin',
                      title: 'Visit Us',
                      details: [companyInfo.registeredAddress || 'Parcem, Pernem, Goa - 403512'],
                    },
                    {
                      icon: 'Phone',
                      title: 'Call Us',
                      details: [companyInfo.supportPhone || '+91 94296 94995'],
                    },
                    {
                      icon: 'Mail',
                      title: 'Email Us',
                      details: [companyInfo.supportEmail || 'support@tecbunny.com'],
                    },
                  ]).map((info: any, index: number) => {
                    const IconComponent = iconMap[info.icon] || Mail;
                    return (
                      <Card key={index} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{info.title}</h3>
                            {info.details.map((detail: string, idx: number) => (
                              <p key={idx} className="text-sm text-muted-foreground">{detail}</p>
                            ))}
                            {info.action && (
                              <Button variant="link" className="p-0 h-auto text-primary text-sm mt-1">
                                {info.action}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {businessHours.map((schedule, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{schedule.day}</span>
                    <span className="font-medium">{schedule.hours}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Follow Us</CardTitle>
              <CardDescription>Stay connected on social media</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {/* Dynamic Social Media Links */}
                {socialMediaLinks.facebookUrl && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(socialMediaLinks.facebookUrl, '_blank')}
                    title="Follow us on Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                )}
                
                {socialMediaLinks.instagramUrl && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(socialMediaLinks.instagramUrl, '_blank')}
                    title="Follow us on Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </Button>
                )}
                
                {socialMediaLinks.twitterUrl && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(socialMediaLinks.twitterUrl, '_blank')}
                    title="Follow us on Twitter"
                  >
                    <Twitter className="h-4 w-4" />
                  </Button>
                )}
                
                {socialMediaLinks.linkedinUrl && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(socialMediaLinks.linkedinUrl, '_blank')}
                    title="Follow us on LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                  </Button>
                )}
                
                {socialMediaLinks.youtubeUrl && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(socialMediaLinks.youtubeUrl, '_blank')}
                    title="Follow us on YouTube"
                  >
                    <Youtube className="h-4 w-4" />
                  </Button>
                )}
                
                {socialMediaLinks.websiteUrl && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(socialMediaLinks.websiteUrl, '_blank')}
                    title="Visit our website"
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Show message if no social media links are configured */}
                {Object.keys(socialMediaLinks).length === 0 && (
                  <div className="text-center w-full py-4">
                    <p className="text-sm text-muted-foreground">
                      Social media links will appear here once configured by the admin.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} disabled={isSubmitting} />
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+91 98765 43210" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SUBJECT_SELECT_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us how we can help you..." 
                            rows={6}
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        Send Message <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle>Find Our Store</CardTitle>
          <CardDescription>Visit us at our physical location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Interactive map would be embedded here</p>
              <Button variant="outline" className="mt-4" asChild>
                <a 
                  href="https://maps.google.com/?q=Parcem,+Pernem,+Goa+403512" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Open in Google Maps
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}