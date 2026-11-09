import 'dotenv/config';
import nodemailer from 'nodemailer';

const user = String(process.env.EMAIL_USER || '').trim();
const pass = String(process.env.EMAIL_PASS || '').trim();

if (!user || !pass) {
  throw new Error('Set EMAIL_USER and EMAIL_PASS in .env before running this test.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass }
});

async function sendEmail() {
  try {
    const mailOptions = {
      from: `"KGC Systems" <${user}>`,
      to: 'limcogenerie@gmail.com', // Pwedeng kahit kaninong email address ng user!
      subject: 'Welcome sa aming platform!',
      html: '<h3>Hello!</h3><p>Matagumpay na naipadala ang email na ito gamit ang SMTP at Nodemailer.</p>'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Matagumpay na naipadala ang email:', info.messageId);
    
  } catch (error) {
    console.error('May naganap na error sa pagpapadala:', error);
  }
}

sendEmail();