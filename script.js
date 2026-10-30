
"use strict";

// ================================================
// НАСТРОЙКИ
// ================================================

const API_KEY = "d17328196ec311593d92335088b3562e";
const BASE_URL = "https://api.openweathermap.org";

const $ = (id) => document.getElementById(id);

let currentWeather = null;
let forecastData = null;
let currentUnit = "C";
let requestId = 0;
let searchSequence = 0;

// ================================================
// ПОГОДНЫЙ CANVAS
// ================================================

const canvas = $("weatherCanvas");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
let dpr = 1;
let elapsed = 0;
let lastFrameTime = 0;
let weatherEffect = "clear";
let particles = [];
let clouds = [];
let lightningFlash = 0;
let nextLightning = 5;
let animationFrame = null;

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const backgrounds = {
  clear: "linear-gradient(135deg, #10284b 0%, #235b86 50%, #10223e 100%)",
  clouds: "linear-gradient(135deg, #172638 0%, #41566c 50%, #152334 100%)",
  rain: "linear-gradient(135deg, #071321 0%, #1b344d 50%, #0a1422 100%)",
  drizzle: "linear-gradient(135deg, #12263b 0%, #34516b 50%, #0e1b2b 100%)",
  thunderstorm: "linear-gradient(135deg, #090b18 0%, #28223f 50%, #0b1220 100%)",
  snow: "linear-gradient(135deg, #263d55 0%, #617c98 50%, #1b3048 100%)",
  mist: "linear-gradient(135deg, #283541 0%, #526574 50%, #18232e 100%)",
  night: "linear-gradient(135deg, #030712 0%, #101a34 55%, #080d1b 100%)"
};

function random(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createParticles();

  if (reduceMotion) {
    drawFrame(0);
  }
}

function createParticles() {
  particles = [];
  clouds = [];

  // Количество частиц зависит от размера экрана.
  const area = (width * height) / 10000;
  const count = Math.min(160, Math.max(35, Math.floor(area)));

  for (let i = 0; i < count; i++) {
    particles.push({
      x: random(0, width),
      y: random(0, height),
      size: random(0.8, 2.5),
      speed: random(0.6, 1.5),
      length: random(10, 26),
      drift: random(-0.7, 0.7),
      phase: random(0, Math.PI * 2)
    });
  }

  for (let i = 0; i < 7; i++) {
    clouds.push({
      x: random(-100, width + 100),
      y: random(30, height * 0.6),
      scale: random(0.6, 1.7),
      speed: random(5, 14),
      alpha: random(0.025, 0.085)
    });
  }
}

function getEffectType(condition, iconCode = "") {
  const type = String(condition || "").toLowerCase();

  if (type === "thunderstorm") return "thunderstorm";
  if (type === "snow") return "snow";
  if (type === "rain") return "rain";
  if (type === "drizzle") return "drizzle";
  if (type === "clouds") return "clouds";

  if (
    ["mist", "fog", "haze", "smoke", "dust", "sand", "ash", "squall", "tornado"].includes(type)
  ) {
    return "mist";
  }

  if (String(iconCode).endsWith("n")) return "night";

  return "clear";
}

function setWeatherBackground(condition, iconCode = "") {
  weatherEffect = getEffectType(condition, iconCode);

  document.body.style.background =
    backgrounds[weatherEffect] || backgrounds.clear;

  document.body.style.backgroundAttachment = "fixed";

  lightningFlash = 0;
  nextLightning = elapsed + random(3, 8);

  createParticles();

  if (reduceMotion) {
    drawFrame(0);
  }
}

// ================================================
// АНИМАЦИЯ ДОЖДЯ
// ================================================

function drawRain(delta) {
  ctx.save();

  ctx.strokeStyle = "rgba(205, 225, 255, 0.40)";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  for (const p of particles) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 4, p.y + p.length);
    ctx.stroke();

    p.x -= 95 * p.speed * delta;
    p.y += 480 * p.speed * delta;

    if (p.y > height + 30) {
      p.y = -random(10, 100);
      p.x = random(0, width);
    }

    if (p.x < -30) p.x = width + 20;
  }

  ctx.restore();
}

// ================================================
// АНИМАЦИЯ МЕЛКОГО ДОЖДЯ
// ================================================

function drawDrizzle(delta) {
  ctx.save();

  ctx.strokeStyle = "rgba(220, 235, 255, 0.30)";
  ctx.lineWidth = 1;

  for (const p of particles) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 1.5, p.y + p.length * 0.6);
    ctx.stroke();

    p.x -= 12 * delta;
    p.y += 145 * p.speed * delta;

    if (p.y > height + 10) {
      p.y = -10;
      p.x = random(0, width);
    }
  }

  ctx.restore();
}

// ================================================
// АНИМАЦИЯ СНЕГА
// ================================================

function drawSnow(delta) {
  ctx.save();

  for (const p of particles) {
    const sway = Math.sin(elapsed * 0.8 + p.phase);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);

    ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + p.size * 0.12})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(210, 235, 255, 0.7)";
    ctx.fill();

    p.x += (sway * 12 + p.drift * 15) * delta;
    p.y += (22 + p.speed * 28) * delta;

    if (p.y > height + 10) {
      p.y = -10;
      p.x = random(0, width);
    }

    if (p.x > width + 10) p.x = -10;
    if (p.x < -10) p.x = width + 10;
  }

  ctx.restore();
}

// ================================================
// АНИМАЦИЯ ОБЛАКОВ
// ================================================

function drawClouds(delta) {
  ctx.save();

  for (const cloud of clouds) {
    const x = cloud.x;
    const y = cloud.y;
    const s = cloud.scale;

    ctx.fillStyle = `rgba(220, 233, 247, ${cloud.alpha})`;
    ctx.beginPath();

    ctx.ellipse(x, y, 100 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 35 * s, y - 12 * s, 42 * s, 30 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10 * s, y - 25 * s, 52 * s, 40 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 48 * s, y - 7 * s, 42 * s, 28 * s, 0, 0, Math.PI * 2);

    ctx.fill();

    cloud.x += cloud.speed * delta;

    if (cloud.x > width + 180) {
      cloud.x = -180;
      cloud.y = random(30, height * 0.6);
    }
  }

  ctx.restore();
}

// ================================================
// СОЛНЕЧНОЕ СВЕЧЕНИЕ И ПЫЛЬЦА
// ================================================

function drawSun(delta) {
  ctx.save();

  const x = width * 0.78;
  const y = height * 0.2;
  const radius = Math.min(width, height) * 0.4;
  const pulse = 1 + Math.sin(elapsed * 0.45) * 0.045;

  const glow = ctx.createRadialGradient(
    x, y, 5,
    x, y, radius * pulse
  );

  glow.addColorStop(0, "rgba(255, 220, 145, 0.20)");
  glow.addColorStop(0.35, "rgba(255, 197, 110, 0.08)");
  glow.addColorStop(1, "rgba(255, 190, 100, 0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  for (const p of particles) {
    const alpha = 0.12 + (Math.sin(elapsed + p.phase) + 1) * 0.12;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 228, 170, ${alpha})`;
    ctx.fill();

    p.x += Math.sin(elapsed * 0.3 + p.phase) * 5 * delta;
    p.y -= p.speed * 5 * delta;

    if (p.y < -5) {
      p.y = height + 5;
      p.x = random(0, width);
    }
  }

  ctx.restore();
}

// ================================================
// АНИМАЦИЯ ТУМАНА
// ================================================

function drawMist(delta) {
  ctx.save();

  for (let i = 0; i < 5; i++) {
    const y = height * (0.34 + i * 0.13);
    const offset = Math.sin(elapsed * 0.12 + i) * width * 0.08;

    const gradient = ctx.createLinearGradient(0, y - 60, 0, y + 60);

    gradient.addColorStop(0, "rgba(220, 232, 242, 0)");
    gradient.addColorStop(0.5, `rgba(220, 232, 242, ${0.035 + i * 0.008})`);
    gradient.addColorStop(1, "rgba(220, 232, 242, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(-width * 0.1 + offset, y - 60, width * 1.2, 120);
  }

  ctx.restore();

  for (const p of particles) {
    p.x += Math.sin(elapsed * 0.2 + p.phase) * 4 * delta;
    p.y += Math.cos(elapsed * 0.15 + p.phase) * 2 * delta;

    if (p.x > width) p.x = 0;
    if (p.x < 0) p.x = width;
  }
}

// ================================================
// АНИМАЦИЯ НОЧНОГО НЕБА
// ================================================

function drawNight(delta) {
  ctx.save();

  const glow = ctx.createRadialGradient(
    width * 0.78, height * 0.18, 0,
    width * 0.78, height * 0.18,
    Math.min(width, height) * 0.4
  );

  glow.addColorStop(0, "rgba(104, 146, 230, 0.13)");
  glow.addColorStop(1, "rgba(104, 146, 230, 0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  for (const p of particles) {
    const alpha = 0.25 + (Math.sin(elapsed + p.phase) + 1) * 0.25;

    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.7, p.size * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 232, 255, ${alpha})`;
    ctx.fill();

    p.y += 1.5 * delta;

    if (p.y > height) {
      p.y = 0;
      p.x = random(0, width);
    }
  }

  ctx.restore();
}

// ================================================
// ВСПЫШКИ МОЛНИИ
// ================================================

function drawLightning(delta) {
  if (elapsed >= nextLightning) {
    lightningFlash = 1;
    nextLightning = elapsed + random(4, 9);
  }

  if (lightningFlash <= 0) return;

  ctx.save();

  ctx.fillStyle = `rgba(210, 224, 255, ${lightningFlash * 0.14})`;
  ctx.fillRect(0, 0, width, height);

  if (lightningFlash > 0.82) {
    ctx.strokeStyle = `rgba(225, 235, 255, ${lightningFlash * 0.9})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#b6d7ff";

    let x = random(width * 0.15, width * 0.85);
    let y = 0;

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 0; i < 7; i++) {
      x += random(-50, 50);
      y += height / 9;
      ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  ctx.restore();

  lightningFlash = Math.max(0, lightningFlash - delta * 3.5);
}

// ================================================
// ЦИКЛ АНИМАЦИИ
// ================================================

function drawFrame(timestamp = 0) {
  const delta = lastFrameTime
    ? Math.min((timestamp - lastFrameTime) / 1000, 0.05)
    : 0;

  lastFrameTime = timestamp;
  elapsed += delta;

  ctx.clearRect(0, 0, width, height);

  switch (weatherEffect) {
    case "rain":
      drawRain(delta);
      break;

    case "drizzle":
      drawDrizzle(delta);
      break;

    case "snow":
      drawSnow(delta);
      break;

    case "clouds":
      drawClouds(delta);
      break;

    case "thunderstorm":
      drawClouds(delta);
      drawRain(delta);
      drawLightning(delta);
      break;

    case "mist":
      drawMist(delta);
      break;

    case "night":
      drawNight(delta);
      break;

    default:
      drawSun(delta);
  }

  if (!reduceMotion) {
    animationFrame = requestAnimationFrame(drawFrame);
  }
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

if (!reduceMotion) {
  animationFrame = requestAnimationFrame(drawFrame);
}

// ================================================
// API: СООБЩЕНИЯ И ЗАГРУЗКА
// ================================================

$("year").textContent = new Date().getFullYear();

function showMessage(message, type = "error") {
  const element = $("statusMessage");

  element.textContent = message;
  element.classList.remove(
    "hidden",
    "text-red-100",
    "text-green-100"
  );

  element.classList.add(
    type === "success" ? "text-green-100" : "text-red-100"
  );
}

function hideMessage() {
  $("statusMessage").classList.add("hidden");
}

function setLoading(isLoading) {
  $("searchBtn").disabled = isLoading;

  $("searchBtnText").textContent = isLoading
    ? "Загрузка..."
    : "Найти город";

  $("searchLoader").classList.toggle("hidden", !isLoading);
}

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "API key неверный или ещё активируется. Проверь ключ OpenWeatherMap."
      );
    }

    if (response.status === 404) {
      throw new Error("Город не найден. Проверь название.");
    }

    if (response.status === 429) {
      throw new Error("Слишком много запросов. Попробуй позже.");
    }

    throw new Error("Не удалось загрузить данные о погоде.");
  }

  return response.json();
}

// ================================================
// ФОРМАТИРОВАНИЕ
// ================================================

function formatTemperature(value) {
  const temp = currentUnit === "C"
    ? value
    : value * 9 / 5 + 32;

  return `${Math.round(temp)}°`;
}

function formatWind(speed) {
  return currentUnit === "C"
    ? `${speed.toFixed(1)} м/с`
    : `${(speed * 2.23694).toFixed(1)} mph`;
}

function cityTime(timestamp, offset, options = {}) {
  return new Intl.DateTimeFormat("ru-RU", {
    ...options,
    timeZone: "UTC"
  }).format(new Date((timestamp + offset) * 1000));
}

function formatHour(timestamp, offset) {
  return cityTime(timestamp, offset, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDay(timestamp, offset) {
  return cityTime(timestamp, offset, {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function iconUrl(code, size = "2x") {
  return `https://openweathermap.org/img/wn/${code}@${size}.png`;
}

// ================================================
// ПОИСК ГОРОДА ЧЕРЕЗ GEOCODING API
// ================================================

async function searchCity(city) {
  const params = new URLSearchParams({
    q: city,
    limit: "1",
    appid: API_KEY
  });

  const results = await fetchJSON(
    `${BASE_URL}/geo/1.0/direct?${params}`
  );

  if (!results.length) {
    throw new Error("Город не найден. Попробуй другое название.");
  }

  return results[0];
}

// ================================================
// ЗАГРУЗКА ТЕКУЩЕЙ ПОГОДЫ И ПРОГНОЗА
// ================================================

async function getWeatherByCoordinates(lat, lon, fallbackName = "") {
  const id = ++requestId;

  setLoading(true);
  hideMessage();

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      appid: API_KEY,
      units: "metric",
      lang: "ru"
    });

    const [weather, forecast] = await Promise.all([
      fetchJSON(`${BASE_URL}/data/2.5/weather?${params}`),
      fetchJSON(`${BASE_URL}/data/2.5/forecast?${params}`)
    ]);

    if (id !== requestId) return;

    currentWeather = weather;
    forecastData = forecast;

    renderWeather(fallbackName);
    renderHourlyForecast();
    renderDailyForecast();

    showMessage("Погода успешно обновлена.", "success");

    setTimeout(() => {
      if (id === requestId) hideMessage();
    }, 2500);
  } catch (error) {
    if (id === requestId) {
      showMessage(error.message || "Ошибка загрузки погоды.");
    }
  } finally {
    if (id === requestId) {
      setLoading(false);
    }
  }
}

// ================================================
// ОТОБРАЖЕНИЕ ТЕКУЩЕЙ ПОГОДЫ
// ================================================

function renderWeather(fallbackName = "") {
  if (!currentWeather) return;

  const weather = currentWeather;
  const condition = weather.weather[0];
  const offset = weather.timezone || 0;

  const city = weather.name || fallbackName || "Ваш город";
  const country = weather.sys.country || "";

  $("cityName").textContent = country
    ? `${city}, ${country}`
    : city;

  $("currentDate").textContent = cityTime(
    Math.floor(Date.now() / 1000),
    offset,
    {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  );

  $("temperature").textContent = formatTemperature(weather.main.temp);

  $("description").textContent = condition.description;

  $("feelsLike").textContent =
    `Ощущается как ${formatTemperature(weather.main.feels_like)}`;

  $("mainWeatherIcon").src = iconUrl(condition.icon, "4x");
  $("mainWeatherIcon").alt = condition.description;

  $("humidity").textContent = `${weather.main.humidity}%`;
  $("wind").textContent = formatWind(weather.wind.speed);
  $("pressure").textContent = `${weather.main.pressure} гПа`;

  $("visibility").textContent =
    `${((weather.visibility ?? 0) / 1000).toFixed(1)} км`;

  const sunrise = cityTime(weather.sys.sunrise, offset, {
    hour: "2-digit",
    minute: "2-digit"
  });

  const sunset = cityTime(weather.sys.sunset, offset, {
    hour: "2-digit",
    minute: "2-digit"
  });

  $("sunInfo").textContent = `Восход ${sunrise} · Закат ${sunset}`;

  $("unitLabel").textContent = `°${currentUnit}`;

  // Меняем фон и анимацию по реальному состоянию погоды.
  setWeatherBackground(condition.main, condition.icon);
}

// ================================================
// ПОЧАСОВОЙ ПРОГНОЗ
// ================================================

function renderHourlyForecast() {
  if (!forecastData) return;

  const container = $("hourlyForecast");
  const offset = forecastData.city.timezone || 0;

  container.replaceChildren();

  forecastData.list.slice(0, 8).forEach((item) => {
    const card = document.createElement("article");

    card.className =
      "weather-card glass min-w-[105px] flex-1 rounded-2xl p-4 text-center";

    const time = formatHour(item.dt, offset);
    const temperature = formatTemperature(item.main.temp);
    const description = item.weather[0].description;
    const icon = iconUrl(item.weather[0].icon);
    const rainChance = Math.round((item.pop || 0) * 100);

    const timeEl = document.createElement("p");
    timeEl.className = "text-xs text-white/55";
    timeEl.textContent = time;

    const image = document.createElement("img");
    image.src = icon;
    image.alt = description;
    image.className = "mx-auto my-2 h-14 w-14 object-contain";

    const tempEl = document.createElement("p");
    tempEl.className = "text-lg font-semibold";
    tempEl.textContent = temperature;

    const rainEl = document.createElement("p");
    rainEl.className = "mt-1 text-xs text-white/45";
    rainEl.textContent = `${rainChance}% дождя`;

    card.append(timeEl, image, tempEl, rainEl);
    container.appendChild(card);
  });
}

// ================================================
// ПРОГНОЗ НА 5 ДНЕЙ
// ================================================

function renderDailyForecast() {
  if (!forecastData) return;

  const container = $("dailyForecast");
  const offset = forecastData.city.timezone || 0;
  const days = new Map();

  forecastData.list.forEach((item) => {
    const key = cityTime(item.dt, offset, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    if (!days.has(key)) days.set(key, []);
    days.get(key).push(item);
  });

  container.replaceChildren();

  [...days.values()].slice(0, 5).forEach((items, index) => {
    const temperatures = items.map((item) => item.main.temp);
    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);

    // Запись, время которой ближе всего к полудню.
    const representative = items.reduce((best, item) => {
      const hour = Number(formatHour(item.dt, offset).slice(0, 2));
      const bestHour = Number(formatHour(best.dt, offset).slice(0, 2));

      return Math.abs(hour - 12) < Math.abs(bestHour - 12)
        ? item
        : best;
    }, items[0]);

    const day = index === 0
      ? "Сегодня"
      : formatDay(representative.dt, offset);

    const card = document.createElement("article");

    card.className =
      "weather-card glass flex items-center justify-between gap-2 rounded-2xl p-4 sm:flex-col sm:items-center sm:gap-1 sm:p-5";

    const dayEl = document.createElement("p");
    dayEl.className = "w-24 text-sm text-white/65 sm:w-auto";
    dayEl.textContent = day;

    const image = document.createElement("img");
    image.src = iconUrl(representative.weather[0].icon);
    image.alt = representative.weather[0].description;
    image.className = "h-12 w-12 object-contain sm:my-2 sm:h-16 sm:w-16";

    const details = document.createElement("div");
    details.className = "text-right sm:text-center";

    const temps = document.createElement("p");
    temps.className = "font-semibold";
    temps.textContent = `${formatTemperature(max)} / ${formatTemperature(min)}`;

    const description = document.createElement("p");
    description.className =
      "mt-1 max-w-24 truncate text-xs capitalize text-white/45 sm:max-w-full";
    description.textContent = representative.weather[0].description;

    details.append(temps, description);
    card.append(dayEl, image, details);
    container.appendChild(card);
  });
}

// ================================================
// ПОИСК ПО НАЗВАНИЮ ГОРОДА
// ================================================

$("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = $("cityInput").value.trim();

  if (!city) {
    showMessage("Введи название города.");
    return;
  }

  if (!API_KEY || API_KEY === "ВСТАВЬ_СЮДА_СВОЙ_API_KEY") {
    showMessage("Сначала вставь свой API key в script.js.");
    return;
  }

  const sequence = ++searchSequence;

  setLoading(true);
  hideMessage();

  try {
    const location = await searchCity(city);

    if (sequence !== searchSequence) return;

    await getWeatherByCoordinates(
      location.lat,
      location.lon,
      location.local_names?.ru || location.name
    );
  } catch (error) {
    if (sequence === searchSequence) {
      showMessage(error.message);
      setLoading(false);
    }
  }
});

// ================================================
// ГЕОЛОКАЦИЯ
// ================================================

$("locationBtn").addEventListener("click", () => {
  if (!API_KEY || API_KEY === "ВСТАВЬ_СЮДА_СВОЙ_API_KEY") {
    showMessage("Сначала вставь API key в script.js.");
    return;
  }

  if (!navigator.geolocation) {
    showMessage("Браузер не поддерживает геолокацию.");
    return;
  }

  hideMessage();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      getWeatherByCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );
    },
    (error) => {
      const messages = {
        1: "Разреши доступ к местоположению в браузере.",
        2: "Не удалось определить местоположение.",
        3: "Время ожидания геолокации истекло."
      };

      showMessage(
        messages[error.code] || "Не удалось получить местоположение."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
});

// ================================================
// ПЕРЕКЛЮЧЕНИЕ °C / °F
// ================================================

$("unitBtn").addEventListener("click", () => {
  currentUnit = currentUnit === "C" ? "F" : "C";
  $("unitLabel").textContent = `°${currentUnit}`;

  if (currentWeather) renderWeather();

  if (forecastData) {
    renderHourlyForecast();
    renderDailyForecast();
  }
});

// ================================================
// ПЕРВЫЙ ЗАПУСК
// ================================================

lucide.createIcons();

if (!API_KEY || API_KEY === "ВСТАВЬ_СЮДА_СВОЙ_API_KEY") {
  $("cityName").textContent = "Добро пожаловать в Aether";
  $("description").textContent = "Вставь API key и найди свой город";
  $("temperature").textContent = "--°";
} else {
  $("cityInput").value = "Tashkent";

  searchCity("Tashkent")
    .then((location) =>
      getWeatherByCoordinates(
        location.lat,
        location.lon,
        location.local_names?.ru || location.name
      )
    )
    .catch((error) => showMessage(error.message));
}


/* =========================================
   AETHER WEATHER — PWA INSTALLATION
========================================= */

let deferredInstallPrompt = null;

const installModal = document.getElementById("installModal");
const installAppBtn = document.getElementById("installAppBtn");
const closeInstallModal = document.getElementById("closeInstallModal");
const laterInstallBtn = document.getElementById("laterInstallBtn");
const installHelp = document.getElementById("installHelp");
const installButtonText = document.getElementById("installButtonText");

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIOS =
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function showInstallModal() {
  if (!installModal || isStandalone) return;

  installModal.classList.remove("hidden");
  installModal.classList.add("flex");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function hideInstallModal() {
  if (!installModal) return;

  installModal.classList.add("hidden");
  installModal.classList.remove("flex");
  installHelp.classList.add("hidden");
}

// Не показываем предложение повторно после отказа,
// пока пользователь не очистит данные сайта.
function canShowInstallModal() {
  try {
    return localStorage.getItem("aether-install-dismissed") !== "yes";
  } catch {
    return true;
  }
}

function dismissInstallModal() {
  try {
    localStorage.setItem("aether-install-dismissed", "yes");
  } catch {
    // Приложение продолжает работать и без localStorage.
  }

  hideInstallModal();
}

// Браузер сообщил, что может предложить установку.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  // Если окно уже открыто, оставляем его доступным.
  if (!isStandalone && canShowInstallModal()) {
    installButtonText.textContent = "Установить приложение";
  }
});

// Пользователь нажал системное подтверждение установки.
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  hideInstallModal();

  try {
    localStorage.setItem("aether-install-dismissed", "yes");
  } catch {
    // Ничего делать не нужно.
  }
});

// Нажатие на «Установить приложение».
installAppBtn?.addEventListener("click", async () => {
  if (installHelp) installHelp.classList.add("hidden");

  if (isStandalone) {
    hideInstallModal();
    return;
  }

  // В Chrome/Edge системное окно вызывается только через событие,
  // которое браузер заранее передал в beforeinstallprompt.
  const promptEvent = deferredInstallPrompt;
  if (promptEvent) {
    deferredInstallPrompt = null; // событие можно использовать только один раз
    installAppBtn.disabled = true;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice?.outcome === "accepted") {
        hideInstallModal();
      } else if (installHelp) {
        installHelp.textContent = "Установка отменена. Ты можешь попробовать ещё раз позже через меню Chrome или Edge.";
        installHelp.classList.remove("hidden");
      }
    } catch (error) {
      console.error("PWA install prompt failed:", error);
      showInstallFallback();
    } finally {
      installAppBtn.disabled = false;
    }
    return;
  }

  showInstallFallback();
});

function showInstallFallback() {
  if (!installHelp) return;

  if (isIOS) {
    installHelp.textContent = "На iPhone/iPad открой сайт в Safari, нажми «Поделиться», затем «На экран Домой» → «Добавить».";
  } else {
    installHelp.textContent = "Браузер пока не предоставил системное окно установки. Открой меню Chrome/Edge (⋮) и выбери «Установить Aether Weather». Если этого пункта нет, проверь HTTPS, manifest.json и Service Worker, затем обнови страницу и попробуй снова.";
  }
  installHelp.classList.remove("hidden");
}

// Закрытие окна.
closeInstallModal?.addEventListener("click", dismissInstallModal);
laterInstallBtn?.addEventListener("click", dismissInstallModal);

// Закрытие при клике на затемнённый фон.
installModal?.addEventListener("click", (event) => {
  if (event.target === installModal) {
    dismissInstallModal();
  }
});

// Показываем предложение через небольшую задержку.
window.addEventListener("load", () => {
  if (!isStandalone && canShowInstallModal()) {
    setTimeout(showInstallModal, 2500);
  }
});

// Регистрация Service Worker.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}
