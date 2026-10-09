/**
 * Roll Number Utilities for Exam Hall Seating Allocator
 * Supports custom section prefix parsing and sequential generation with detained student tracking.
 */

/**
 * Helper to parse a full roll number into prefix and numeric suffix.
 * Example: '24EG107A01' -> { prefix: '24EG107A', number: 1, padLength: 2 }
 */
export const parseRollNumberClient = (roll) => {
  if (!roll || typeof roll !== 'string' || !roll.trim()) return null;
  const match = roll.trim().match(/^(.*?)([0-9]+)$/);
  if (!match) return null;
  return {
    prefix: match[1].toUpperCase(),
    number: parseInt(match[2], 10),
    padLength: match[2].length,
  };
};

/**
 * Conceptually generate the sequence of roll numbers from start to end.
 * Detained students are flagged without renumbering.
 */
export const generateRollSequence = (startRoll, endRoll, detainedList = []) => {
  if (!startRoll || !endRoll) return [];
  const startInfo = parseRollNumberClient(startRoll);
  const endInfo = parseRollNumberClient(endRoll);
  if (!startInfo || !endInfo) return [];
  if (startInfo.prefix !== endInfo.prefix) return [];
  if (startInfo.number > endInfo.number) return [];

  const detainedSet = new Set((detainedList || []).map((r) => r.trim().toUpperCase()));
  const sequence = [];

  for (let num = startInfo.number; num <= endInfo.number; num++) {
    const roll = startInfo.prefix + String(num).padStart(startInfo.padLength, '0');
    sequence.push({
      rollNumber: roll,
      isDetained: detainedSet.has(roll),
    });
  }
  return sequence;
};

/**
 * Filter out invalid, legacy, or test detained roll numbers (such as DET...).
 * A valid detained roll number must:
 * 1. Be a non-empty string not starting with "DET"
 * 2. Parse successfully as a roll number ending with digits
 * 3. Match startRoll and endRoll prefix and numeric range if provided
 */
export const filterValidDetainedRolls = (detainedList = [], startRoll = null, endRoll = null) => {
  if (!Array.isArray(detainedList)) return [];

  const startInfo = startRoll ? parseRollNumberClient(startRoll) : null;
  const endInfo = endRoll ? parseRollNumberClient(endRoll) : null;
  const validRange = Boolean(
    startInfo && endInfo && startInfo.prefix === endInfo.prefix && startInfo.number <= endInfo.number
  );

  const valid = [];
  for (const raw of detainedList) {
    if (!raw || typeof raw !== 'string') continue;
    const roll = raw.trim().toUpperCase();
    if (!roll) continue;

    // Reject fake test identifiers like DET...
    if (roll.startsWith('DET')) continue;

    const info = parseRollNumberClient(roll);
    if (!info) continue;

    if (validRange) {
      if (info.prefix !== startInfo.prefix) continue;
      if (info.number < startInfo.number || info.number > endInfo.number) continue;
    }

    if (!valid.includes(roll)) {
      valid.push(roll);
    }
  }
  return valid;
};
