import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

(async () => {
  try {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';

    if (!user || !pass) {
      console.error('❌ SMTP credentials missing!');
      console.error('SMTP_USER or SMTP_PASS not set in environment.');
      console.error('Please add them to .env.local or set as environment variables.');
      process.exit(2);
    }

    console.log('🔍 Checking SMTP connection...');
    console.log(`📡 Host: ${host}:${port} (secure: ${secure})`);

    const transporter = nodemailer.createTransporter({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { 
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });

    console.log('🔐 Verifying SMTP authentication...');
    await transporter.verify();
    console.log('✅ SMTP verification succeeded! Email service is ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ SMTP verification failed:');
    if (err.code) console.error(`Error Code: ${err.code}`);
    if (err.response) console.error(`Server Response: ${err.response}`);
    console.error('Message:', err?.message || err);
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('- Check your email credentials');
    console.log('- Verify SMTP server settings');
    console.log('- Ensure "Less secure app access" is enabled (for Gmail)');
    console.log('- Try using an app-specific password');
    
    process.exit(1);
  }
})();
