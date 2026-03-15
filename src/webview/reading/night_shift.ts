export interface NightShiftConfig {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
}

const DEFAULT_CONFIG: NightShiftConfig = {
  enabled: false,
  start_hour: 20,
  end_hour: 7,
};

export class NightShift {
  private on_theme_change: (theme_id: string) => void;
  private config: NightShiftConfig = { ...DEFAULT_CONFIG };
  private day_theme: string = "light";
  private interval_id: ReturnType<typeof setInterval> | null = null;
  private is_night: boolean = false;

  constructor(on_theme_change: (theme_id: string) => void) {
    this.on_theme_change = on_theme_change;
  }

  configure(config: NightShiftConfig, day_theme: string): void {
    this.config = { ...config };
    this.day_theme = day_theme;

    this.clear_interval();

    if (this.config.enabled) {
      this.check();
      this.interval_id = setInterval(() => this.check(), 60_000);
    } else {
      // If disabling night shift while in night mode, restore the day theme
      if (this.is_night) {
        this.is_night = false;
        this.on_theme_change(this.day_theme);
      }
    }
  }

  check(): void {
    const current_hour = new Date().getHours();
    const should_be_night = this.is_night_hour(current_hour);

    if (should_be_night && !this.is_night) {
      this.is_night = true;
      this.on_theme_change("dark");
    } else if (!should_be_night && this.is_night) {
      this.is_night = false;
      this.on_theme_change(this.day_theme);
    }
  }

  destroy(): void {
    this.clear_interval();
  }

  private is_night_hour(hour: number): boolean {
    const { start_hour, end_hour } = this.config;

    if (start_hour > end_hour) {
      // Overnight range (e.g., 20-7): night if hour >= start OR hour < end
      return hour >= start_hour || hour < end_hour;
    } else if (start_hour < end_hour) {
      // Same-day range (e.g., 8-17): night if hour >= start AND hour < end
      return hour >= start_hour && hour < end_hour;
    }

    // start === end means always night when enabled
    return true;
  }

  private clear_interval(): void {
    if (this.interval_id !== null) {
      clearInterval(this.interval_id);
      this.interval_id = null;
    }
  }
}
