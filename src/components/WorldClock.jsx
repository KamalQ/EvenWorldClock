import { useState } from 'react';
import { Card, CardContent, Button, Text } from '@jappyjan/even-realities-ui';
import { AddIcon, TrashIcon, CrossIcon } from '@jappyjan/even-realities-ui/icons';
import TIMEZONES from '../data/timezones';

export default function WorldClock({ cities, addCity, removeCity, moveCity, getTimeInfo }) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = TIMEZONES.filter((tz) => {
    if (cities.some((c) => c.city === tz.city)) return false;
    if (!search) return true;
    return (
      tz.city.toLowerCase().includes(search.toLowerCase()) ||
      tz.country.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="tab-content">
      {cities.length === 0 && (
        <Card>
          <CardContent style={{ textAlign: 'center', padding: '32px 16px' }}>
            <Text variant="body" as="p" style={{ color: '#7B7B7B' }}>
              No cities added yet
            </Text>
            <Text variant="detail" as="p" style={{ color: '#7B7B7B', marginTop: 4 }}>
              Tap the button below to add a city
            </Text>
          </CardContent>
        </Card>
      )}

      {cities.map((city, index) => {
        const info = getTimeInfo(city);
        const isFirst = index === 0;
        const isLast = index === cities.length - 1;
        const isFeatured = index === 0;
        return (
          <Card key={city.city}>
            <CardContent>
              {isFeatured && (
                <span className="featured-badge">Featured on glasses</span>
              )}
              <div className="city-row">
                <div className="reorder-btns">
                  <button
                    className="reorder-btn"
                    onClick={() => moveCity(index, index - 1)}
                    disabled={isFirst}
                    aria-label="Move up"
                  >
                    ^
                  </button>
                  <button
                    className="reorder-btn"
                    onClick={() => moveCity(index, index + 1)}
                    disabled={isLast}
                    aria-label="Move down"
                  >
                    v
                  </button>
                </div>
                <div className="city-info">
                  <Text variant="title-m" as="p">{city.city}</Text>
                  <Text variant="detail" as="p" style={{ color: '#7B7B7B' }}>
                    {info.abbr} · {info.offset}
                  </Text>
                  {isFeatured && info.sunrise && (
                    <Text variant="detail" as="p" style={{ color: '#7B7B7B', marginTop: 2 }}>
                      Sunrise {info.sunrise} · Sunset {info.sunset}
                    </Text>
                  )}
                  {!isFeatured && info.sunrise && (
                    <Text variant="detail" as="p" style={{ color: '#7B7B7B', marginTop: 2 }}>
                      ↑ {info.sunrise}  ↓ {info.sunset}
                    </Text>
                  )}
                </div>
                <div className="city-time">
                  <Text variant="title-xl" as="p" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {info.time}
                  </Text>
                </div>
                <button className="icon-btn" onClick={() => removeCity(city.city)} aria-label="Remove">
                  <TrashIcon size={18} />
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="primary"
        onClick={() => { setShowPicker(true); setSearch(''); }}
        style={{ width: '100%' }}
      >
        <AddIcon size={16} /> Add City
      </Button>

      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Text variant="title-m" as="h2">Add City</Text>
              <button className="icon-btn" onClick={() => setShowPicker(false)}>
                <CrossIcon size={20} />
              </button>
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Search cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="city-list">
              {filtered.map((tz) => (
                <button
                  key={tz.city}
                  className="city-option"
                  onClick={() => {
                    addCity(tz);
                    setShowPicker(false);
                  }}
                >
                  <span>{tz.city}</span>
                  <span className="city-country">{tz.country}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <Text variant="body" as="p" style={{ padding: 16, color: '#7B7B7B', textAlign: 'center' }}>
                  No cities found
                </Text>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
