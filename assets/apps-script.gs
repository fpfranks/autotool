// Phillips Automates — Google Apps Script
// Paste this into script.google.com → Deploy as Web App
// Execute as: Me  |  Who has access: Anyone
//
// ══════════════════════════════════════════════════════════
// AUTOMATION SETUP — DO THESE ONCE
// ══════════════════════════════════════════════════════════
//
// 1. DAILY DIGEST (morning pipeline briefing to your inbox)
//    Apps Script → Triggers (clock icon, left sidebar) → Add Trigger
//    Function: dailyDigest | Event source: Time-driven | Day timer | 8am–9am
//    → You'll get a daily email each morning with your full pipeline status
//
// 2. STRIPE PAYMENT CONFIRMATION EMAIL TO YOU (free, no Zapier needed)
//    Option A — Stripe's built-in (easiest):
//      Stripe → Settings → Emails → enable "Successful payments" for team
//      → Stripe emails you every time someone pays. Takes 2 minutes.
//
//    Option B — Zapier (more detail in the notification):
//      Zapier → Create Zap:
//      Trigger: Stripe → Payment Intent Succeeded
//      Action: Webhooks → POST to [your GAS URL]
//      Body (JSON): { "action": "payment_confirmed", "email": "{{customer_email}}",
//                     "biz": "{{metadata_biz}}", "name": "{{customer_name}}",
//                     "amount": "{{amount_received}}" }
//      → GAS finds the customer and emails you "💳 Payment confirmed for [Business]"
//      Free Zapier tier: 100 tasks/month (plenty for starting out)
//
// 3. STRIPE CUSTOMER RECEIPT (client gets automatic payment confirmation)
//    Stripe → Settings → Emails → enable "Successful payments" for customers
//    → Stripe sends the customer an automatic receipt. Takes 2 minutes.
//
// ══════════════════════════════════════════════════════════

const SHEET_NAME  = 'Voice Customers';
const NOTIFY_EMAIL = 'phillipsautomates@gmail.com';
const DASHBOARD_URL = 'https://fpfranks.github.io/autotool/dashboard.html';

function getSheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SS_ID');
  let ss;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch(e) { ssId = null; }
  }

  if (!ssId) {
    ss = SpreadsheetApp.create('Phillips Automates — Voice Customers');
    props.setProperty('SS_ID', ss.getId());
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'ID','Business','Owner','Email','Phone','Type','City',
      'Platform','Client Count','Booking URL','Review Link',
      'Quiet Days','Tone','Website','Status','Fee','Date'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── DELETE ROW ──
    if (data.action === 'delete' && data.id) {
      const sheet = getSheet();
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.deleteRow(i + 1);
          return ContentService
            .createTextOutput(JSON.stringify({ ok: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, note: 'not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── STRIPE PAYMENT CONFIRMED (called by Zapier webhook) ──
    // Zapier: Trigger = Stripe Payment Intent Succeeded
    //         Action  = Webhooks POST → this GAS URL
    //         Body    = { "action": "payment_confirmed", "email": "...",
    //                     "biz": "...", "name": "...", "amount": "..." }
    if (data.action === 'payment_confirmed') {
      const biz    = data.biz    || 'Unknown Business';
      const name   = data.name   || '';
      const email  = data.email  || '';
      const amount = data.amount ? '£' + (data.amount / 100).toFixed(2) : '£197.00';

      try {
        MailApp.sendEmail({
          to: NOTIFY_EMAIL,
          subject: '💳 Payment Confirmed: ' + biz,
          body:
            'STRIPE PAYMENT CONFIRMED ✅\n\n' +
            'Business: ' + biz    + '\n' +
            'Owner:    ' + name   + '\n' +
            'Email:    ' + email  + '\n' +
            'Amount:   ' + amount + '\n\n' +
            'They should already be in your dashboard from when they signed up.\n' +
            'Check the Pipeline — send them the welcome email now if you haven\'t.\n\n' +
            'Dashboard → ' + DASHBOARD_URL
        });
      } catch(mailErr) {}

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── NEW SIGN-UP (posted from sales page form) ──
    const sheet = getSheet();
    sheet.appendRow([
      String(Date.now()),
      data.biz         || '',
      data.name        || '',
      data.email       || '',
      data.phone       || '',
      data.type        || '',
      data.city        || '',
      data.platform    || '',
      data.clientcount || '',
      data.booking     || '',
      data.reviewlink  || '',
      data.quietdays   || '',
      data.tone        || 'friendly',
      data.website     || '',
      'pending',
      data.fee         || 19,
      new Date().toLocaleDateString('en-GB')
    ]);

    // ── INSTANT HOLDING EMAIL TO THE CLIENT ──
    // Fires immediately on sign-up so they hear from you before payment even clears.
    // Sets expectations, builds trust, reduces "did it work?" anxiety.
    if (data.email) {
      try {
        MailApp.sendEmail({
          to: data.email,
          subject: 'Phillips Automates — we\'ve got your details 👋',
          body:
            'Hi ' + (data.name || 'there') + ',\n\n' +
            'Thanks for signing up to Phillips Automates!\n\n' +
            'We\'ve received your details and once your payment is confirmed ' +
            'you\'ll be hearing from us within the hour to get your SMS sequences set up.\n\n' +
            'To get started quickly, it helps to have:\n' +
            '  1. A CSV export of your client list from ' + (data.platform || 'your booking platform') + '\n' +
            '  2. Your booking link (so we can include it in messages)\n' +
            '  3. Your Google review link (for the review request sequence)\n\n' +
            'Just reply to the welcome email we send and we\'ll take it from there — ' +
            'your sequences will be live within 24 hours.\n\n' +
            'Any questions in the meantime, just reply to this email.\n\n' +
            'Speak soon,\n' +
            'Phillips Automates\n' +
            'phillipsautomates@gmail.com'
        });
      } catch(mailErr) {
        // holding email failing shouldn't break the sign-up
      }
    }

    // ── ALERT TO YOU ──
    try {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: '🔔 New Sign-Up: ' + (data.biz || 'Unknown Business'),
        body:
          '🔔 NEW SIGN-UP — check Stripe to confirm payment\n\n' +
          'Business:  ' + (data.biz         || '—') + '\n' +
          'Owner:     ' + (data.name        || '—') + '\n' +
          'Email:     ' + (data.email       || '—') + '\n' +
          'Mobile:    ' + (data.phone       || '—') + '\n' +
          'Type:      ' + (data.type        || '—') + '\n' +
          'City:      ' + (data.city        || '—') + '\n' +
          'Platform:  ' + (data.platform    || '—') + '\n' +
          'Clients:   ' + (data.clientcount || '—') + '\n' +
          'Website:   ' + (data.website     || '—') + '\n' +
          'Fee:       £' + (data.fee        || 19) + '/mo\n\n' +
          '✅ Holding email already sent to client automatically.\n' +
          '📋 Next: confirm payment in Stripe, then send welcome email.\n\n' +
          'Dashboard → ' + DASHBOARD_URL
      });
    } catch(mailErr) {}

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = getSheet();
    if (sheet.getLastRow() < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ customers: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const customers = rows.slice(1).map(row => {
      const r = {};
      headers.forEach((h, i) => { r[h] = row[i]; });
      return {
        id:          String(r['ID']),
        biz:         r['Business']     || '',
        name:        r['Owner']        || '',
        email:       r['Email']        || '',
        phone:       r['Phone']        || '',
        type:        r['Type']         || '',
        city:        r['City']         || '',
        platform:    r['Platform']     || '',
        clientcount: r['Client Count'] || '',
        booking:     r['Booking URL']  || '',
        reviewlink:  r['Review Link']  || '',
        quietdays:   r['Quiet Days']   || '',
        tone:        r['Tone']         || 'friendly',
        website:     r['Website']      || '',
        status:      r['Status']       || 'pending',
        fee:         r['Fee']          || 19,
        date:        r['Date']         || '',
        fromSheet:   true
      };
    });
    return ContentService
      .createTextOutput(JSON.stringify({ customers }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ customers: [], error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── DAILY DIGEST ──
// Sends you a morning pipeline briefing every day.
// TO ACTIVATE (one-time setup, takes 2 minutes):
//   1. Open this project in script.google.com
//   2. Click the clock icon (Triggers) in the left sidebar
//   3. Click "Add Trigger" (bottom right)
//   4. Function: dailyDigest
//   5. Event source: Time-driven
//   6. Type: Day timer
//   7. Time: 8am–9am
//   8. Save
// That's it. You'll get a daily briefing email every morning.
function dailyDigest() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return;

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const customers = rows.slice(1).map(row => {
    const r = {};
    headers.forEach((h, i) => { r[h] = row[i]; });
    return r;
  });

  const pending  = customers.filter(c => c['Status'] === 'pending');
  const welcomed = customers.filter(c => c['Status'] === 'welcomed');
  const building = customers.filter(c => c['Status'] === 'info-received');
  const active   = customers.filter(c => c['Status'] === 'active');
  const revenue  = active.reduce((s, c) => s + (parseFloat(c['Fee']) || 19), 0);

  // Only send if there's something to action
  if (pending.length === 0 && welcomed.length === 0 && building.length === 0) return;

  const fmt = list =>
    list.map(c => '  • ' + c['Business'] + ' (' + (c['Owner'] || '—') + ')').join('\n') || '  None';

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '☀️ Phillips Automates — Daily Digest (' + new Date().toLocaleDateString('en-GB') + ')',
    body:
      'Good morning! Here\'s your pipeline for today:\n\n' +
      '🔴 SEND WELCOME EMAIL (' + pending.length + '):\n' + fmt(pending) + '\n\n' +
      '🟡 AWAITING CSV FROM CLIENT (' + welcomed.length + '):\n' + fmt(welcomed) + '\n\n' +
      '🔵 SET UP SMS SEQUENCES (' + building.length + '):\n' + fmt(building) + '\n\n' +
      '✅ ACTIVE CLIENTS: ' + active.length + '  |  Monthly revenue: £' + revenue + '\n\n' +
      'Dashboard → ' + DASHBOARD_URL
  });
}
