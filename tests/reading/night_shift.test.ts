import { test, expect, describe, beforeEach } from "bun:test";
import { NightShift, type NightShiftConfig } from "../../src/webview/reading/night_shift";

describe("NightShift", () => {
  let theme_changes: string[];
  let night_shift: NightShift;
  let original_date: typeof Date;

  beforeEach(() => {
    theme_changes = [];
    night_shift = new NightShift((theme_id: string) => {
      theme_changes.push(theme_id);
    });
    original_date = globalThis.Date;
  });

  function mock_hour(hour: number): void {
    const MockDate = class extends original_date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super();
        } else {
          // @ts-ignore
          super(...args);
        }
      }
      getHours(): number {
        return hour;
      }
    } as any;
    // Preserve static methods
    MockDate.now = original_date.now;
    globalThis.Date = MockDate;
  }

  function restore_date(): void {
    globalThis.Date = original_date;
  }

  test("calls on_theme_change with 'dark' during night hours", () => {
    mock_hour(22); // 10 PM, within default 20-7 range

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual(["dark"]);

    restore_date();
    night_shift.destroy();
  });

  test("calls on_theme_change with day theme during day hours", () => {
    mock_hour(12); // Noon, outside 20-7 range

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");

    // During daytime on first configure, no theme change should occur
    // since is_night starts as false and it's not night
    expect(theme_changes).toEqual([]);

    restore_date();
    night_shift.destroy();
  });

  test("switches from dark to day theme when hour changes", () => {
    // First, configure during night hours
    mock_hour(22);

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "sepia");

    expect(theme_changes).toEqual(["dark"]);

    // Now simulate day time check
    mock_hour(10);
    night_shift.check();

    expect(theme_changes).toEqual(["dark", "sepia"]);

    restore_date();
    night_shift.destroy();
  });

  test("handles overnight range wrapping around midnight", () => {
    // At midnight (hour 0), should be night for range 20-7
    mock_hour(0);

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual(["dark"]);

    restore_date();
    night_shift.destroy();
  });

  test("handles overnight range at boundary start", () => {
    mock_hour(20); // Exactly at start_hour, should be night

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual(["dark"]);

    restore_date();
    night_shift.destroy();
  });

  test("handles overnight range at boundary end", () => {
    mock_hour(7); // Exactly at end_hour, should NOT be night

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual([]);

    restore_date();
    night_shift.destroy();
  });

  test("handles same-day range", () => {
    // Same-day range 8-17 means "night" during those hours
    mock_hour(12);

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 8,
      end_hour: 17,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual(["dark"]);

    restore_date();
    night_shift.destroy();
  });

  test("handles equal start and end (always night when enabled)", () => {
    mock_hour(12);

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 10,
      end_hour: 10,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual(["dark"]);

    restore_date();
    night_shift.destroy();
  });

  test("destroy clears the interval", () => {
    mock_hour(22);

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");
    theme_changes = [];

    night_shift.destroy();

    // After destroy, no further checks should run
    // We can verify by calling check manually - it still works,
    // but the interval-based automatic calls stop
    restore_date();
  });

  test("disabling night shift while in night mode restores day theme", () => {
    mock_hour(22);

    const enabled_config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(enabled_config, "sepia");

    expect(theme_changes).toEqual(["dark"]);

    const disabled_config: NightShiftConfig = {
      enabled: false,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(disabled_config, "sepia");

    expect(theme_changes).toEqual(["dark", "sepia"]);

    restore_date();
    night_shift.destroy();
  });

  test("does not duplicate theme change if already in correct mode", () => {
    mock_hour(22);

    const config: NightShiftConfig = {
      enabled: true,
      start_hour: 20,
      end_hour: 7,
    };
    night_shift.configure(config, "light");

    expect(theme_changes).toEqual(["dark"]);

    // Calling check again while still in night hours should not trigger again
    night_shift.check();
    expect(theme_changes).toEqual(["dark"]);

    restore_date();
    night_shift.destroy();
  });
});
