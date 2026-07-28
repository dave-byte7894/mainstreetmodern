// Always-on cold-outreach reply checker — runs on GitHub Actions (no server,
// no laptop needed). For each outreach inbox it: learns which Sent messages are
// real PITCHES (stamped X-MSM-Pitch by the Command Center), scans the inbox for
// new mail, and pings Telegram when something replies to one of those pitches
// or comes from a business we pitched. Warmup-service noise never matches a
// pitch, so it's ignored. Dedup state lives in state.json (cached between runs
// by the workflow), so nothing is ever alerted twice and the mailbox is only
// ever read, never modified.

import fs from 'node:fs';
// imapflow + mailparser are CommonJS; default-import then destructure so the
// named exports resolve reliably under ESM (named imports can fail at load).
import imapflowPkg from 'imapflow';
import mailparserPkg from 'mailparser';
const { ImapFlow } = imapflowPkg;
const { simpleParser } = mailparserPkg;

const IMAP_HOST = process.env.IMAP_HOST || 'imap.gmail.com';
const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);
const SEED_DAYS = 30;                 // how far back in Sent to learn pitches
const STATE_FILE = process.env.STATE_FILE || 'state.json';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

function accounts() {
    return (process.env.REPLY_INBOXES || '')
        .split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
        .map(p => {
            const i = p.indexOf('|');
            return { user: p.slice(0, i).trim(), pass: p.slice(i + 1).replace(/\s+/g, '').trim() };
        })
        .filter(a => a.user && a.pass);
}

const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headerVal(buf, name) {
    const m = (buf ? buf.toString() : '').match(new RegExp('^' + name + ':\\s*(.*)$', 'im'));
    return m ? m[1].trim() : '';
}

function loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
    catch { return { accounts: {}, alerted: [] }; }
}
function saveState(s) {
    s.alerted = s.alerted.slice(-3000);
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

async function sendTelegram(text) {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) console.error('Telegram error:', j.description || r.status);
    return !!j.ok;
}

async function sentMailbox(client) {
    try { for (const b of await client.list()) if (b.specialUse === '\\Sent') return b.path; }
    catch { /* fall through */ }
    return '[Gmail]/Sent Mail';
}

// Learn our real pitches from the Sent folder (messages we stamped).
async function pitchIndex(client) {
    const msgids = {}, emails = {};
    const path = await sentMailbox(client);
    const lock = await client.getMailboxLock(path);
    try {
        const uids = await client.search({ since: new Date(Date.now() - SEED_DAYS * 864e5) }, { uid: true });
        if (uids && uids.length) {
            for await (const m of client.fetch(uids,
                { uid: true, envelope: true, headers: ['x-msm-pitch', 'x-msm-lead'] }, { uid: true })) {
                if (headerVal(m.headers, 'x-msm-pitch') !== '1') continue;
                const name = headerVal(m.headers, 'x-msm-lead') || '';
                const mid = m.envelope && m.envelope.messageId;
                if (mid) msgids[mid.trim()] = name;
                for (const t of (m.envelope && m.envelope.to) || []) {
                    if (t.address) emails[t.address.toLowerCase()] = name;
                }
            }
        }
    } finally { lock.release(); }
    return { msgids, emails };
}

async function checkAccount(acct, state) {
    const client = new ImapFlow({
        host: IMAP_HOST, port: IMAP_PORT, secure: true,
        auth: { user: acct.user, pass: acct.pass }, logger: false,
    });
    const ours = new Set(accounts().map(a => a.user.toLowerCase()));
    const acctState = state.accounts[acct.user.toLowerCase()] || (state.accounts[acct.user.toLowerCase()] = {});
    let alerts = 0;
    await client.connect();
    try {
        const { msgids, emails } = await pitchIndex(client);
        const lock = await client.getMailboxLock('INBOX');
        try {
            const newestUid = (client.mailbox.uidNext || 1) - 1;
            if (!acctState.lastUid) {           // first run: baseline, no backlog alerts
                acctState.lastUid = newestUid;
                return 0;
            }
            if (newestUid <= acctState.lastUid) return 0;

            // Phase 1 (cheap): match new inbox mail by headers only.
            const uids = await client.search({ uid: `${acctState.lastUid + 1}:*` }, { uid: true });
            const matched = [];
            let maxUid = acctState.lastUid;
            for await (const m of client.fetch(uids,
                { uid: true, envelope: true, headers: ['in-reply-to', 'references'] }, { uid: true })) {
                if (m.uid <= acctState.lastUid) continue;
                if (m.uid > maxUid) maxUid = m.uid;
                const env = m.envelope || {};
                const from = (env.from && env.from[0] && env.from[0].address || '').toLowerCase();
                if (!from || ours.has(from)) continue;      // skip our own sends / warmup-from-us
                const refBlob = [env.inReplyTo || '', headerVal(m.headers, 'in-reply-to'),
                    headerVal(m.headers, 'references')].join(' ');
                const refIds = refBlob.match(/<[^>]+>/g) || [];
                let name = null;
                for (const id of refIds) if (id in msgids) { name = msgids[id]; break; }
                if (name === null && (from in emails)) name = emails[from];
                if (name === null) continue;                // not a reply to anything we pitched
                const mid = (env.messageId || '').trim();
                if (mid && state.alerted.includes(mid)) continue;
                matched.push({ uid: m.uid, name, from, subject: env.subject || '', mid });
            }
            acctState.lastUid = maxUid;

            // Phase 2: fetch bodies of matched messages only, for the snippet.
            for (const hit of matched) {
                let snippet = '';
                try {
                    for await (const m of client.fetch(hit.uid, { uid: true, source: true }, { uid: true })) {
                        const parsed = await simpleParser(m.source);
                        snippet = (parsed.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
                    }
                } catch { /* snippet is optional */ }
                const text =
                    `📬 <b>Reply from a lead!</b>\n\n` +
                    `<b>${esc(hit.name || 'A business you pitched')}</b>\n` +
                    `From: ${esc(hit.from)}\n` +
                    `Subject: ${esc(hit.subject)}\n` +
                    `Inbox: ${esc(acct.user)}` +
                    (snippet ? `\n\n<i>${esc(snippet)}</i>` : '');
                if (await sendTelegram(text)) {
                    alerts++;
                    if (hit.mid) state.alerted.push(hit.mid);
                }
            }
        } finally { lock.release(); }
    } finally {
        try { await client.logout(); } catch { /* ignore */ }
    }
    return alerts;
}

async function main() {
    const accts = accounts();
    if (!accts.length || !TG_TOKEN || !TG_CHAT) {
        console.log('Not configured (need REPLY_INBOXES, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). Exiting cleanly.');
        return; // exit 0 so the workflow doesn't show as failed before secrets are set
    }
    const state = loadState();
    let total = 0;
    for (const acct of accts) {
        try { total += await checkAccount(acct, state); }
        catch (err) { console.error(`${acct.user}: ${err.message}`); }
    }
    saveState(state);
    console.log(`Done. ${total} new alert(s) sent across ${accts.length} inbox(es).`);
}

main().catch(err => { console.error(err); process.exit(1); });
