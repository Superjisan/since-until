(function () {
  var STORAGE_KEY = 'since-until:v1';
  var MODES = ['auto', 'show', 'hide'];
  var UNIT_KEYS = { years: 'y', months: 'mo', days: 'd', hours: 'h', minutes: 'mi', seconds: 's' };

  var els = {
    direction: document.getElementById('direction'),
    name: document.getElementById('name'),
    clock: document.getElementById('clock'),
    targetLabel: document.getElementById('target-label'),
    inputName: document.getElementById('input-name'),
    inputDate: document.getElementById('input-date'),
    unitGrid: document.getElementById('unit-grid'),
    shareButton: document.getElementById('share-button'),
    shareUrl: document.getElementById('share-url'),
    shareStatus: document.getElementById('share-status'),
    offlineStatus: document.getElementById('offline-status')
  };

  var EXAMPLES = [
    { name: 'End of the Roman Empire', target: new Date(476, 8, 4).getTime() },
    { name: "End of Donald Trump's 2nd term", target: Date.UTC(2029, 0, 20, 17, 0) }
  ];

  var state = loadState();

  function defaultModes() {
    var modes = {};
    Countdown.UNITS.forEach(function (unit) { modes[unit] = 'auto'; });
    return modes;
  }

  function loadState() {
    var fromHash = parseHash();
    if (fromHash) return fromHash;
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && isFinite(saved.target)) {
        return { name: saved.name || '', target: saved.target, modes: Object.assign(defaultModes(), saved.modes) };
      }
    } catch (e) {}
    return { name: EXAMPLES[1].name, target: EXAMPLES[1].target, modes: defaultModes() };
  }

  function parseHash() {
    var params = new URLSearchParams(location.hash.replace(/^#/, ''));
    var target = Number(params.get('t'));
    if (!params.has('t') || !isFinite(target)) return null;
    var modes = defaultModes();
    Countdown.UNITS.forEach(function (unit) {
      var code = params.get(UNIT_KEYS[unit]);
      if (MODES.indexOf(code) !== -1) modes[unit] = code;
    });
    return { name: (params.get('n') || '').slice(0, 60), target: target, modes: modes };
  }

  function buildShareUrl() {
    var params = new URLSearchParams();
    if (state.name) params.set('n', state.name);
    params.set('t', String(state.target));
    Countdown.UNITS.forEach(function (unit) {
      if (state.modes[unit] !== 'auto') params.set(UNIT_KEYS[unit], state.modes[unit]);
    });
    return location.origin + location.pathname + '#' + params.toString();
  }

  function toInputValue(timestamp) {
    var d = new Date(timestamp);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    els.shareUrl.value = buildShareUrl();
  }

  function render() {
    var now = new Date();
    var target = new Date(state.target);
    var parts = Countdown.breakdown(now, target);
    var units = Countdown.visibleUnits(parts, state.modes);

    els.direction.textContent = parts.sign === 'until' ? 'Time until' : 'Time since';
    els.name.textContent = state.name;
    els.name.hidden = !state.name;
    els.targetLabel.textContent = target.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
    document.title = (state.name ? state.name + ' · ' : '') + 'Since Until';

    renderExamples();

    els.clock.replaceChildren.apply(els.clock, units.map(function (unit) {
      var value = parts[unit];
      var box = document.createElement('div');
      box.className = 'unit';
      var number = document.createElement('span');
      number.className = 'value';
      number.textContent = value;
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = value === 1 ? unit.slice(0, -1) : unit;
      box.append(number, label);
      return box;
    }));
  }

  var exampleButtons = [];

  function compactText(parts, units) {
    return units.map(function (unit) { return parts[unit] + ' ' + unit; }).join(', ');
  }

  function renderExamples() {
    var now = new Date();
    EXAMPLES.forEach(function (example, i) {
      var parts = Countdown.breakdown(now, new Date(example.target));
      var units = Countdown.visibleUnits(parts, defaultModes());
      var button = exampleButtons[i];
      button.querySelector('.example-direction').textContent = parts.sign === 'until' ? 'Until' : 'Since';
      button.querySelector('.example-time').textContent = compactText(parts, units);
    });
  }

  function buildExamples() {
    var list = document.getElementById('example-list');
    EXAMPLES.forEach(function (example) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'example';
      var direction = document.createElement('span');
      direction.className = 'example-direction';
      var name = document.createElement('strong');
      name.textContent = example.name;
      var time = document.createElement('span');
      time.className = 'example-time';
      button.append(direction, name, time);
      button.addEventListener('click', function () {
        state = { name: example.name, target: example.target, modes: defaultModes() };
        els.inputName.value = state.name;
        els.inputDate.value = toInputValue(state.target);
        els.unitGrid.querySelectorAll('select').forEach(function (select) { select.value = 'auto'; });
        save();
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      item.appendChild(button);
      list.appendChild(item);
      exampleButtons.push(button);
    });
  }

  function buildUnitControls() {
    Countdown.UNITS.forEach(function (unit) {
      var label = document.createElement('label');
      label.textContent = unit[0].toUpperCase() + unit.slice(1);
      var select = document.createElement('select');
      select.dataset.unit = unit;
      MODES.forEach(function (mode) {
        var option = document.createElement('option');
        option.value = mode;
        option.textContent = mode[0].toUpperCase() + mode.slice(1);
        select.appendChild(option);
      });
      select.value = state.modes[unit];
      select.addEventListener('change', function () {
        state.modes[unit] = select.value;
        save();
        render();
      });
      label.appendChild(select);
      els.unitGrid.appendChild(label);
    });
  }

  els.inputName.value = state.name;
  els.inputDate.value = toInputValue(state.target);

  els.inputName.addEventListener('input', function () {
    state.name = els.inputName.value.trim();
    save();
    render();
  });

  els.inputDate.addEventListener('input', function () {
    var parsed = new Date(els.inputDate.value).getTime();
    if (!isFinite(parsed)) return;
    state.target = parsed;
    save();
    render();
  });

  els.shareButton.addEventListener('click', function () {
    var url = buildShareUrl();
    els.shareUrl.value = url;
    var done = function () { els.shareStatus.textContent = 'Copied'; };
    var fallback = function () {
      els.shareUrl.select();
      els.shareStatus.textContent = 'Press Ctrl/Cmd+C to copy';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, fallback);
    } else {
      fallback();
    }
  });

  window.addEventListener('hashchange', function () {
    var fromHash = parseHash();
    if (!fromHash) return;
    state = fromHash;
    els.inputName.value = state.name;
    els.inputDate.value = toInputValue(state.target);
    els.unitGrid.querySelectorAll('select').forEach(function (select) {
      select.value = state.modes[select.dataset.unit];
    });
    save();
    render();
  });

  var themeToggle = document.getElementById('theme-toggle');
  var root = document.documentElement;

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function renderThemeToggle() {
    var switchingToLight = currentTheme() === 'dark';
    themeToggle.textContent = switchingToLight ? '\u2600\uFE0E' : '\u263E\uFE0E';
    var label = switchingToLight ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
  }

  themeToggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('since-until:theme', next); } catch (e) {}
    renderThemeToggle();
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', renderThemeToggle);

  renderThemeToggle();
  buildUnitControls();
  buildExamples();
  save();
  render();
  setInterval(render, 1000);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').then(function () {
      els.offlineStatus.textContent = 'Works offline. Install it from your browser menu to download it.';
    }, function () {
      els.offlineStatus.textContent = 'Offline caching is unavailable in this browser.';
    });
  } else {
    els.offlineStatus.textContent = 'Running from a file: it works offline as long as you keep this folder.';
  }
})();
