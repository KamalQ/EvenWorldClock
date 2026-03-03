import { useCallback, useEffect } from 'react';
import useWorldClock from './hooks/useWorldClock';
import useGlasses from './hooks/useGlasses';
import WorldClock from './components/WorldClock';
import { Card, CardContent, Button, Text } from '@jappyjan/even-realities-ui';
import { ScreenOffIcon, PanelOnIcon, TimeCountingIcon } from '@jappyjan/even-realities-ui/icons';
import './App.css';

export default function App() {
  const worldClock = useWorldClock();

  // Get structured city data for glasses
  const getCityData = useCallback(() => {
    return worldClock.cities.map((c) => {
      const info = worldClock.getTimeInfo(c);
      return {
        name: c.city,
        time: info.time,
        offset: info.offset,
        abbr: info.abbr,
        sunrise: info.sunrise,
        sunset: info.sunset,
      };
    });
  }, [worldClock]);

  const glasses = useGlasses({ getCityData });

  // Update glasses every second
  useEffect(() => {
    const id = setInterval(() => {
      glasses.pushContent();
    }, 1000);
    glasses.pushContent();
    return () => clearInterval(id);
  }, [glasses.pushContent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id="app-container">
      <header style={{ padding: '16px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TimeCountingIcon size={28} />
        <div>
          <Text variant="title-xl" as="h1">Even World Clock</Text>
          <Text variant="subtitle" as="p" style={{ color: glasses.connected ? '#4BB956' : undefined }}>
            {glasses.status}
          </Text>
        </div>
      </header>

      <WorldClock
        cities={worldClock.cities}
        addCity={worldClock.addCity}
        removeCity={worldClock.removeCity}
        moveCity={worldClock.moveCity}
        getTimeInfo={worldClock.getTimeInfo}
      />

      <Card>
        <CardContent>
          <Text variant="detail" as="p" style={{ textTransform: 'uppercase', marginBottom: 8 }}>Glasses</Text>
          <div className="glasses-btns">
            <Button
              variant={glasses.showDetails ? 'accent' : 'default'}
              onClick={() => glasses.setShowDetails(v => !v)}
              style={{ gridColumn: '1 / -1' }}
            >
              {glasses.showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            <Button variant="primary" onClick={glasses.showDisplay}>
              <PanelOnIcon size={16} /> Show Display
            </Button>
            <Button variant="negative" onClick={glasses.shutdownGlasses}>
              <ScreenOffIcon size={16} /> Shutdown
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
