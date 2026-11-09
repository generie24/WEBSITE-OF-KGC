import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// I-load ang .env variables
dotenv.config();

// 1. I-setup ang Supabase connection gamit ang keys sa .env
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Mas maganda gamitin ang service role para mabasa lahat ng users
);

// 2. I-setup ang Nodemailer SMTP transporter gamit ang Gmail at App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmailCampaign() {
  try {
    console.log('Kinukuha ang mga rehistradong user mula sa Supabase...');

    // PALITAN ang 'users' ng tamang table name kung iba man ang tawag sa database mo
    const { data: users, error } = await supabase
      .from('user') 
      .select('email'); // Kinukuha lang ang email column

    if (error) {
      throw new Error(`Error sa pagkuha ng users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      console.log('Walang nahanap na user sa database.');
      return;
    }

    console.log(`May nahanap na ${users.length} na user. Nagsisimula nang magpadala...`);

    // 3. Loop sa bawat user para magpadala ng email
    for (const user of users) {
      const recipientEmail = user.email;

      const mailOptions = {
        from: `"KGC Systems" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Update mula sa KGC Systems',
        html: `
          <h3>Hello!</h3>
          <p>Ito ay isang test email campaign na ipinadala para sa mga rehistradong user sa aming platform.</p>
          <p>Salamat sa pagsuporta!</p>
        `,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[SENT] Matagumpay na naipadala sa: ${recipientEmail} (ID: ${info.messageId})`);
      } catch (err) {
        console.error(`[FAILED] Hindi naipadala kay ${recipientEmail}:`, err.message);
      }
    }

    console.log('Tapos na ang pagpapadala ng email campaign!');
  } catch (err) {
    console.error('May naganap na mabigat na error:', err.message);
  }
}

sendEmailCampaign();