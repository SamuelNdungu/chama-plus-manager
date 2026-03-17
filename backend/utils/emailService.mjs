import nodemailer from 'nodemailer';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // For development only
  }
});

/**
 * Send email with report attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @param {Array} options.attachments - Array of attachments
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendEmail({ to, subject, text, html, attachments = [] }) {
  try {
    const mailOptions = {
      from: `"AkibaPlus Reports" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send report via email
 * @param {Object} options - Report email options
 * @param {string} options.to - Recipient email
 * @param {string} options.reportName - Name of the report
 * @param {Buffer} options.reportBuffer - Report file buffer (PDF/Excel)
 * @param {string} options.filename - Attachment filename
 * @param {string} options.contentType - MIME type
 * @param {Object} options.reportParams - Report parameters for email body
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendReport({ to, reportName, reportBuffer, filename, contentType, reportParams = {} }) {
  const subject = `${reportName} Report - AkibaPlus`;
  
  const text = `
Dear User,

Please find attached the ${reportName} report you requested.

Report Parameters:
${Object.entries(reportParams).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Generated on: ${new Date().toLocaleString()}

Best regards,
AkibaPlus Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .params { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .param-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .param-item:last-child { border-bottom: none; }
    .param-label { font-weight: bold; color: #1f2937; }
    .param-value { color: #4b5563; }
    .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📊 ${reportName} Report</h2>
    </div>
    <div class="content">
      <p>Dear User,</p>
      <p>Please find attached the <strong>${reportName}</strong> report you requested.</p>
      
      <div class="params">
        <h3>Report Parameters:</h3>
        ${Object.entries(reportParams).map(([key, value]) => `
          <div class="param-item">
            <span class="param-label">${key}:</span>
            <span class="param-value">${value}</span>
          </div>
        `).join('')}
      </div>
      
      <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      <p>If you did not request this report, please contact support immediately.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AkibaPlus - Chama Management System</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;

  const attachments = [
    {
      filename,
      content: reportBuffer,
      contentType,
    },
  ];

  return sendEmail({ to, subject, text, html, attachments });
}

/**
 * Send scheduled report notification
 * @param {Object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {Array} options.reports - Array of generated reports
 * @returns {Promise<Object>} - Email sending result
 */
export async function sendScheduledReportNotification({ to, reports }) {
  const subject = 'Monthly Reports - AkibaPlus';
  
  const text = `
Dear User,

Your scheduled monthly reports have been generated and are attached to this email.

Reports included:
${reports.map(r => `- ${r.name} (${r.format})`).join('\n')}

Generated on: ${new Date().toLocaleString()}

Best regards,
AkibaPlus Team
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .report-list { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .report-item { padding: 10px; margin: 5px 0; background-color: #f0fdf4; border-left: 3px solid #059669; }
    .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📅 Monthly Scheduled Reports</h2>
    </div>
    <div class="content">
      <p>Dear User,</p>
      <p>Your scheduled monthly reports have been generated and are attached to this email.</p>
      
      <div class="report-list">
        <h3>Reports Included:</h3>
        ${reports.map(r => `
          <div class="report-item">
            <strong>${r.name}</strong> (${r.format.toUpperCase()})
          </div>
        `).join('')}
      </div>
      
      <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      <p>These reports are automatically generated on the 1st of every month.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} AkibaPlus - Chama Management System</p>
      <p>To unsubscribe from scheduled reports, please update your settings.</p>
    </div>
  </div>
</body>
</html>
  `;

  const attachments = reports.map(report => ({
    filename: report.filename,
    content: report.buffer,
    contentType: report.contentType,
  }));

  return sendEmail({ to, subject, text, html, attachments });
}

/**
 * Test email configuration
 * @returns {Promise<boolean>} - True if email is configured correctly
 */
export async function testEmailConfiguration() {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

export default {
  sendEmail,
  sendReport,
  sendScheduledReportNotification,
  testEmailConfiguration,
};
