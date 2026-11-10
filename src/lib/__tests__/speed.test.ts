import {
  canStepSpeed,
  MAX_SPEED,
  MIN_SPEED,
  SPEED_STEP,
  stepSpeed,
} from '@/lib/speed';

describe('stepSpeed', () => {
  it('adds and removes 0.1', () => {
    expect(stepSpeed(1.3, SPEED_STEP)).toBe(1.4);
    expect(stepSpeed(1.3, -SPEED_STEP)).toBe(1.2);
  });

  it('rounds to one decimal', () => {
    expect(stepSpeed(1.1, SPEED_STEP)).toBe(1.2);
    expect(stepSpeed(0.7, SPEED_STEP)).toBe(0.8);
    // 菜单或其他来源的两位小数也回到一位小数
    expect(stepSpeed(1.25, SPEED_STEP)).toBe(1.4);
  });

  it('stays inside the limits', () => {
    expect(stepSpeed(MAX_SPEED, SPEED_STEP)).toBe(MAX_SPEED);
    expect(stepSpeed(MIN_SPEED, -SPEED_STEP)).toBe(MIN_SPEED);
    expect(stepSpeed(4, -SPEED_STEP)).toBe(MAX_SPEED);
    expect(stepSpeed(0.25, SPEED_STEP)).toBe(MIN_SPEED);
  });
});

describe('canStepSpeed', () => {
  it('allows a step inside the limits', () => {
    expect(canStepSpeed(1.3, SPEED_STEP)).toBe(true);
    expect(canStepSpeed(1.3, -SPEED_STEP)).toBe(true);
  });

  it('blocks a step past a limit', () => {
    expect(canStepSpeed(MAX_SPEED, SPEED_STEP)).toBe(false);
    expect(canStepSpeed(MIN_SPEED, -SPEED_STEP)).toBe(false);
  });

  it('allows the step back from a limit', () => {
    expect(canStepSpeed(MAX_SPEED, -SPEED_STEP)).toBe(true);
    expect(canStepSpeed(MIN_SPEED, SPEED_STEP)).toBe(true);
  });
});
