import { useState, useEffect, useRef, useCallback } from 'react';
import { EvenBetterSdk } from '@jappyjan/even-better-sdk';
import SunCalc from 'suncalc';
import CITY_COORDS from '../data/cityCoords';

const STORAGE_KEY = 'worldclock_cities';

function getTimeInZone(timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}

function getOffsetFromLocal(timezone) {
  const now = new Date();
  // Get local offset in minutes
  const localOffset = now.getTimezoneOffset();
  // Get target offset by comparing formatted dates
  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);

  const getVal = (parts, type) => parts.find((p) => p.type === type)?.value;
  const localH = parseInt(getVal(localParts, 'hour'), 10);
  const localM = parseInt(getVal(localParts, 'minute'), 10);
  const targetH = parseInt(getVal(targetParts, 'hour'), 10);
  const targetM = parseInt(getVal(targetParts, 'minute'), 10);
  const localDay = parseInt(getVal(localParts, 'day'), 10);
  const targetDay = parseInt(getVal(targetParts, 'day'), 10);

  let diffH = targetH - localH + (targetDay - localDay) * 24;
  let diffM = targetM - localM;
  // Normalize
  if (diffM !== 0 && Math.abs(diffM) < 60) {
    // keep as is for half-hour offsets
  }
  if (diffH > 12) diffH -= 24;
  if (diffH < -12) diffH += 24;

  if (diffH === 0 && diffM === 0) return 'Same time';
  const sign = diffH > 0 || (diffH === 0 && diffM > 0) ? '+' : '';
  if (diffM === 0) return `${sign}${diffH}h`;
  return `${sign}${diffH}h ${Math.abs(diffM)}m`;
}

function getAbbreviation(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date());
  return parts.find((p) => p.type === 'timeZoneName')?.value || '';
}

function getSunTimes(cityName, timezone) {
  const coords = CITY_COORDS[cityName];
  if (!coords) return { sunrise: null, sunset: null };
  const times = SunCalc.getTimes(new Date(), coords.lat, coords.lng);
  const fmt = (d) => {
    if (!d || isNaN(d)) return null;
    return d.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  return { sunrise: fmt(times.sunrise), sunset: fmt(times.sunset) };
}

export default function useWorldClock() {
  // Each city: { city, timezone, country }
  const [cities, setCities] = useState([]);
  const [times, setTimes] = useState({});
  const bridgeReadyRef = useRef(false);

  // Load from SDK localStorage on mount
  useEffect(() => {
    async function load() {
      try {
        const bridge = await EvenBetterSdk.getRawBridge();
        bridgeReadyRef.current = true;
        const stored = await bridge.getLocalStorage(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setCities(parsed);
        }
      } catch (e) {
        // No bridge (preview mode) — try browser localStorage fallback
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setCities(JSON.parse(stored));
        } catch (_) {}
      }
    }
    load();
  }, []);

  // Save to SDK localStorage whenever cities change
  useEffect(() => {
    if (cities.length === 0 && !bridgeReadyRef.current) return;
    async function save() {
      const json = JSON.stringify(cities);
      try {
        const bridge = await EvenBetterSdk.getRawBridge();
        await bridge.setLocalStorage(STORAGE_KEY, json);
      } catch (_) {}
      // Also save to browser localStorage as fallback
      try { localStorage.setItem(STORAGE_KEY, json); } catch (_) {}
    }
    save();
  }, [cities]);

  // Update times every second
  useEffect(() => {
    function update() {
      const t = {};
      for (const c of cities) {
        t[c.timezone + c.city] = {
          time: getTimeInZone(c.timezone),
          offset: getOffsetFromLocal(c.timezone),
          abbr: getAbbreviation(c.timezone),
        };
      }
      setTimes(t);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [cities]);

  const addCity = useCallback((cityObj) => {
    setCities((prev) => {
      if (prev.some((c) => c.city === cityObj.city)) return prev;
      return [...prev, cityObj];
    });
  }, []);

  const removeCity = useCallback((cityName) => {
    setCities((prev) => prev.filter((c) => c.city !== cityName));
  }, []);

  const moveCity = useCallback((fromIndex, toIndex) => {
    setCities((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const getTimeInfo = useCallback((cityObj) => {
    const base = times[cityObj.timezone + cityObj.city] || {
      time: getTimeInZone(cityObj.timezone),
      offset: getOffsetFromLocal(cityObj.timezone),
      abbr: getAbbreviation(cityObj.timezone),
    };
    const { sunrise, sunset } = getSunTimes(cityObj.city, cityObj.timezone);
    return { ...base, sunrise, sunset };
  }, [times]);

  // For glasses display: formatted string of all cities
  const glassesText = useCallback(() => {
    if (cities.length === 0) return '\n  No cities added\n\n  Add via phone';
    return cities.slice(0, 5).map((c) => {
      const info = times[c.timezone + c.city];
      const time = info ? info.time : getTimeInZone(c.timezone);
      const offset = info ? info.offset : getOffsetFromLocal(c.timezone);
      return `${c.city}\n  ${time}  (${offset})`;
    }).join('\n');
  }, [cities, times]);

  return { cities, addCity, removeCity, moveCity, getTimeInfo, glassesText };
}
