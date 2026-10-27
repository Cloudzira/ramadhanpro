import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';

export const CALCULATION_METHODS = {
  indonesia: {
    label: 'Indonesia / Singapura (Subuh 20°, Isya 18°)',
    create: () => CalculationMethod.Singapore(),
  },
  muslimWorldLeague: {
    label: 'Muslim World League (18° / 17°)',
    create: () => CalculationMethod.MuslimWorldLeague(),
  },
  egyptian: {
    label: 'Mesir (19.5° / 17.5°)',
    create: () => CalculationMethod.Egyptian(),
  },
  ummAlQura: {
    label: 'Umm al-Qura (18.5° / 90 menit)',
    create: () => CalculationMethod.UmmAlQura(),
  },
  karachi: {
    label: 'Karachi (18° / 18°)',
    create: () => CalculationMethod.Karachi(),
  },
  northAmerica: {
    label: 'Amerika Utara (15° / 15°)',
    create: () => CalculationMethod.NorthAmerica(),
  },
  turkey: {
    label: 'Turki',
    create: () => CalculationMethod.Turkey(),
  },
};

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);
}

export function calculatePrayerSchedule({
  latitude,
  longitude,
  date = new Date(),
  method = 'indonesia',
  madhab = 'shafi',
  imsakOffset = 10,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError('Latitude harus antara -90 dan 90.');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new RangeError('Longitude harus antara -180 dan 180.');

  const selectedMethod = CALCULATION_METHODS[method] || CALCULATION_METHODS.indonesia;
  const parameters = selectedMethod.create();
  parameters.madhab = madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const coordinates = new Coordinates(lat, lon);
  const times = new PrayerTimes(coordinates, date, parameters);
  const imsakDate = new Date(times.fajr.getTime() - Math.max(0, Number(imsakOffset) || 0) * 60_000);

  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    timezone: timeZone,
    method: selectedMethod.label,
    madhab,
    imsakOffset: Math.max(0, Number(imsakOffset) || 0),
    times: {
      Imsak: formatTime(imsakDate, timeZone),
      Subuh: formatTime(times.fajr, timeZone),
      Terbit: formatTime(times.sunrise, timeZone),
      Dzuhur: formatTime(times.dhuhr, timeZone),
      Ashar: formatTime(times.asr, timeZone),
      Maghrib: formatTime(times.maghrib, timeZone),
      Isya: formatTime(times.isha, timeZone),
    },
    epoch: {
      Imsak: imsakDate.getTime(),
      Subuh: times.fajr.getTime(),
      Terbit: times.sunrise.getTime(),
      Dzuhur: times.dhuhr.getTime(),
      Ashar: times.asr.getTime(),
      Maghrib: times.maghrib.getTime(),
      Isya: times.isha.getTime(),
    },
    qiblaBearing: Math.round(Qibla(coordinates) * 10) / 10,
  };
}
