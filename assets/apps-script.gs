// Phillips Automates — Google Apps Script
// Paste this into script.google.com → Deploy as Web App
// Execute as: Me  |  Who has access: Anyone

const SHEET_NAME = 'Voice Customers';

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
      'Website','Status','Fee','Date'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
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
      'pending',
      data.fee      || 197,
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
