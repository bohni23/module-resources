/**
 * Fulki App Data — Google Apps Script receiver
 *
 * SETUP:
 * 1. Create a Google Sheet titled "Fulki App Data"
 * 2. Open Extensions > Apps Script
 * 3. Paste this entire file, replacing any existing code
 * 4. Click Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the web app URL and paste it into the Fulki app (Vet tab > Google Sheets Sync)
 * 6. Tap "Push to Google Sheets" — two colour-coded tabs will appear
 */

const TYPE_COLORS = {
  food:    '#FEF3E0',
  water:   '#E3F0FC',
  nap:     '#F0E8F8',
  pee:     '#E8F5E8',
  poop:    '#FDE8EE',
  zoomies: '#FDEAEA',
};

const VET_COLORS = {
  weight:      '#FFF8E7',
  flea:        '#E8F5E8',
  vaccination: '#EDE7F6',
  visit:       '#FFF3E0',
  concern:     '#FFEBEE',
  note:        '#F5F5F5',
};

const HDR_LOG = '#3D1A4A';
const HDR_VET = '#B04F6C';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    if (data.logs)     writeLogsSheet(ss, data.logs);
    if (data.vetNotes) writeVetSheet(ss, data.vetNotes);
    return jsonResponse({ ok: true, updated: new Date().toISOString() });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, msg: 'Fulki receiver online' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Daily Logs sheet ──────────────────────────────────────────
function writeLogsSheet(ss, logs) {
  const sh   = getOrCreate(ss, '📋 Daily Logs');
  const hdrs = ['Date', 'Time', 'Type', 'Size', 'ml', 'Duration (mins)'];
  sh.clearContents();
  sh.clearFormats();

  sh.appendRow(hdrs);
  styleHeader(sh, hdrs.length, HDR_LOG);

  logs.forEach(function(l, i) {
    var d = new Date(l.timestamp);
    sh.appendRow([
      Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm'),
      cap(l.type),
      l.size  || '',
      l.ml    || '',
      l.duration || '',
    ]);
    sh.getRange(i + 2, 1, 1, hdrs.length)
      .setBackground(TYPE_COLORS[l.type] || '#FFFFFF');
  });

  finish(sh, hdrs.length);
}

// ── Medical History sheet ─────────────────────────────────────
function writeVetSheet(ss, notes) {
  const sh   = getOrCreate(ss, '🏥 Medical History');
  const hdrs = ['Date', 'Type', 'Value / Detail', 'Notes', 'Next Due'];
  sh.clearContents();
  sh.clearFormats();

  sh.appendRow(hdrs);
  styleHeader(sh, hdrs.length, HDR_VET);

  notes.forEach(function(n, i) {
    var dateStr = n.date ? Utilities.formatDate(new Date(n.date), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';
    sh.appendRow([
      dateStr,
      cap(n.category),
      n.value   || '',
      n.notes   || '',
      n.nextDue || '',
    ]);
    sh.getRange(i + 2, 1, 1, hdrs.length)
      .setBackground(VET_COLORS[n.category] || '#FFFFFF');
  });

  finish(sh, hdrs.length);
}

// ── Helpers ───────────────────────────────────────────────────
function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function styleHeader(sh, cols, color) {
  var r = sh.getRange(1, 1, 1, cols);
  r.setBackground(color);
  r.setFontColor('#FFFFFF');
  r.setFontWeight('bold');
  r.setFontSize(11);
}

function finish(sh, cols) {
  sh.autoResizeColumns(1, cols);
  sh.setFrozenRows(1);
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
