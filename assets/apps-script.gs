// Phillips Automates — Google Apps Script
// Paste this entire file into script.google.com, then deploy as a web app.
// Set: Execute as = Me, Who has access = Anyone

const SHEET_NAME = 'Customers';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet + headers if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'ID','Business','Owner','Email','Phone','Channels',
        'Instagram','Messenger','WhatsApp','TikTok','SMS','Email Bot','Telegram',
        'Status','Fee','Date'
      ]);
      sheet.setFrozenRows(1);
    }

    const ch = data.channelData || {};
    sheet.appendRow([
      String(Date.now()),
      data.biz    || '',
      data.name   || '',
      data.email  || '',
      data.phone  || '',
      (data.channels || []).join(', '),
      ch.instagram || '',
      ch.messenger || '',
      ch.whatsapp  || '',
      ch.tiktok    || '',
      ch.sms       || '',
      ch.email     || '',
      ch.telegram  || '',
      'pending',
      '47',
      new Date().toLocaleDateString('en-GB')
    ]);

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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet || sheet.getLastRow() < 2) {
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
        biz:      r['Business']  || '',
        name:     r['Owner']     || '',
        email:    r['Email']     || '',
        phone:    r['Phone']     || '',
        channels: r['Channels']  || '',
        social:   r['Instagram'] || '',
        ig:       r['Instagram'] || '',
        fb:       r['Messenger'] || '',
        wa:       r['WhatsApp']  || '',
        tt:       r['TikTok']    || '',
        smsNum:   r['SMS']       || '',
        emailBot: r['Email Bot'] || '',
        tg:       r['Telegram']  || '',
        status:   r['Status']    || 'pending',
        fee:      r['Fee']       || 47,
        date:     r['Date']      || '',
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
