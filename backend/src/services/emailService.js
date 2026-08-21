import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const emailTransport = () => {
  if (!env.emailEnabled) {
    const error = new Error('Email sending is not configured. Set EMAIL_ENABLED=true and the SMTP settings in backend/.env.');
    error.status = 503;
    throw error;
  }
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword || !env.emailFrom) {
    const error = new Error('SMTP configuration is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.');
    error.status = 503;
    throw error;
  }
  if (!transporter) transporter = nodemailer.createTransport({ host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure, auth: { user: env.smtpUser, pass: env.smtpPassword }, connectionTimeout: env.smtpTimeoutMs, greetingTimeout: env.smtpTimeoutMs, socketTimeout: env.smtpTimeoutMs });
  return transporter;
};

export const sendContactReplyEmail = async ({ contact, response }) => {
  const universityName = env.emailFromName || 'Jamhuriya University';
  const safeQuestion = escapeHtml(contact.message).replaceAll('\n', '<br>');
  const safeResponse = escapeHtml(response).replaceAll('\n', '<br>');
  const info = await emailTransport().sendMail({
    from: { name: universityName, address: env.emailFrom }, to: contact.email, replyTo: env.emailReplyTo || env.emailFrom,
    subject: `Response to your ${contact.type || 'contact'} message`,
    text: `Dear ${contact.name || 'Applicant'},\n\nThank you for contacting ${universityName}.\n\nYour message:\n${contact.message}\n\nOur response:\n${response}\n\nRegards,\n${universityName}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173353;max-width:640px;margin:auto"><div style="border-top:5px solid #2d368d;padding:24px;border:1px solid #dce5ee"><h2 style="margin-top:0;color:#2d368d">${escapeHtml(universityName)}</h2><p>Dear ${escapeHtml(contact.name || 'Applicant')},</p><p>Thank you for contacting us. Below is our response to your message.</p><div style="background:#f4f7fa;padding:14px;border-radius:8px"><strong>Your message</strong><p>${safeQuestion}</p></div><div style="margin-top:16px;border-left:4px solid #00a451;padding:4px 14px"><strong>Our response</strong><p>${safeResponse}</p></div><p>Regards,<br><strong>${escapeHtml(universityName)}</strong></p></div></div>`,
  });
  return { messageId: info.messageId, accepted: info.accepted || [] };
};
