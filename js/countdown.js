(function (root) {
  var UNITS = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  var MS_PER_SECOND = 1000;
  var MS_PER_MINUTE = 60000;
  var MS_PER_HOUR = 3600000;
  var HIDE_SMALL_UNITS_AFTER_YEARS = 20;

  function addMonths(date, months) {
    var result = new Date(date.getTime());
    var dayOfMonth = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    var daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(dayOfMonth, daysInMonth));
    return result;
  }

  function addDays(date, days) {
    var result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  function largestFit(start, end, stepFrom, estimate) {
    var count = Math.max(0, estimate);
    while (count > 0 && stepFrom(start, count) > end) count--;
    while (stepFrom(start, count + 1) <= end) count++;
    return count;
  }

  function breakdown(from, to) {
    var sign = to.getTime() >= from.getTime() ? 'until' : 'since';
    var earlier = sign === 'until' ? from : to;
    var later = sign === 'until' ? to : from;

    var totalMonths = largestFit(earlier, later, addMonths,
      (later.getFullYear() - earlier.getFullYear()) * 12 + later.getMonth() - earlier.getMonth());
    var years = Math.floor(totalMonths / 12);
    var months = totalMonths % 12;
    var cursor = addMonths(earlier, totalMonths);

    var days = largestFit(cursor, later, addDays, Math.floor((later - cursor) / 86400000));
    cursor = addDays(cursor, days);

    var remainder = later.getTime() - cursor.getTime();
    var hours = Math.floor(remainder / MS_PER_HOUR);
    var minutes = Math.floor((remainder - hours * MS_PER_HOUR) / MS_PER_MINUTE);
    var seconds = Math.floor((remainder - hours * MS_PER_HOUR - minutes * MS_PER_MINUTE) / MS_PER_SECOND);

    return { sign: sign, years: years, months: months, days: days, hours: hours, minutes: minutes, seconds: seconds };
  }

  // modes: object of unit -> 'auto' | 'show' | 'hide'
  function visibleUnits(parts, modes) {
    var tooFarForSmallUnits = parts.years > HIDE_SMALL_UNITS_AFTER_YEARS ||
      (parts.years === HIDE_SMALL_UNITS_AFTER_YEARS && (parts.months || parts.days || parts.hours || parts.minutes || parts.seconds));
    var seenNonZero = false;
    var visible = [];

    UNITS.forEach(function (unit) {
      var mode = (modes && modes[unit]) || 'auto';
      if (parts[unit] > 0) seenNonZero = true;
      var show;
      if (mode === 'show') show = true;
      else if (mode === 'hide') show = false;
      else if (unit === 'hours' || unit === 'minutes' || unit === 'seconds') show = !tooFarForSmallUnits && seenNonZero;
      else show = seenNonZero;
      if (show) visible.push(unit);
    });

    if (visible.length === 0 && !(modes && modes.seconds === 'hide')) visible.push('seconds');
    return visible;
  }

  root.Countdown = {
    UNITS: UNITS,
    breakdown: breakdown,
    visibleUnits: visibleUnits
  };
})(typeof window !== 'undefined' ? window : globalThis);
