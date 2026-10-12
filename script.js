const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');

toggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.textContent = isOpen ? '✕' : '☰';
});

nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '☰';
}));

document.querySelector('#year').textContent = new Date().getFullYear();

// Edit live-events.json to manage livestream dates and times.
// The calendar's timeZone controls recurring weekly events.
const liveButton = document.getElementById('live-button');
const liveLabel = document.getElementById('live-label');
let liveCalendar = null;

function zonedClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const part = type => parts.find(item => item.type === type)?.value;

  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      .indexOf(part('weekday')),
    minute: Number(part('hour')) * 60 + Number(part('minute'))
  };
}

function isEventActive(event, now, timeZone) {
  if (event.start && event.end) {
    const start = Date.parse(event.start);
    const end = Date.parse(event.end);

    return Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= now.getTime() &&
      now.getTime() < end;
  }

  if (
    Number.isInteger(event.dayOfWeek) &&
    event.startTime &&
    event.endTime
  ) {
    const clock = zonedClock(now, timeZone);

    const minutes = value => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;

      const [hours, mins] = value.split(':').map(Number);
      return hours * 60 + mins;
    };

    const start = minutes(event.startTime);
    const end = minutes(event.endTime);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start === end
    ) return false;

    if (end > start) {
      return clock.day === event.dayOfWeek &&
        clock.minute >= start &&
        clock.minute < end;
    }

    return (
      clock.day === event.dayOfWeek &&
      clock.minute >= start
    ) || (
      clock.day === (event.dayOfWeek + 1) % 7 &&
      clock.minute < end
    );
  }

  return false;
}

function updateLiveButton() {
  if (!liveCalendar || !liveButton || !liveLabel) return;

  const now = new Date();
  let active = null;

  try {
    active = (liveCalendar.events || []).find(event =>
      isEventActive(
        event,
        now,
        liveCalendar.timeZone || 'America/New_York'
      )
    );
  } catch (error) {
    console.error('Invalid livestream timezone or event:', error);
  }

  const isLive = Boolean(active);

  liveButton.classList.toggle('is-live', isLive);
  liveLabel.textContent = isLive ? 'LIVE NOW' : 'Live Schedule';

  liveButton.href = isLive
    ? (active.streamUrl || liveCalendar.defaultStreamUrl || '#messages')
    : (liveCalendar.scheduleUrl || '#events');

  liveButton.setAttribute(
    'aria-label',
    isLive
      ? `Watch live: ${active.title || 'Church livestream'}`
      : 'View live event schedule'
  );

  if (isLive && /^https?:\/\//.test(liveButton.href)) {
    liveButton.target = '_blank';
    liveButton.rel = 'noopener noreferrer';
  } else {
    liveButton.removeAttribute('target');
    liveButton.removeAttribute('rel');
  }
}

async function loadLiveCalendar() {
  try {
    const response = await fetch('live-events.json', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Calendar returned ${response.status}`);
    }

    liveCalendar = await response.json();

    updateLiveButton();
    renderCalendar();
    renderWeeklyStrip();

  } catch (error) {
    console.warn(
      'Livestream calendar unavailable; showing schedule link.',
      error
    );
  }
}

loadLiveCalendar();

setInterval(updateLiveButton, 15000);
setInterval(loadLiveCalendar, 60000);

// MONTHLY CALENDAR
// Events appear ONLY inside calendar dates.

const calendarGrid = document.getElementById('calendar-grid');
const calendarMonth = document.getElementById('cal-month');

const calendarTimeZone = () =>
  liveCalendar?.timeZone || 'America/New_York';

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const value = key =>
    Number(parts.find(p => p.type === key)?.value);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day')
  };
}

const initialMonth = localParts(
  new Date(),
  'America/New_York'
);

let displayedYear = initialMonth.year;
let displayedMonth = initialMonth.month - 1;

function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function eventsForDay(year, month, day) {
  const key = dayKey(year, month, day);

  const weekday = new Date(
    Date.UTC(year, month, day)
  ).getUTCDay();

  return (liveCalendar?.events || [])
    .filter(event => {
      if (event.start) {
        const date = new Date(event.start);

        if (Number.isNaN(date.getTime())) return false;

        const p = localParts(date, calendarTimeZone());

        return dayKey(
          p.year,
          p.month - 1,
          p.day
        ) === key;
      }

      return event.dayOfWeek === weekday &&
        event.startTime &&
        event.endTime;
    })
    .sort((a, b) =>
      (a.startTime || a.start?.slice(11, 16) || '')
        .localeCompare(
          b.startTime || b.start?.slice(11, 16) || ''
        )
    );
}

function eventTime(event) {
  if (event.start) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: calendarTimeZone(),
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(event.start));
  }

  const [hour, minute] = event.startTime
    .split(':')
    .map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function renderCalendar() {
  if (!liveCalendar || !calendarGrid) return;

  const monthStart = new Date(
    Date.UTC(displayedYear, displayedMonth, 1)
  );

  calendarMonth.textContent = new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }
  ).format(monthStart);

  // Clear the calendar before rendering.
  calendarGrid.replaceChildren();

  const days = new Date(
    Date.UTC(displayedYear, displayedMonth + 1, 0)
  ).getUTCDate();

  // Empty cells before the first day.
  for (let i = 0; i < monthStart.getUTCDay(); i++) {
    const blank = document.createElement('div');
    blank.className = 'calendar-cell calendar-empty';
    blank.setAttribute('aria-hidden', 'true');
    calendarGrid.append(blank);
  }

  const today = localParts(
    new Date(),
    calendarTimeZone()
  );

  // Draw the days of the month.
  for (let day = 1; day <= days; day++) {
    const events = eventsForDay(
      displayedYear,
      displayedMonth,
      day
    );

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.setAttribute('role', 'gridcell');

    // Highlight today's date.
    if (
      today.year === displayedYear &&
      today.month === displayedMonth + 1 &&
      today.day === day
    ) {
      cell.classList.add('calendar-today');
    }

    // Display day number.
    const number = document.createElement('span');
    number.className = 'calendar-day';
    number.textContent = day;
    cell.append(number);

    // Display events INSIDE calendar dates only.
    for (const event of events) {
      const tag = document.createElement('span');
      tag.className = 'calendar-event-tag';

      tag.textContent = event.title;

      tag.title = [
        event.title,
        eventTime(event),
        event.location
      ].filter(Boolean).join(' · ');

      cell.append(tag);
    }

    calendarGrid.append(cell);
  }
}

function changeMonth(offset) {
  const date = new Date(
    Date.UTC(displayedYear, displayedMonth + offset, 1)
  );

  displayedYear = date.getUTCFullYear();
  displayedMonth = date.getUTCMonth();

  renderCalendar();
}

document.getElementById('cal-prev')
  ?.addEventListener('click', () => changeMonth(-1));

document.getElementById('cal-next')
  ?.addEventListener('click', () => changeMonth(1));

document.getElementById('cal-today')
  ?.addEventListener('click', () => {
    const p = localParts(
      new Date(),
      calendarTimeZone()
    );

    displayedYear = p.year;
    displayedMonth = p.month - 1;

    renderCalendar();
  });

// ROTATING WEEKLY SERVICE SCHEDULE

const weeklyStrip = document.querySelector('.weekly-strip');
const weeklyTitle = document.getElementById('weekly-title');
const weeklyTime = document.getElementById('weekly-time');
const weeklyDetails = document.getElementById('weekly-details');
const weeklyPause = document.getElementById('weekly-pause');

let weeklyEntries = [];
let weeklyIndex = 0;
let weeklyPaused = false;

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

function formatWeeklyTime(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) {
    return '';
  }

  const [h, m] = value.split(':').map(Number);

  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function renderWeeklyStrip() {
  if (!liveCalendar) return;

  const entries = (liveCalendar.events || []).filter(e =>
    Number.isInteger(e.dayOfWeek) &&
    e.dayOfWeek >= 0 &&
    e.dayOfWeek <= 6 &&
    formatWeeklyTime(e.startTime) &&
    formatWeeklyTime(e.endTime)
  );

  entries.sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      a.startTime.localeCompare(b.startTime)
  );

  weeklyEntries = entries;

  if (!entries.length) {
    weeklyTitle.textContent = 'No weekly events scheduled';
    weeklyTime.textContent =
      'See the full calendar for upcoming events';
    weeklyDetails.href = '#events';
    weeklyIndex = 0;
    return;
  }

  weeklyIndex %= entries.length;
  showWeeklyEntry();
}

function showWeeklyEntry() {
  if (!weeklyEntries.length) return;

  const event = weeklyEntries[weeklyIndex];

  weeklyTitle.textContent = event.title || 'Church event';

  weeklyTime.textContent =
    `${weekdays[event.dayOfWeek]} · ${formatWeeklyTime(event.startTime)}–${formatWeeklyTime(event.endTime)}`;

  const url = event.detailsUrl || '#events';

  weeklyDetails.href =
    /^(https?:|mailto:|#)/i.test(url) ? url : '#events';

  weeklyDetails.textContent = event.detailsUrl
    ? 'Event details ↗'
    : 'View calendar ↗';

  if (/^https?:/i.test(weeklyDetails.getAttribute('href'))) {
    weeklyDetails.target = '_blank';
    weeklyDetails.rel = 'noopener noreferrer';
  } else {
    weeklyDetails.removeAttribute('target');
    weeklyDetails.removeAttribute('rel');
  }
}

function advanceWeekly(delta) {
  if (!weeklyEntries.length) return;

  weeklyIndex =
    (weeklyIndex + delta + weeklyEntries.length) %
    weeklyEntries.length;

  showWeeklyEntry();
}

document.getElementById('weekly-prev')
  ?.addEventListener('click', () => advanceWeekly(-1));

document.getElementById('weekly-next')
  ?.addEventListener('click', () => advanceWeekly(1));

weeklyPause?.addEventListener('click', () => {
  weeklyPaused = !weeklyPaused;

  weeklyPause.setAttribute(
    'aria-pressed',
    String(weeklyPaused)
  );

  weeklyPause.setAttribute(
    'aria-label',
    weeklyPaused
      ? 'Resume automatic rotation'
      : 'Pause automatic rotation'
  );

  weeklyPause.textContent = weeklyPaused ? '▶' : 'Ⅱ';
});

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);

setInterval(() => {
  if (
    weeklyPaused ||
    reducedMotion.matches ||
    document.hidden ||
    weeklyStrip.matches(':hover') ||
    weeklyStrip.matches(':focus-within')
  ) return;

  advanceWeekly(1);
}, 5500);
