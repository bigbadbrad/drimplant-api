const { pageTitle, normalizePath } = require('./pageTitles');

const TIMELINE_EVENTS = new Set([
  'content_viewed',
  'video_played',
  'widget_opened',
  'widget_step_viewed',
  'widget_closed',
  'widget_completed',
  'lead_created',
]);

function clipText(value, max = 80) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function isWidgetShellPath(path) {
  const clean = normalizePath(path);
  return /^\/widget\d*\/$/.test(clean);
}

function viewedLabel(title) {
  if (!title) return 'Viewed a page';
  if (title === 'Home') return 'Viewed Home';
  if (/page$/i.test(title)) return `Viewed ${title}`;
  return `Viewed ${title} page`;
}

function widgetCta(row) {
  const existing = String(row.cta || '').trim();
  if (/^(widget|form):/i.test(existing)) return existing;
  const id = String(row.workflow || existing).trim();
  if (!id) return '';
  return `widget: ${id}`;
}

function friendlyEventDisplay(row) {
  const event = row.event || '';
  const currentPage = clipText(row.page_title) || pageTitle(row.path);

  if (event === 'widget_opened') return 'Opened Widget';
  if (event === 'widget_closed') return 'Closed Widget';
  if (event === 'widget_step_viewed') {
    const index = Number(row.step_index);
    const stepNo = Number.isFinite(index) && index > 0 ? `Step ${index}` : 'Step';
    const title = clipText(row.step_title, 90) || clipText(row.step_label) || clipText(row.step_id);
    return title ? `${stepNo}: ${title}` : stepNo;
  }
  if (event === 'widget_completed') return 'Completed Widget';
  if (event === 'lead_created') return 'Became a lead';
  if (event === 'content_viewed' || event === 'page_view') {
    if (isWidgetShellPath(row.path)) return null;
    return viewedLabel(currentPage);
  }
  if (event === 'video_played') {
    return clipText(row.video_title) ? `Played video: ${clipText(row.video_title)}` : 'Played video';
  }
  return null;
}

function isUsefulEvent(row) {
  if (!row?.event || !TIMELINE_EVENTS.has(row.event)) return false;
  return Boolean(friendlyEventDisplay(row));
}

function widgetRank(row) {
  if (row.event === 'content_viewed' || row.event === 'page_view') return 0;
  if (row.event === 'video_played') return 1;
  if (row.event === 'widget_opened') return 10;
  if (row.event === 'widget_step_viewed') return 10 + (Number(row.step_index) || 0);
  if (row.event === 'widget_completed') return 40;
  if (row.event === 'lead_created') return 41;
  if (row.event === 'widget_closed') return 45;
  return 20;
}

function sameCta(a, b) {
  return (a.cta || '') === (b.cta || '');
}

function isRepeatWidgetStep(out, labeled) {
  if (labeled.event !== 'widget_step_viewed') return false;
  for (let i = out.length - 1; i >= 0; i -= 1) {
    const prev = out[i];
    if (prev.event === 'widget_opened' && sameCta(prev, labeled)) continue;
    if (prev.event === 'widget_step_viewed' && sameCta(prev, labeled)) {
      return String(prev.step_index || '') === String(labeled.step_index || '')
        && String(prev.step_id || prev.event_display || '') === String(labeled.step_id || labeled.event_display || '');
    }
    return false;
  }
  return false;
}

function placeOpenedBeforeSteps(events) {
  const result = [...events];
  for (let i = 0; i < result.length; i += 1) {
    const ev = result[i];
    if (ev.event !== 'widget_opened') continue;
    const openedAt = new Date(ev.timestamp).getTime();
    let insertAt = i;
    for (let j = i - 1; j >= 0; j -= 1) {
      const prev = result[j];
      const dt = Math.abs(openedAt - new Date(prev.timestamp).getTime());
      if (prev.event === 'widget_step_viewed' && sameCta(prev, ev) && dt <= 10000) {
        insertAt = j;
        continue;
      }
      break;
    }
    if (insertAt === i) continue;
    result.splice(i, 1);
    result.splice(insertAt, 0, ev);
  }
  return result;
}

function applyIdentity(newestFirst) {
  const chronological = [...newestFirst].reverse();
  const cut = chronological.findIndex((ev) => ev.event === 'widget_completed' || ev.event === 'lead_created');
  chronological.forEach((ev, i) => {
    ev.identity = cut >= 0 && i >= cut ? 'known' : 'anonymous';
  });
  return chronological.reverse();
}

function collapseEvents(events) {
  const chronological = [...(events || [])].sort((a, b) => {
    const dt = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (dt !== 0) return dt;
    return widgetRank(a) - widgetRank(b);
  });
  const out = [];
  for (const ev of chronological) {
    const display = ev.event_display || friendlyEventDisplay(ev);
    if (!display) continue;
    const labeled = { ...ev, event_display: display, cta: ev.cta || widgetCta(ev) };
    if (isRepeatWidgetStep(out, labeled)) continue;
    const prev = out[out.length - 1];
    if (prev && prev.event_display === labeled.event_display && (prev.cta || '') === (labeled.cta || '')) continue;
    out.push(labeled);
  }
  const ordered = placeOpenedBeforeSteps(out);
  const withoutOrphans = ordered.some((ev) => ev.event === 'widget_opened')
    ? ordered
    : ordered.filter((ev) => ev.event !== 'widget_step_viewed');
  const newestFirst = withoutOrphans
    .map((ev, seq) => ({ ...ev, _seq: seq }))
    .sort((a, b) => {
      const dt = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (Math.abs(dt) > 2000) return dt;
      return b._seq - a._seq;
    })
    .map(({ _seq, ...ev }) => ev);
  return applyIdentity(newestFirst);
}

module.exports = {
  pageTitle,
  normalizePath,
  viewedLabel,
  friendlyEventDisplay,
  isUsefulEvent,
  collapseEvents,
  widgetCta,
};
