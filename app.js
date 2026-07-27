(() => {
  "use strict";

  const STORAGE_KEY = "berna-v15-state";

  const QUOTES = [
    "Bugün yaptığın küçük çalışma, yarının sakinliğini kurar.",
    "Mükemmel olmak zorunda değilsin; başlaman yeterli.",
    "Dikkatini koruduğun her dakika kendine verdiğin bir sözdür.",
    "Yavaş ilerlemek, yerinde saymak değildir.",
    "Bir Pomodoro bazen bütün günün yönünü değiştirir.",
    "Kendinle yarış; dünkü senden bir adım öne geç.",
    "Zor olanı küçült: yalnızca sonraki yirmi beş dakikayı düşün."
  ];

  const DEFAULT_SUBJECTS = [
    { id: "psychology", name: "Psikoloji", icon: "🧠" },
    { id: "python", name: "Python", icon: "💻" },
    { id: "german", name: "Almanca", icon: "🇩🇪" },
    { id: "reading", name: "Okuma", icon: "📚" }
  ];

  const COSTUMES = [
    { id: "classic", name: "Miki", icon: "M", unlockAt: 0, description: "Miki'nin özgün, sade ana görünümü." }
  ];

  const ROOM_ITEMS = [
    { id: "plant", name: "Salon Bitkisi", icon: "01", unlockAt: 2, description: "Odaya sakin ve canlı bir köşe ekler." },
    { id: "rug", name: "Cozy Halı", icon: "02", unlockAt: 5, description: "Odanın merkezine sıcak bir doku ekler." },
    { id: "lamp", name: "Ayaklı Lamba", icon: "03", unlockAt: 10, description: "Akşamları yumuşak bir ışık verir." },
    { id: "desk", name: "Çalışma Masası", icon: "04", unlockAt: 18, description: "Miki için modern bir çalışma köşesi." },
    { id: "shelf", name: "Kitaplık", icon: "05", unlockAt: 30, description: "Uzun süreli ilerlemenin odadaki izi." }
  ];

  const MISSION_POOL = [
    { id: "pomodoros2", icon: "01", title: "2 Pomodoro tamamla", type: "pomodoros", target: 2 },
    { id: "focus45", icon: "02", title: "45 dakika odaklan", type: "focusMinutes", target: 45 },
    { id: "tasks2", icon: "03", title: "2 görev tamamla", type: "tasksCompleted", target: 2 },
    { id: "miki2", icon: "04", title: "Miki ile 2 kez ilgilen", type: "mikiInteractions", target: 2 },
    { id: "pomodoro1", icon: "05", title: "Bir odak seansı tamamla", type: "pomodoros", target: 1 }
  ];

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
  const pad = value => String(value).padStart(2, "0");
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function localDate(date = new Date()) {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
  }

  function dateShift(dateString, amount) {
    const [y, m, d] = dateString.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + amount);
    return localDate(date);
  }

  function prettyDate(dateString) {
    const [y, m, d] = dateString.split("-").map(Number);
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
  }

  function prettyDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Tarih seçilmedi";
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function toDateTimeLocalValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDailyMissions(dateString) {
    const seed = hashString(dateString);
    const pool = [...MISSION_POOL];
    const result = [];
    let n = seed;
    while (result.length < 3 && pool.length) {
      const index = n % pool.length;
      result.push({ ...pool.splice(index, 1)[0], claimed: false });
      n = Math.floor(n / 7) + 17;
    }
    return result;
  }

  function defaultState() {
    const today = localDate();
    return {
      version: 16.2,
      profile: { appName: "Berna", mikiName: "Miki" },
      exam: { name: "", date: "", createdAt: null },
      streak: { current: 0, longest: 0, lastStudyDate: null },
      daily: {
        date: today,
        pomodoros: 0,
        focusMinutes: 0,
        tasksCompleted: 0,
        mikiInteractions: 0,
        bondInteractions: 0,
        missions: createDailyMissions(today)
      },
      settings: { focusMinutes: 25, shortMinutes: 5, longMinutes: 15, volume: 0.25 },
      subjects: clone(DEFAULT_SUBJECTS),
      tasks: [],
      sessions: [],
      miki: { bond: 72, ownedCostumes: ["classic"], equippedCostume: "classic" },
      inventory: { roomOwned: [], roomEquipped: [] }
    };
  }

  function mergeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;

    const oldMiki = raw.miki || {};
    const merged = {
      ...base,
      profile: { ...base.profile, ...(raw.profile || {}) },
      exam: {
        ...base.exam,
        ...(raw.exam || {}),
        name: String(raw.exam?.name || "").slice(0, 40),
        date: String(raw.exam?.date || ""),
        createdAt: Number(raw.exam?.createdAt) || null
      },
      streak: { ...base.streak, ...(raw.streak || {}) },
      daily: { ...base.daily, ...(raw.daily || {}) },
      settings: {
        ...base.settings,
        focusMinutes: Number(raw.settings?.focusMinutes) || base.settings.focusMinutes,
        shortMinutes: Number(raw.settings?.shortMinutes) || base.settings.shortMinutes,
        longMinutes: Number(raw.settings?.longMinutes) || base.settings.longMinutes,
        volume: Number.isFinite(Number(raw.settings?.volume)) ? Number(raw.settings.volume) : base.settings.volume
      },
      miki: {
        ...base.miki,
        bond: clamp(Number(oldMiki.bond ?? oldMiki.love ?? base.miki.bond)),
        ownedCostumes: Array.isArray(oldMiki.ownedCostumes) ? oldMiki.ownedCostumes : ["classic"],
        equippedCostume: oldMiki.equippedCostume || "classic"
      },
      inventory: {
        roomOwned: Array.isArray(raw.inventory?.roomOwned) ? raw.inventory.roomOwned : [],
        roomEquipped: Array.isArray(raw.inventory?.roomEquipped) ? raw.inventory.roomEquipped : []
      }
    };

    merged.version = 16.2;
    merged.subjects = Array.isArray(raw.subjects) && raw.subjects.length ? raw.subjects : base.subjects;
    merged.tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    merged.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
    if (!merged.miki.ownedCostumes.includes("classic")) merged.miki.ownedCostumes.unshift("classic");
    if (!COSTUMES.some(item => item.id === merged.miki.equippedCostume)) merged.miki.equippedCostume = "classic";

    const validMissionIds = new Set(MISSION_POOL.map(item => item.id));
    if (!Array.isArray(merged.daily.missions) || merged.daily.missions.length !== 3 || merged.daily.missions.some(item => !validMissionIds.has(item.id))) {
      merged.daily.missions = createDailyMissions(merged.daily.date || localDate());
    }
    delete merged.wallet;
    delete merged.friends;
    return merged;
  }

  let state = (() => {
    try {
      return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      return defaultState();
    }
  })();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => element.classList.remove("show"), 2400);
  }

  function haptic(pattern = 10) {
    // Web/PWA fallback. Native iOS sürümünde UIImpactFeedbackGenerator ile eşleştirilecek.
    try {
      if ("vibrate" in navigator) navigator.vibrate(pattern);
    } catch {
      // Haptik desteklenmiyorsa sessizce devam eder.
    }
  }

  function totalPomodoros() {
    return state.sessions.filter(session => session.type === "focus").length;
  }

  function syncUnlocks(showMessage = false) {
    const total = totalPomodoros();
    const newlyUnlocked = [];

    ROOM_ITEMS.forEach(item => {
      if (total >= item.unlockAt && !state.inventory.roomOwned.includes(item.id)) {
        state.inventory.roomOwned.push(item.id);
        state.inventory.roomEquipped.push(item.id);
        newlyUnlocked.push(item.name);
      }
    });

    if (showMessage && newlyUnlocked.length) toast(`Yeni açıldı: ${newlyUnlocked.join(", ")}`);
  }

  function ensureDailyState() {
    const today = localDate();
    if (state.daily.date !== today) {
      state.daily = {
        date: today,
        pomodoros: 0,
        focusMinutes: 0,
        tasksCompleted: 0,
        mikiInteractions: 0,
        bondInteractions: 0,
        missions: createDailyMissions(today)
      };
    }
    if (!Array.isArray(state.daily.missions) || state.daily.missions.length !== 3) {
      state.daily.missions = createDailyMissions(today);
    }
    syncUnlocks(false);
    save();
  }

  function updateStreak() {
    const today = localDate();
    const previous = state.streak.lastStudyDate;
    if (previous === today) return;
    state.streak.current = previous === dateShift(today, -1) ? state.streak.current + 1 : 1;
    state.streak.longest = Math.max(state.streak.longest, state.streak.current);
    state.streak.lastStudyDate = today;
  }

  function missionProgress(mission) {
    return clamp(Number(state.daily[mission.type] || 0), 0, mission.target);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function renderHeader() {
    $("#brandName").textContent = state.profile.appName;
    $("#streakCount").textContent = state.streak.current;
    $("#app").dataset.theme = "cozy";
    document.title = `${state.profile.appName} V16.2`;
  }

  function examCountdownParts() {
    const target = new Date(state.exam.date);
    if (!state.exam.date || Number.isNaN(target.getTime())) return null;
    const now = Date.now();
    const difference = Math.max(0, target.getTime() - now);
    const days = Math.floor(difference / 86400000);
    const hours = Math.floor((difference % 86400000) / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);
    return { target, difference, days, hours, minutes, seconds, finished: difference <= 0 };
  }

  function renderExamCountdown() {
    const empty = $("#examEmptyState");
    const active = $("#examActiveState");
    if (!empty || !active) return;
    const countdown = examCountdownParts();
    const hasExam = Boolean(state.exam.name && countdown);
    empty.classList.toggle("hidden", hasExam);
    active.classList.toggle("hidden", !hasExam);
    $("#editExamBtn").textContent = hasExam ? "Düzenle" : "Ekle";
    if (!hasExam) {
      $("#examTitle").textContent = "Sınavına ne kadar kaldı?";
      return;
    }

    $("#examTitle").textContent = countdown.finished ? "Sınav zamanı geldi" : "Hedefin yaklaşıyor";
    $("#examName").textContent = state.exam.name;
    $("#examDateLabel").textContent = prettyDateTime(state.exam.date);
    $("#examDays").textContent = countdown.days;
    $("#examHours").textContent = pad(countdown.hours);
    $("#examMinutes").textContent = pad(countdown.minutes);
    $("#examSeconds").textContent = pad(countdown.seconds);

    const targetTime = countdown.target.getTime();
    const startTime = Number(state.exam.createdAt) || Date.now();
    const fullDuration = Math.max(1, targetTime - startTime);
    const progress = countdown.finished ? 100 : clamp(((Date.now() - startTime) / fullDuration) * 100, 0, 100);
    $("#examProgressBar").style.width = `${progress}%`;

    let message = "Her odak seansı hedefini biraz daha yaklaştırır.";
    if (countdown.finished) message = "Bugün elinden geleni yap. Miki seninle.";
    else if (countdown.days === 0) message = "Son gün. Yeni konu açmak yerine bildiklerini sakinçe toparla.";
    else if (countdown.days <= 3) message = "Son düzlüktesin. Önceliklerini sade tut ve düzenli mola ver.";
    else if (countdown.days <= 14) message = "Planını küçük parçalara böl. Bugünün tek hedefi yeterli.";
    $("#examCountdownMessage").textContent = message;
  }

  function openExamSettings() {
    renderSettings();
    const dialog = $("#settingsDialog");
    if (!dialog.open) dialog.showModal();
    window.setTimeout(() => $("#examNameInput")?.focus(), 80);
  }

  function renderToday() {
    const quoteIndex = hashString(localDate()) % QUOTES.length;
    $("#dailyQuote").textContent = QUOTES[quoteIndex];
    renderExamCountdown();
    $("#todayFocus").textContent = `${state.daily.focusMinutes} dk`;
    $("#todayPomodoros").textContent = state.daily.pomodoros;
    $("#todayCompletedTasks").textContent = state.daily.tasksCompleted;
    $("#missionDate").textContent = prettyDate(state.daily.date);

    $("#dailyMissions").innerHTML = state.daily.missions.map(mission => {
      const progress = missionProgress(mission);
      const ready = progress >= mission.target;
      return `
        <div class="mission ${mission.claimed ? "completed" : ""}">
          <div class="mission-icon">${mission.icon}</div>
          <div>
            <h4>${mission.title}</h4>
            <p>${progress}/${mission.target}${mission.claimed ? " · Tamamlandı" : ""}</p>
            <div class="progress-track"><span style="width:${(progress / mission.target) * 100}%"></span></div>
          </div>
          <button class="${ready && !mission.claimed ? "primary-btn" : "ghost-btn"} mission-claim" data-mission="${mission.id}" ${!ready || mission.claimed ? "disabled" : ""}>${mission.claimed ? "Bitti" : ready ? "Tamamla" : "Devam"}</button>
        </div>`;
    }).join("");

    $$(".mission-claim").forEach(button => button.addEventListener("click", () => {
      const mission = state.daily.missions.find(item => item.id === button.dataset.mission);
      if (!mission || mission.claimed || missionProgress(mission) < mission.target) return;
      mission.claimed = true;
      state.miki.bond = clamp(state.miki.bond + 2);
      save();
      toast("Günlük hedef tamamlandı. Miki ile bağın güçlendi.");
      renderAll();
    }));

    const todays = state.tasks
      .filter(task => !task.completed && task.date <= localDate())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    $("#todayTodoList").innerHTML = todays.length ? todays.map(task => {
      const subject = state.subjects.find(item => item.id === task.subjectId);
      return `<div class="task-item"><span>${subject?.icon || "•"}</span><div><h4>${escapeHtml(task.title)}</h4><p>${subject?.name || "Genel"} · ${task.minutes} dk · ${prettyDate(task.date)}</p></div><button class="icon-btn today-complete" data-id="${task.id}" aria-label="Tamamla">✓</button></div>`;
    }).join("") : `<div class="empty-state">Bugün için açık görev yok. Güzel bir nefes al.</div>`;

    $$(".today-complete").forEach(button => button.addEventListener("click", () => toggleTask(button.dataset.id, true)));
  }

  function renderSubjectSelects() {
    const options = state.subjects.map(subject => `<option value="${subject.id}">${subject.icon} ${escapeHtml(subject.name)}</option>`).join("");
    [$("#focusSubject"), $("#taskSubject")].forEach(select => {
      const current = select.value;
      select.innerHTML = options;
      if ([...select.options].some(option => option.value === current)) select.value = current;
    });
  }

  let taskFilter = "all";

  function renderAgenda() {
    const today = localDate();
    let tasks = [...state.tasks].sort((a, b) => Number(a.completed) - Number(b.completed) || a.date.localeCompare(b.date));
    if (taskFilter === "open") tasks = tasks.filter(task => !task.completed);
    if (taskFilter === "today") tasks = tasks.filter(task => task.date === today);
    if (taskFilter === "completed") tasks = tasks.filter(task => task.completed);

    $("#openTaskCount").textContent = state.tasks.filter(task => !task.completed).length;
    $("#taskList").innerHTML = tasks.length ? tasks.map(task => {
      const subject = state.subjects.find(item => item.id === task.subjectId);
      const priorityLabel = { low: "Düşük", medium: "Orta", high: "Yüksek" }[task.priority] || "Orta";
      return `<div class="task-item ${task.completed ? "done" : ""}">
        <input class="task-check" type="checkbox" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Görevi tamamla" />
        <div><h4>${escapeHtml(task.title)}</h4><p>${subject?.icon || "•"} ${subject?.name || "Genel"}</p><div class="task-meta"><span class="tag priority-${task.priority}">${priorityLabel}</span><span class="tag">${prettyDate(task.date)}</span><span class="tag">${task.minutes} dk</span></div></div>
        <button class="icon-btn task-delete" data-id="${task.id}" aria-label="Görevi sil">×</button>
      </div>`;
    }).join("") : `<div class="empty-state">Bu filtrede görev bulunmuyor.</div>`;

    $$(".task-check").forEach(input => input.addEventListener("change", () => toggleTask(input.dataset.id, input.checked)));
    $$(".task-delete").forEach(button => button.addEventListener("click", () => {
      state.tasks = state.tasks.filter(task => task.id !== button.dataset.id);
      save();
      renderAll();
    }));
  }

  function toggleTask(id, completed) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    task.completed = completed;
    if (completed && !task.countedForDaily) {
      task.countedForDaily = true;
      state.daily.tasksCompleted += 1;
      state.miki.bond = clamp(state.miki.bond + 1);
      toast("Görev tamamlandı.");
    }
    save();
    renderAll();
  }

  let mikiMotion = "motion-idle";
  let mikiMotionTimer = null;

  function getMikiMood() {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) return { label: "Sakin gece modunda", tone: "sleepy" };
    if (state.daily.focusMinutes >= 90) return { label: "Seninle gurur duyuyor", tone: "excited" };
    if (state.daily.mikiInteractions > 0) return { label: "Keyfi yerinde", tone: "loving" };
    if (state.miki.bond >= 85) return { label: "Sana çok bağlı", tone: "loving" };
    return { label: "Seni gördüğüne sevindi", tone: "calm" };
  }

  function nextUnlockHint() {
    const total = totalPomodoros();
    const next = ROOM_ITEMS.filter(item => item.unlockAt > total)
      .sort((a, b) => a.unlockAt - b.unlockAt)[0];
    if (!next) return "Tüm koleksiyon parçalarını açtın.";
    return `${next.name} için ${next.unlockAt - total} odak seansı daha.`;
  }

  function renderMiki() {
    syncUnlocks(false);
    $("#mikiNameTitle").textContent = state.profile.mikiName;
    state.miki.equippedCostume = "classic";
    state.miki.ownedCostumes = ["classic"];

    const cat = $("#pixelCat");
    cat.className = `pixel-cat cozy-pixel-cat ${mikiMotion}`;
    cat.setAttribute("aria-label", `${state.profile.mikiName}, dokunuşları gözleriyle takip eden cozy pixel kedi`);

    const mood = getMikiMood();
    const moodChip = $("#petMoodChip");
    moodChip.className = `pet-mood-chip mood-${mood.tone}`;
    moodChip.innerHTML = `<span></span> ${mood.label}`;
    $("#mikiLiveStateTag").textContent = currentMikiActivityLabel();

    $("#mikiBondValue").textContent = state.miki.bond;
    $("#mikiBondBar").style.width = `${state.miki.bond}%`;
    $("#mikiBondHint").textContent = nextUnlockHint();
  }

  function playMikiMotion(motion, duration = 1800) {
    clearTimeout(mikiMotionTimer);
    mikiMotion = motion;
    renderMiki();
    if (duration > 0) {
      mikiMotionTimer = setTimeout(() => {
        mikiMotion = "motion-idle";
        renderMiki();
      }, duration);
    }
  }

  function interactWithMiki(action) {
    const messages = {
      pet: `${state.profile.mikiName} sana doğru yaklaşıp sakinleşti.`,
      play: `${state.profile.mikiName} kısa bir oyun molası verdi.`,
      rest: `${state.profile.mikiName} gözlerini kapatıp dinleniyor.`
    };
    const motionMap = { pet: "motion-love", play: "motion-play", rest: "motion-sleep" };

    state.daily.mikiInteractions += 1;
    if (state.daily.bondInteractions < 3) {
      state.daily.bondInteractions += 1;
      state.miki.bond = clamp(state.miki.bond + 1);
    }
    $("#mikiSpeech").textContent = messages[action] || `${state.profile.mikiName} sana baktı.`;
    haptic(action === "play" ? [10, 35, 10] : 10);
    save();
    renderToday();
    playMikiMotion(motionMap[action] || "motion-look", action === "rest" ? 2600 : 1900);
  }

  function startMikiAmbientAnimations() {
    window.setInterval(() => {
      if (!$("#miki")?.classList.contains("active") || mikiMotion !== "motion-idle") return;
      const motions = ["motion-look", "motion-stretch", "motion-idle", "motion-idle"];
      const selected = motions[Math.floor(Math.random() * motions.length)];
      if (selected !== "motion-idle") playMikiMotion(selected, 1900);
    }, 7600);
  }

  let celebrationUntil = 0;
  let eyeResetTimer = null;

  function currentMikiActivity() {
    if (Date.now() < celebrationUntil) return "celebrate";
    if (timer?.running && timer.mode === "focus") return "work";
    if (timer?.running && timer.mode !== "focus") return "break";
    return "idle";
  }

  function currentMikiActivityLabel() {
    const labels = { idle: "Canlı", work: "Odakta", break: "Molada", celebrate: "Kutluyor" };
    return labels[currentMikiActivity()] || "Canlı";
  }

  function renderFocusCompanion() {
    const scene = $("#focusMikiScene");
    if (!scene) return;
    const activity = currentMikiActivity();
    scene.dataset.state = activity;
    scene.className = `focus-miki-scene pixel-focus-scene state-${activity}`;
    const titles = {
      idle: "Seansa hazır",
      work: "Seninle çalışıyor",
      break: "Mola veriyor",
      celebrate: "Seansı kutluyor"
    };
    const tags = { idle: "Hazır", work: "Odakta", break: "Mola", celebrate: "Tamamlandı" };
    const messages = {
      idle: "Başladığında Miki de masasına geçecek.",
      work: "Miki masada. Dikkatini seçtiğin derste tut.",
      break: "Miki geriniyor ve bir süre pencereye bakıyor.",
      celebrate: "Seans tamamlandı. Miki kısa bir kutlama yapıyor."
    };
    $("#focusMikiTitle").textContent = titles[activity];
    $("#focusMikiStateTag").textContent = tags[activity];
    $("#focusMikiMessage").textContent = messages[activity];
  }

  function updateMikiEyes(clientX, clientY, source) {
    const target = source || $("#pixelCat");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp((clientX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
    const y = clamp((clientY - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1);
    target.style.setProperty("--look-x", `${(x * 4.8).toFixed(2)}px`);
    target.style.setProperty("--look-y", `${(y * 3.5).toFixed(2)}px`);
    target.classList.add("is-looking");
    clearTimeout(eyeResetTimer);
    eyeResetTimer = setTimeout(() => {
      target.style.setProperty("--look-x", "0px");
      target.style.setProperty("--look-y", "0px");
      target.classList.remove("is-looking");
    }, 1150);
  }

  function setupMikiEyeTracking() {
    const stage = $(".pet-stage");
    const cat = $("#pixelCat");
    if (!stage || !cat) return;
    stage.addEventListener("pointermove", event => updateMikiEyes(event.clientX, event.clientY, cat));
    stage.addEventListener("pointerdown", event => {
      updateMikiEyes(event.clientX, event.clientY, cat);
      haptic(7);
    });
    cat.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      haptic(7);
      playMikiMotion("motion-look", 1500);
    });
  }

  function renderRoom() {
    const hour = new Date().getHours();
    const period = hour < 6 || hour >= 21 ? "night" : hour < 11 ? "morning" : hour < 17 ? "day" : "evening";
    const labels = { night: "Gece modu", morning: "Sabah ışığı", day: "Gün ışığı", evening: "Akşam ışığı" };
    $("#roomTimeTag").textContent = labels[period];
    $("#roomScene").dataset.period = period;
    $("#roomScene").classList.toggle("night", period === "night");
    $$('[data-room-item]').forEach(item => item.classList.toggle("hidden-item", !state.inventory.roomEquipped.includes(item.dataset.roomItem)));
    const activity = currentMikiActivity();
    $("#roomScene").dataset.mikiState = activity;
    const roomCat = $("#roomCat");
    roomCat.className = `room-cat room-state-${activity}`;
    const activityText = { idle: "odada sakinçe dolaşıyor", work: "masasında çalışıyor", break: "pencereye bakıp geriniyor", celebrate: "seansı kutluyor" };
    roomCat.setAttribute("aria-label", `${state.profile.mikiName} ${activityText[activity]}`);
  }

  function renderCollection() {
    const total = totalPomodoros();
    const unlockedCount = ROOM_ITEMS.filter(item => state.inventory.roomOwned.includes(item.id) || total >= item.unlockAt).length;
    $("#collectionProgress").textContent = `${unlockedCount}/${ROOM_ITEMS.length} açık`;

    $("#collectionGrid").innerHTML = ROOM_ITEMS.map(item => {
      const owned = state.inventory.roomOwned.includes(item.id) || total >= item.unlockAt;
      const equipped = state.inventory.roomEquipped.includes(item.id);
      return `<article class="collection-card ${owned ? "" : "locked"}">
        <div class="collection-art">${item.icon}</div><h3>${item.name}</h3><p>${item.description}</p>
        <div class="unlock-note">${owned ? "Koleksiyonunda" : `${item.unlockAt} odak seansında açılır`}</div>
        <button class="${owned ? "secondary-btn" : "ghost-btn"} collection-action" data-id="${item.id}" ${owned ? "" : "disabled"}>${owned ? equipped ? "Odadan kaldır" : "Odaya ekle" : `${Math.max(0, item.unlockAt - total)} seans kaldı`}</button>
      </article>`;
    }).join("");

    $$(".collection-action:not(:disabled)").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (!state.inventory.roomOwned.includes(id)) state.inventory.roomOwned.push(id);
      const index = state.inventory.roomEquipped.indexOf(id);
      if (index >= 0) state.inventory.roomEquipped.splice(index, 1);
      else state.inventory.roomEquipped.push(id);
      save();
      renderCollection();
      renderRoom();
    }));
  }

  function renderStats() {
    const focusSessions = state.sessions.filter(session => session.type === "focus");
    const totalMinutes = focusSessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0);
    $("#totalPomodoros").textContent = focusSessions.length;
    $("#totalHours").textContent = `${(totalMinutes / 60).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sa`;
    $("#averageFocus").textContent = `${focusSessions.length ? Math.round(totalMinutes / focusSessions.length) : 0} dk`;
    $("#longestStreak").textContent = `${state.streak.longest} gün`;

    const dates = Array.from({ length: 7 }, (_, index) => dateShift(localDate(), index - 6));
    const totals = dates.map(date => focusSessions.filter(session => session.date === date).reduce((sum, session) => sum + Number(session.minutes || 0), 0));
    const max = Math.max(...totals, 1);
    const formatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });
    $("#weeklyChart").innerHTML = dates.map((date, index) => {
      const [y, m, d] = date.split("-").map(Number);
      return `<div class="bar-column"><div class="bar" style="height:${Math.max(4, (totals[index] / max) * 180)}px" title="${totals[index]} dakika"></div><strong>${totals[index]} dk</strong><small>${formatter.format(new Date(y, m - 1, d)).replace(".", "")}</small></div>`;
    }).join("");

    const bestIndex = totals.indexOf(Math.max(...totals));
    $("#bestDay").textContent = totals[bestIndex] ? `En iyi: ${prettyDate(dates[bestIndex])}` : "Henüz veri yok";

    const subjectMap = new Map();
    focusSessions.forEach(session => subjectMap.set(session.subjectId, (subjectMap.get(session.subjectId) || 0) + Number(session.minutes || 0)));
    const subjectEntries = [...subjectMap.entries()].sort((a, b) => b[1] - a[1]);
    const subjectMax = Math.max(...subjectEntries.map(entry => entry[1]), 1);
    $("#subjectStats").innerHTML = subjectEntries.length ? subjectEntries.map(([id, minutes]) => {
      const subject = state.subjects.find(item => item.id === id);
      return `<div class="subject-row"><strong>${subject?.icon || "•"} ${escapeHtml(subject?.name || "Silinmiş ders")}</strong><div class="progress-track"><span style="width:${(minutes / subjectMax) * 100}%"></span></div><small>${minutes} dk</small></div>`;
    }).join("") : `<div class="empty-state">İlk odak seansından sonra ders dağılımın burada görünecek.</div>`;
  }

  function renderSettings() {
    $("#appNameInput").value = state.profile.appName;
    $("#mikiNameInput").value = state.profile.mikiName;
    $("#focusMinutesInput").value = state.settings.focusMinutes;
    $("#shortMinutesInput").value = state.settings.shortMinutes;
    $("#longMinutesInput").value = state.settings.longMinutes;
    $("#examNameInput").value = state.exam.name || "";
    $("#examDateInput").value = toDateTimeLocalValue(state.exam.date);
    $("#clearExamBtn").disabled = !state.exam.date;
    $("#subjectList").innerHTML = state.subjects.map(subject => `<span class="chip">${subject.icon} ${escapeHtml(subject.name)}${DEFAULT_SUBJECTS.some(def => def.id === subject.id) ? "" : ` <button class="icon-btn remove-subject" data-id="${subject.id}" aria-label="Dersi sil">×</button>`}</span>`).join("");
    $$(".remove-subject").forEach(button => button.addEventListener("click", () => {
      if (state.tasks.some(task => task.subjectId === button.dataset.id) || state.sessions.some(session => session.subjectId === button.dataset.id)) return toast("Bu ders geçmiş kayıtlarda kullanıldığı için silinemez.");
      state.subjects = state.subjects.filter(subject => subject.id !== button.dataset.id);
      save();
      renderAll();
    }));
  }

  function renderAll() {
    ensureDailyState();
    renderHeader();
    renderSubjectSelects();
    renderToday();
    renderAgenda();
    renderMiki();
    renderRoom();
    renderCollection();
    renderStats();
    renderExamCountdown();
    renderSettings();
    $("#focusTodayCount").textContent = state.daily.pomodoros;
  }

  const timer = { mode: "focus", total: 0, remaining: 0, running: false, interval: null };
  const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 104;
  const modeToMinutes = mode => mode === "focus" ? state.settings.focusMinutes : mode === "short" ? state.settings.shortMinutes : state.settings.longMinutes;
  const modeLabels = { focus: "ODAK", short: "KISA MOLA", long: "UZUN MOLA" };

  function setTimerMode(mode, preserveRunning = false) {
    if (!preserveRunning) stopTimerInterval();
    timer.mode = mode;
    timer.total = modeToMinutes(mode) * 60;
    timer.remaining = timer.total;
    $$(".mode-btn").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
    $("#timerModeLabel").textContent = modeLabels[mode];
    $("#timerOrbit").dataset.mode = mode;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    $("#timerDisplay").textContent = `${pad(minutes)}:${pad(seconds)}`;
    const remainingRatio = timer.total ? clamp(timer.remaining / timer.total, 0, 1) : 1;
    const ring = $("#timerRingProgress");
    ring.style.strokeDasharray = `${TIMER_RING_CIRCUMFERENCE}`;
    ring.style.strokeDashoffset = `${TIMER_RING_CIRCUMFERENCE * (1 - remainingRatio)}`;
    $("#timerOrbit").classList.toggle("running", timer.running);
    document.title = timer.running ? `${pad(minutes)}:${pad(seconds)} · ${state.profile.appName}` : `${state.profile.appName} V16.2`;
    renderFocusCompanion();
    renderRoom();
    if ($("#miki")?.classList.contains("active")) renderMiki();
  }

  function startTimer() {
    if (timer.running) return;
    timer.running = true;
    haptic(10);
    $("#timerStatus").textContent = timer.mode === "focus" ? "Odak seansı sürüyor." : "Molanın tadını çıkar.";
    updateTimerDisplay();
    timer.interval = setInterval(() => {
      timer.remaining -= 1;
      if (timer.remaining <= 0) completeTimer();
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimerInterval() {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
  }

  function pauseTimer() {
    stopTimerInterval();
    haptic(7);
    $("#timerStatus").textContent = "Sayaç duraklatıldı.";
    updateTimerDisplay();
  }

  function resetTimer() {
    stopTimerInterval();
    timer.total = modeToMinutes(timer.mode) * 60;
    timer.remaining = timer.total;
    haptic([7, 35, 7]);
    $("#timerStatus").textContent = "Sayaç sıfırlandı.";
    updateTimerDisplay();
  }

  function completeTimer() {
    stopTimerInterval();
    beep();
    if (timer.mode === "focus") {
      const minutes = modeToMinutes("focus");
      const subjectId = $("#focusSubject").value || state.subjects[0]?.id;
      state.sessions.push({ id: uid("session"), type: "focus", date: localDate(), timestamp: Date.now(), minutes, subjectId });
      state.daily.pomodoros += 1;
      state.daily.focusMinutes += minutes;
      state.miki.bond = clamp(state.miki.bond + 2);
      updateStreak();
      syncUnlocks(true);
      celebrationUntil = Date.now() + 2400;
      haptic([18, 45, 22]);
      playMikiMotion("motion-celebrate", 2400);
      setTimerMode("short");
      $("#timerStatus").textContent = "Harika. Şimdi kısa bir mola.";
      toast("Odak seansı tamamlandı. Miki seninle kutluyor.");
      window.setTimeout(() => {
        celebrationUntil = 0;
        renderFocusCompanion();
        renderRoom();
      }, 2450);
    } else {
      setTimerMode("focus");
      $("#timerStatus").textContent = "Mola bitti. Yeni bir odak turuna hazır mısın?";
    }
    save();
    renderAll();
  }

  function beep() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.6);
    } catch {
      // Ses zorunlu değil.
    }
  }

  let audio = { context: null, source: null, nodes: [], gain: null, type: "off" };

  function stopAmbient() {
    if (audio.source) {
      try { audio.source.stop(); } catch { /* noop */ }
    }
    audio.nodes.forEach(node => { try { node.disconnect(); } catch { /* noop */ } });
    audio = { context: audio.context, source: null, nodes: [], gain: null, type: "off" };
  }

  function startAmbient(type) {
    stopAmbient();
    audio.type = type;
    if (type === "off") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return toast("Tarayıcın ortam sesini desteklemiyor.");
    audio.context ||= new AudioContext();
    if (audio.context.state === "suspended") audio.context.resume();
    const ctx = audio.context;
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (type === "fire") {
        const crackle = Math.random() > 0.995 ? (Math.random() * 2 - 1) * 2.5 : 0;
        data[i] = white * 0.18 + crackle;
      } else if (type === "wind" || type === "forest") {
        last = last * 0.985 + white * 0.015;
        data[i] = last * 3.2;
      } else {
        data[i] = white;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    if (type === "rain") { filter.type = "highpass"; filter.frequency.value = 900; }
    if (type === "forest") { filter.type = "lowpass"; filter.frequency.value = 950; }
    if (type === "fire") { filter.type = "lowpass"; filter.frequency.value = 1800; }
    if (type === "wind") { filter.type = "bandpass"; filter.frequency.value = 420; filter.Q.value = 0.7; }
    if (type === "white") filter.type = "allpass";
    const gain = ctx.createGain();
    gain.gain.value = state.settings.volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    audio.source = source;
    audio.nodes = [source, filter, gain];
    audio.gain = gain;
  }

  function bindEvents() {
    $$(".nav-btn").forEach(button => button.addEventListener("click", () => { haptic(5); navigate(button.dataset.page); }));
    $$('[data-go]').forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
    window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "today", false));

    $$(".mode-btn").forEach(button => button.addEventListener("click", () => { haptic(6); setTimerMode(button.dataset.mode); }));
    $("#startTimer").addEventListener("click", startTimer);
    $("#pauseTimer").addEventListener("click", pauseTimer);
    $("#resetTimer").addEventListener("click", resetTimer);

    $$(".sound-btn").forEach(button => button.addEventListener("click", () => {
      $$(".sound-btn").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      startAmbient(button.dataset.sound);
    }));
    $("#volumeControl").value = state.settings.volume;
    $("#volumeControl").addEventListener("input", event => {
      state.settings.volume = Number(event.target.value);
      if (audio.gain) audio.gain.gain.value = state.settings.volume;
      save();
    });

    $("#taskDate").value = localDate();
    $("#taskForm").addEventListener("submit", event => {
      event.preventDefault();
      state.tasks.push({
        id: uid("task"),
        title: $("#taskTitle").value.trim(),
        subjectId: $("#taskSubject").value,
        priority: $("#taskPriority").value,
        date: $("#taskDate").value,
        minutes: Number($("#taskMinutes").value) || 30,
        completed: false,
        countedForDaily: false,
        createdAt: Date.now()
      });
      event.target.reset();
      $("#taskDate").value = localDate();
      $("#taskMinutes").value = 30;
      save();
      renderAll();
      toast("Görev ajandaya eklendi.");
    });

    $$(".filter-btn").forEach(button => button.addEventListener("click", () => {
      taskFilter = button.dataset.filter;
      $$(".filter-btn").forEach(item => item.classList.toggle("active", item === button));
      renderAgenda();
    }));

    $$(".pet-action").forEach(button => button.addEventListener("click", () => interactWithMiki(button.dataset.petAction)));

    $("#settingsBtn").addEventListener("click", () => {
      renderSettings();
      $("#settingsDialog").showModal();
    });
    $("#editExamBtn").addEventListener("click", openExamSettings);
    $("#addExamBtn").addEventListener("click", openExamSettings);
    $("#closeSettingsDialog").addEventListener("click", () => $("#settingsDialog").close());
    $("#settingsDialog").addEventListener("click", event => {
      if (event.target === $("#settingsDialog")) $("#settingsDialog").close();
    });

    $("#profileForm").addEventListener("submit", event => {
      event.preventDefault();
      state.profile.appName = $("#appNameInput").value.trim() || "Berna";
      state.profile.mikiName = $("#mikiNameInput").value.trim() || "Miki";
      save();
      renderAll();
      toast("İsimler kaydedildi.");
    });

    $("#timerSettingsForm").addEventListener("submit", event => {
      event.preventDefault();
      state.settings.focusMinutes = clamp(Number($("#focusMinutesInput").value), 1, 180);
      state.settings.shortMinutes = clamp(Number($("#shortMinutesInput").value), 1, 60);
      state.settings.longMinutes = clamp(Number($("#longMinutesInput").value), 1, 90);
      save();
      setTimerMode(timer.mode);
      renderSettings();
      toast("Sayaç süreleri kaydedildi.");
    });

    $("#examForm").addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#examNameInput").value.trim() || "Sınavım";
      const dateValue = $("#examDateInput").value;
      const target = new Date(dateValue);
      if (!dateValue || Number.isNaN(target.getTime())) return toast("Geçerli bir sınav tarihi seç.");
      if (target.getTime() <= Date.now()) return toast("Sınav tarihi gelecekte olmalı.");
      state.exam = { name, date: dateValue, createdAt: Date.now() };
      save();
      renderAll();
      $("#settingsDialog").close();
      haptic([10, 35, 10]);
      toast("Sınav geri sayımı kaydedildi.");
    });

    $("#clearExamBtn").addEventListener("click", () => {
      if (!state.exam.date) return;
      state.exam = { name: "", date: "", createdAt: null };
      save();
      renderAll();
      toast("Sınav geri sayımı kaldırıldı.");
    });

    $("#subjectForm").addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#subjectNameInput").value.trim();
      const icon = $("#subjectIconInput").value.trim() || "📘";
      if (state.subjects.some(subject => subject.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) return toast("Bu ders zaten var.");
      state.subjects.push({ id: uid("subject"), name, icon });
      event.target.reset();
      save();
      renderAll();
      toast("Ders eklendi.");
    });

    $("#exportData").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `berna-yedek-${localDate()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    $("#importData").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        state = mergeState(JSON.parse(await file.text()));
        ensureDailyState();
        save();
        renderAll();
        setTimerMode("focus");
        toast("Yedek başarıyla içe aktarıldı.");
      } catch {
        toast("Bu JSON yedeği okunamadı.");
      }
      event.target.value = "";
    });

    $("#resetData").addEventListener("click", () => {
      if (!confirm("Tüm Berna verileri silinsin mi? Bu işlem geri alınamaz.")) return;
      state = defaultState();
      save();
      renderAll();
      setTimerMode("focus");
      toast("Berna sıfırlandı.");
    });
  }

  function navigate(page, updateHash = true) {
    const allowed = new Set(["today", "focus", "agenda", "miki", "stats"]);
    const target = allowed.has(page) ? page : "today";
    $$(".page").forEach(section => section.classList.toggle("active", section.id === target));
    $$(".nav-btn").forEach(button => button.classList.toggle("active", button.dataset.page === target));
    if (updateHash && location.hash !== `#${target}`) history.pushState(null, "", `#${target}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (target === "stats") renderStats();
    if (target === "miki") { renderMiki(); renderRoom(); renderCollection(); }
  }

  let deferredInstallPrompt = null;

  function setupPwa() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      $("#installBtn").classList.remove("hidden");
    });
    $("#installBtn").addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $("#installBtn").classList.add("hidden");
    });
  }

  function init() {
    ensureDailyState();
    bindEvents();
    renderAll();
    setTimerMode("focus");
    navigate(location.hash.slice(1) || "today", false);
    setupMikiEyeTracking();
    startMikiAmbientAnimations();
    renderFocusCompanion();
    window.setInterval(renderExamCountdown, 1000);
    setupPwa();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
