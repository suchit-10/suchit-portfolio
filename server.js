import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import nodemailer from 'nodemailer';

const root = fileURLToPath(new URL('.', import.meta.url));

async function loadEnvironmentFile() {
  try {
    const environment = await readFile(join(root, '.env'), 'utf8');
    for (const line of environment.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

await loadEnvironmentFile();

const port = Number(process.env.PORT) || 4173;
const contactRecipient = process.env.CONTACT_RECIPIENT || 'gourkhedesuchit@gmail.com';
const maxAttachmentBytes = 5 * 1024 * 1024;
const allowedAttachmentTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function getTransporter() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function handleContact(request, response) {
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > maxAttachmentBytes + 50_000) {
    sendJson(response, 413, { error: 'Attachment must be 5 MB or smaller.' });
    return;
  }

  const transporter = getTransporter();
  if (!transporter) {
    sendJson(response, 503, { error: 'Email delivery is not configured yet.' });
    return;
  }

  try {
    const webRequest = new Request(`http://${request.headers.host}${request.url}`, {
      method: request.method,
      headers: request.headers,
      body: Readable.toWeb(request),
      duplex: 'half'
    });
    const form = await webRequest.formData();
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const topic = String(form.get('topic') || '').trim();
    const message = String(form.get('message') || '').trim();
    const attachment = form.get('attachment');

    if (!name || !email || !topic || !message || !email.includes('@')) {
      sendJson(response, 400, { error: 'Please complete all required fields with a valid email address.' });
      return;
    }
    if (attachment instanceof File && attachment.size > maxAttachmentBytes) {
      sendJson(response, 413, { error: 'Attachment must be 5 MB or smaller.' });
      return;
    }
    if (attachment instanceof File && attachment.size > 0 && !allowedAttachmentTypes.has(attachment.type)) {
      sendJson(response, 415, { error: 'Use a PDF, Word document, PNG, or JPG attachment.' });
      return;
    }

    const attachments = attachment instanceof File && attachment.size > 0
      ? [{ filename: attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_'), content: Buffer.from(await attachment.arrayBuffer()), contentType: attachment.type }]
      : [];
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: contactRecipient,
      replyTo: email,
      subject: `[Portfolio] ${topic} - ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
      attachments
    });
    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error('Contact delivery failed:', error);
    sendJson(response, 500, { error: 'Unable to send the message. Please try again later.' });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/contact') {
    await handleContact(request, response);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = resolve(root, normalize(relativePath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Portfolio running at http://localhost:${port}`);
});
