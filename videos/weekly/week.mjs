/**
 * week: the facts of one ISO week on AnyRouter, and what the weekly film says about them.
 * Pure: kind.mjs fetches, this reads.
 *
 *   models   every catalog listing created inside the week, newest first, each free, BYOK or
 *            credits as lib/models.mjs reads it
 *   entries  the week's entries in the "Model releases" changelog of /llms.txt, the source the
 *            changelog kind films, each added or retired
 *   days     Monday to Sunday, with how many models and entries fall on each
 */
import { parseCatalog, isListing, createdIn, billingOf, isDecision, makerOf, dayOf, weekSpan } from '../../lib/models.mjs';
import { parseEntries } from '../changelog/entries.mjs';
import { numberWords, speakName } from '../../shared/authoring/narrate.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const cap = s => s[0].toUpperCase() + s.slice(1);

export function weekOf(doc, llms, week) {
  const span = weekSpan(week);
  const models = parseCatalog(doc).filter(m => isListing(m) && createdIn(m, span))
    .sort((a, b) => b.created - a.created || a.id.localeCompare(b.id))
    .map(m => ({ id: m.id, day: dayOf(m.created), name: m.display_name || m.name || m.id.split('/')[1], maker: makerOf(m), billing: billingOf(m), type: isDecision(m) ? 'decision' : 'chat' }));
  const from = dayOf(span.from / 1000), to = dayOf((span.to - 1) / 1000);
  const entries = parseEntries(llms).filter(e => e.date >= from && e.date <= to)
    .map(e => ({ date: e.date, title: e.title, type: e.type === 'disabled' ? 'retired' : 'added', link: e.link }));
  const days = WEEKDAYS.map((wd, k) => {
    const day = dayOf(span.from / 1000 + k * 86400);
    return { day, weekday: wd, n: Number(day.slice(8)), models: models.filter(m => m.day === day).length, entries: entries.filter(e => e.date === day).length };
  });
  return { week, from, to, days, models, entries };
}

/** "October 12 to 18, 2026", or "September 28 to October 4, 2026" across a month. */
export function spanWords({ from, to }) {
  const [y1, m1, d1] = from.split('-').map(Number), [y2, m2, d2] = to.split('-').map(Number);
  if (y1 !== y2) return `${MONTHS[m1 - 1]} ${d1}, ${y1} to ${MONTHS[m2 - 1]} ${d2}, ${y2}`;
  return m1 === m2 ? `${MONTHS[m1 - 1]} ${d1} to ${d2}, ${y1}` : `${MONTHS[m1 - 1]} ${d1} to ${MONTHS[m2 - 1]} ${d2}, ${y1}`;
}

const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const plural = (n, one, many) => `${numberWords(n)} ${n === 1 ? one : many}`;

/** What the film says, in order: { beat, text, say, from }. */
export function scriptOf(w) {
  const say = { anyr: 'any R', 'anyrouter.dev/changelog': 'any router dot dev slash changelog', AnyRouter: 'Any Router' };
  const lines = [];
  const line = (beat, text, from, extra = {}) => lines.push({ beat, text, from, say: { ...say, ...extra } });
  const span = spanWords(w).replace(/, \d{4}$/, '');
  line('masthead', `This is AnyRouter for the week of ${span}.`, `ISO week ${w.week}`);

  const n = w.models.length;
  const by = b => w.models.filter(m => m.billing === b);
  const free = by('free'), byok = by('byok'), credits = by('credits');
  if (n) {
    line('number', `${cap(plural(n, 'model', 'models'))} in the catalog ${n === 1 ? 'was' : 'were'} created this week.`, 'catalog: created inside the week');
    const parts = [];
    if (free.length) parts.push(`${numberWords(free.length)} ${free.length === 1 ? 'is' : 'are'} free`);
    if (byok.length) parts.push(`${numberWords(byok.length)} ${byok.length === 1 ? 'runs' : 'run'} on your own provider key`);
    if (credits.length) parts.push(`${numberWords(credits.length)} ${credits.length === 1 ? 'runs' : 'run'} on credits`);
    if (n > 1 || parts.length > 1) line('number', `${cap(list(parts))}.`, 'catalog: pricing.billing and price');
    if (free.length) {
      const names = free.length <= 3 ? free.map(m => m.name) : [free[0].name];
      const said = Object.fromEntries(names.map(nm => [nm, speakName(nm)]));
      line('models', free.length === 1 ? `The free one is ${names[0]}.` : free.length <= 3 ? `The free ones are ${list(names)}.` : `The newest free one is ${names[0]}.`, 'catalog: $0/$0, not byok', said);
    } else if (byok.length) {
      line('models', 'Each one runs on your own provider key.', 'catalog: pricing.billing "byok"');
    }
  } else {
    line('number', 'No model in the catalog was created this week.', 'catalog: created inside the week');
  }

  const e = w.entries.length, added = w.entries.filter(x => x.type === 'added').length, retired = e - added;
  if (e) {
    const kinds = [added && `${numberWords(added)} added`, retired && `${numberWords(retired)} retired`].filter(Boolean);
    line('changelog', `The changelog lists ${plural(e, 'entry', 'entries')}: ${list(kinds)}.`, '/llms.txt ## Model releases, dated inside the week');
  } else {
    line('changelog', 'The changelog has no entries this week.', '/llms.txt ## Model releases');
  }
  line('close', 'Read every entry on anyrouter.dev/changelog.', 'the page anyrouter.dev/changelog');
  return lines;
}

/** A changelog title in lines of at most `max` characters, broken only after a comma or before "and". */
export function titleLines(title, max) {
  const phrases = title.split(/(?<=,) | (?=and )/);
  const lines = [];
  for (const p of phrases) {
    const last = lines.at(-1);
    if (last != null && `${last} ${p}`.length <= max) lines[lines.length - 1] = `${last} ${p}`;
    else lines.push(p);
  }
  return lines;
}
