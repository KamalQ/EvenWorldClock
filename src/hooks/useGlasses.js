import { useState, useRef, useCallback, useEffect } from 'react';
import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';

// ─── Header ──────────────────────────────────────────────────────────────────
// Centered in a 564px container (paddingLength=4 → 556px usable).
// 40 leading spaces ≈ 200px offset; text center lands near the 288px canvas center.
function formatHeader() {
  return '                                        EVEN WORLD CLOCK';
}

// ─── Left panel: featured city with full detail (196px wide) ─────────────────
// Every line dynamically centered using leading spaces.
function centerInPanel(text, usableWidth = 184, charPx = 10, spacePx = 5) {
  const textPx = text.length * charPx;
  const spaces = Math.max(0, Math.round((usableWidth - textPx) / 2 / spacePx));
  return ' '.repeat(spaces) + text;
}

function formatFeatured(city) {
  if (!city) return '\n  Add a city\n  in the app\n \n \n ';
  const shortTime = city.time.replace(/:\d{2}\s/, ' ');
  // "Sunrise"/"Sunset" padded so their time values align with each other
  const sunriseStr = city.sunrise ? `Sunrise   ${city.sunrise}` : 'Sunrise   \u2014';
  const sunsetStr  = city.sunset  ? `Sunset    ${city.sunset}`  : 'Sunset    \u2014';
  // Every line dynamically centered based on its own character width
  return [
    centerInPanel(city.name),
    ' ',
    centerInPanel(shortTime),
    centerInPanel(`${city.abbr}  ${city.offset}`),
    ' ',
    centerInPanel(sunriseStr, 184, 9, 5),
    centerInPanel(sunsetStr,  184, 9, 5),
  ].join('\n');
}

// ─── Right panel: single-line city list (362px wide) ─────────────────────────
// Right panel usable ≈ 350px. Proportional font averages ~8-9px/char so
// MAX_LINE_CHARS=36 is safe (36 × ~9px = 324px well within 350px).
//
// Per-city padding: start at ideal alignment (maxNameLen+2), then shrink ONLY
// for that city if its own tail is too long. Most cities stay fully aligned;
// only edge cases with very long abbr+offset (e.g. GMT+5:30 +11h 30m) deviate.
// Names are truncated with ".." only when no other option remains.
// When showDetails=true a second indented line shows sunrise/sunset.
const MAX_LINE_CHARS = 36;

function formatList(cities, showDetails = false) {
  if (cities.length === 0) return '  No other cities\n  Add via phone';
  // With details (2 lines/city) show 4 cities; without, show up to 8.
  const subset = cities.slice(0, showDetails ? 4 : 8);

  const entries = subset.map(c => {
    const shortTime = c.time.replace(/:\d{2}\s/, ' ');
    const offset = c.offset === 'Same time' ? 'Same' : c.offset;
    return { name: c.name, shortTime, abbr: c.abbr, offset, sunrise: c.sunrise, sunset: c.sunset };
  });

  const maxNameLen = Math.max(...entries.map(e => e.name.length));
  const idealPadTo = maxNameLen + 2; // preferred: all name columns the same width

  return entries.map(({ name, shortTime, abbr, offset, sunrise, sunset }) => {
    // Tail = the part after the name column: time + "  " + abbr + "  " + offset
    const tailLen = shortTime.length + 2 + abbr.length + 2 + offset.length;

    // Shrink padTo for THIS city only until its line fits
    let padTo = idealPadTo;
    while (padTo > 0 && 1 + padTo + tailLen > MAX_LINE_CHARS) {
      padTo--;
    }

    let displayName;
    if (padTo >= name.length) {
      displayName = name.padEnd(padTo);           // full name, padded for alignment
    } else if (padTo >= 4) {
      displayName = name.slice(0, padTo - 2) + '..'; // truncate with ".." (last resort)
    } else {
      displayName = name.slice(0, Math.max(1, padTo));
    }

    const line = ` ${displayName}${shortTime}  ${abbr}  ${offset}`;

    if (!showDetails || (!sunrise && !sunset)) return line;

    // Second line: sunrise/sunset details
    const detailParts = [];
    if (sunrise) detailParts.push(`\u2191 ${sunrise}`);
    if (sunset)  detailParts.push(`\u2193 ${sunset}`);
    return `${line}\n  ${detailParts.join('  ')}`;
  }).join('\n');
}

export default function useGlasses({ getCityData }) {
  const [status, setStatus] = useState('Waiting for bridge...');
  const [connected, setConnected] = useState(false);
  const [eventLog, setEventLog] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  const bridgeRef = useRef(null);
  const isStartupCreatedRef = useRef(false);
  const lastContentRef = useRef('');

  const logEvent = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}`;
    console.log(line);
    setEventLog((prev) => {
      const next = [...prev, line];
      return next.length > 30 ? next.slice(-30) : next;
    });
  }, []);

  const buildConfig = useCallback((cityData, details = false) => {
    const featured = cityData[0] || null;
    const rest = cityData.slice(1);

    // Canvas: 576×288
    // Header: x=6, y=2,  width=564, height=40  — isEventCapture:1, never scrolls
    // Left:   x=6, y=44, width=196, height=242  (featured city, 35%, clips)
    // Right:  x=208,y=44,width=362, height=242  (city list,  65%, clips)
    return {
      containerTotalNum: 3,
      textObject: [
        new TextContainerProperty({
          xPosition: 6,   yPosition: 2,
          width: 564,     height: 40,
          containerID: 1, containerName: 'header',
          content: formatHeader(),
          isEventCapture: 1,
          borderWidth: 1, borderColor: 5, borderRdaius: 3, paddingLength: 4,
        }),
        new TextContainerProperty({
          xPosition: 6,   yPosition: 44,
          width: 196,     height: 242,
          containerID: 2, containerName: 'featured',
          content: formatFeatured(featured),
          isEventCapture: 0,
          borderWidth: 1, borderColor: 8, borderRdaius: 3, paddingLength: 6,
        }),
        new TextContainerProperty({
          xPosition: 208, yPosition: 44,
          width: 362,     height: 242,
          containerID: 3, containerName: 'list',
          content: formatList(rest, details),
          isEventCapture: 0,
          borderWidth: 1, borderColor: 5, borderRdaius: 3, paddingLength: 6,
        }),
      ],
    };
  }, []);

  const sendPage = useCallback(async (config) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    try {
      if (!isStartupCreatedRef.current) {
        const rc = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(config));
        if (rc === 0) {
          isStartupCreatedRef.current = true;
          logEvent('Display created');
        }
      } else {
        await bridge.rebuildPageContainer(new RebuildPageContainer(config));
      }
    } catch (err) {
      console.error('sendPage error:', err);
    }
  }, [logEvent]);

  const upgradeContent = useCallback(async (text, containerId, containerName) => {
    const bridge = bridgeRef.current;
    if (!bridge) return false;
    try {
      return await bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: containerId,
        containerName: containerName,
        contentOffset: 0,
        contentLength: text.length,
        content: text,
      }));
    } catch {
      return false;
    }
  }, []);

  const pushContent = useCallback(async () => {
    if (!bridgeRef.current || !isStartupCreatedRef.current) return;
    const cityData = getCityData();

    // Include showDetails in fingerprint so toggling it forces a refresh
    const fingerprint = cityData.map(c => c.name + c.time + c.sunrise).join(',') + (showDetails ? '|d' : '');
    if (fingerprint === lastContentRef.current) return;
    lastContentRef.current = fingerprint;

    const featured = cityData[0] || null;
    const rest = cityData.slice(1);
    // Header is static — only update the two dynamic panels
    const ok2 = await upgradeContent(formatFeatured(featured), 2, 'featured');
    const ok3 = await upgradeContent(formatList(rest, showDetails), 3, 'list');

    if (!ok2 || !ok3) {
      await sendPage(buildConfig(cityData, showDetails));
    }
  }, [getCityData, upgradeContent, buildConfig, sendPage, showDetails]);

  const shutdownGlasses = useCallback(async () => {
    try {
      const bridge = bridgeRef.current;
      if (!bridge) return;
      await bridge.shutDownPageContainer(0);
      isStartupCreatedRef.current = false;
      setStatus('Display shut down');
      logEvent('Display shut down');
    } catch (err) {
      console.error('shutdown error:', err);
    }
  }, [logEvent]);

  const showDisplay = useCallback(async () => {
    if (!bridgeRef.current) return;
    isStartupCreatedRef.current = false;
    lastContentRef.current = '';
    await sendPage(buildConfig(getCityData(), showDetails));
    setStatus('Display active');
    logEvent('Display shown');
  }, [getCityData, buildConfig, sendPage, logEvent, showDetails]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        const bridge = await waitForEvenAppBridge();
        bridgeRef.current = bridge;

        if (disposed) return;
        setStatus('Bridge connected');
        setConnected(true);

        const rc = await bridge.createStartUpPageContainer(
          new CreateStartUpPageContainer(buildConfig(getCityData()))
        );
        if (rc === 0) {
          isStartupCreatedRef.current = true;
          logEvent('Initial display created');
        }

        bridge.onEvenHubEvent((event) => {
          if (disposed) return;
          if (event.textEvent) {
            const et = event.textEvent.eventType;
            if (et === OsEventTypeList.CLICK_EVENT || et === undefined) {
              pushContent();
            }
          }
          if (event.sysEvent) {
            const et = event.sysEvent.eventType;
            if (et === OsEventTypeList.CLICK_EVENT || et === undefined) {
              pushContent();
            }
          }
        });

        bridge.onDeviceStatusChanged((ds) => {
          if (disposed) return;
          if (ds.isConnected?.()) {
            setStatus(`Connected - Battery: ${ds.batteryLevel ?? '?'}%`);
            setConnected(true);
          } else {
            setConnected(false);
          }
        });
      } catch (err) {
        if (disposed) return;
        setStatus('No bridge - preview mode');
      }
    }

    init();
    return () => { disposed = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, connected, eventLog, shutdownGlasses, showDisplay, pushContent, showDetails, setShowDetails };
}
