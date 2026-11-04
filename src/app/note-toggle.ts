import { Component, OnChanges, SimpleChanges, input, output, signal } from '@angular/core';

interface GeoPosition {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-note-toggle',
  standalone: true,
  templateUrl: './note-toggle.html',
  styleUrls: ['./note-toggle.css'],
})
export class NoteToggleComponent implements OnChanges {
  // Текущее значение примечания (ввод пользователя или уже добавленная гео-маркер)
  readonly note = input.required<string>();

  // Событие: компонент эмитит обновлённое примечание в родителя
  readonly noteChange = output<string>();

  // Событие: компонент эмитит обновлённую ссылку на Яндекс.Карту в родителя
  readonly geoLinkChange = output<string>();

  // Переключатель «Время и место» (включён по умолчанию)
  isEnabled = signal<boolean>(true);
  isLocating = signal<boolean>(false);
  locationError = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    // Если примечание пустое, а тайм-гео включено — добавляем метку времени и места
    if (changes['note']) {
      this.applyIfEnabled();
    }
  }

  onToggle(): void {
    const next = !this.isEnabled();
    this.isEnabled.set(next);

    if (next) {
      void this.applyCurrentTimeAndPlace();
    } else {
      // Выключаем — убираем гео-маркер из примечания
      this.noteChange.emit(this.stripGeoFragment(this.note()));
      this.geoLinkChange.emit('');
    }
  }

  private applyIfEnabled(): void {
    if (this.isEnabled() && !this.note().trim()) {
      void this.applyCurrentTimeAndPlace();
    }
  }

  private async applyCurrentTimeAndPlace(): Promise<void> {
    if (this.isLocating() || !this.isEnabled()) {
      return;
    }

    this.isLocating.set(true);
    try {
      const { latitude, longitude } = await this.getCurrentPosition();
      const time = this.getCurrentTime();
      const geoNote = `[${time}]-[${latitude}, ${longitude}]`;

      const currentNote = (this.note() ?? '').trim();
      this.noteChange.emit(currentNote ? `${currentNote} ${geoNote}` : geoNote);
      this.geoLinkChange.emit(
        `=HYPERLINK("https://yandex.ru/maps/?pt=${longitude},${latitude}&z=17&l=map"; "🗺️")`,
      );
    } catch {
      this.locationError.set('Не удалось определить текущее место');
      this.geoLinkChange.emit('');
    } finally {
      this.isLocating.set(false);
    }
  }

  private getCurrentPosition(): Promise<GeoPosition> {
    return new Promise<GeoPosition>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: parseFloat(position.coords.latitude.toFixed(6)),
            longitude: parseFloat(position.coords.longitude.toFixed(6)),
          });
        },
        () => reject(new Error('Position unavailable')),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    });
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private stripGeoFragment(note: string): string {
    const cleaned = note.replace(/ ?\[[0-9]{2}:[0-9]{2}\]-\[[\d., ]+\]/, '').trim();
    return cleaned;
  }
}
