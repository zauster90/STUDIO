// Contact form handler. Runs server-side so the spam phrase list is never
// shipped to the browser. Real messages are forwarded to FormSubmit.

const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/zauster.art@outlook.com';
const THANKS_URL = '/contact/thanks/';

// Submissions containing any of these phrases (case-insensitive) are dropped.
const SPAM_PHRASES = [
  'i would like more information. please contact me by email',
];

function isSpam(form) {
  if (form.get('_honey')) return true;
  const text = ['name', 'email', 'subject', 'message']
    .map((k) => form.get(k) || '')
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return SPAM_PHRASES.some((p) => text.includes(p));
}

export async function onRequestPost({ request }) {
  const form = await request.formData();
  const redirect = Response.redirect(new URL(THANKS_URL, request.url), 303);

  // Spam gets the same "thanks" response so senders can't tell it was filtered.
  if (isSpam(form)) return redirect;

  await fetch(FORMSUBMIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      name: form.get('name') || '',
      email: form.get('email') || '',
      subject: form.get('subject') || '',
      message: form.get('message') || '',
      _replyto: form.get('email') || '',
      _cc: 'zach.miller.art@gmail.com',
      _subject: 'New Studio Inquiry',
      _template: 'table',
      _captcha: 'false',
    }),
  });

  return redirect;
}
