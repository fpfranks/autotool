// Phillips Automates — Google Apps Script
// Paste this into script.google.com → Deploy as Web App
// Execute as: Me  |  Who has access: Anyone

const SHEET_NAME = 'Voice Customers';
const NOTIFY_EMAIL = 'phillipsautomates@gmail.com'; // your email for alerts

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
      'Biz Phone','Booking URL','Hours','Services',
      'Website','Voice','Status','Fee','Date'
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
      // ID not found — still return ok (already gone)
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, note: 'not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet();
    sheet.appendRow([
      String(Date.now()),
      data.biz      || '',
      data.name     || '',
      data.email    || '',
      data.phone    || '',
      data.type     || '',
      data.city     || '',
      data.bizPhone || '',
      data.booking  || '',
      data.hours    || '',
      data.services || '',
      data.website  || '',
      data.voice    || 'female',
      'pending',
      data.fee      || 197,
      new Date().toLocaleDateString('en-GB')
    ]);

    // ── EMAIL ALERT TO FRANKIE ──
    try {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: '🔔 New Sign-Up: ' + (data.biz || 'Unknown Business'),
        body:
          'New customer just signed up on phillipsautomates!\n\n' +
          'Business:  ' + (data.biz      || '—') + '\n' +
          'Owner:     ' + (data.name     || '—') + '\n' +
          'Email:     ' + (data.email    || '—') + '\n' +
          'Mobile:    ' + (data.phone    || '—') + '\n' +
          'Biz Phone: ' + (data.bizPhone || '—') + '\n' +
          'Type:      ' + (data.type     || '—') + '\n' +
          'Voice:     ' + (data.voice    || 'female') + '\n' +
          'Website:   ' + (data.website  || '—') + '\n' +
          'Fee:       £' + (data.fee     || 197) + '/mo\n\n' +
          'Open your dashboard and send them the welcome email now.\n' +
          'https://fpfranks.github.io/autotool/dashboard.html'
      });
    } catch(mailErr) {
      // email alert failing shouldn't break the signup
    }

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
        id:       String(r['ID']),
        biz:      r['Business']    || '',
        name:     r['Owner']       || '',
        email:    r['Email']       || '',
        phone:    r['Phone']       || '',
        type:     r['Type']        || '',
        city:     r['City']        || '',
        bizPhone: r['Biz Phone']   || '',
        booking:  r['Booking URL'] || '',
        hours:    r['Hours']       || '',
        services: r['Services']    || '',
        website:  r['Website']     || '',
        voice:    r['Voice']       || 'female',
        status:   r['Status']      || 'pending',
        fee:      r['Fee']         || 197,
        date:     r['Date']        || '',
        fromSheet: true
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
// To activate: Apps Script → Triggers (clock icon) → Add Trigger
// Choose: dailyDigest | Time-driven | Day timer | 8am–9am
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

  const pending   = customers.filter(c => c['Status'] === 'pending');
  const welcomed  = customers.filter(c => c['Status'] === 'welcomed');
  const infoRcvd  = customers.filter(c => c['Status'] === 'info-received');
  const active    = customers.filter(c => c['Status'] === 'active');

  if (pending.length === 0 && welcomed.length === 0 && infoRcvd.length === 0) return;

  const fmt = list => list.map(c => '  • ' + c['Business'] + ' (' + c['Owner'] + ')').join('\n') || '  None';

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '☀️ Phillips Automates — Daily Digest (' + new Date().toLocaleDateString('en-GB') + ')',
    body:
      'Good morning! Here\'s your client pipeline for today:\n\n' +
      '🔴 NEEDS WELCOME EMAIL (' + pending.length + '):\n' + fmt(pending) + '\n\n' +
      '🟡 AWAITING INFO REPLY (' + welcomed.length + '):\n' + fmt(welcomed) + '\n\n' +
      '🔵 INFO RECEIVED — BUILD VAPI (' + infoRcvd.length + '):\n' + fmt(infoRcvd) + '\n\n' +
      '✅ ACTIVE CLIENTS: ' + active.length + '\n\n' +
      'Open dashboard → https://fpfranks.github.io/autotool/dashboard.html'
  });
}
